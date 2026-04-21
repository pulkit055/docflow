import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function htmlToTiptapContent(html: string) {
  const paragraphs = html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '###H1###$1###END###')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '###H2###$1###END###')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '###H3###$1###END###')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '###LI###$1###END###')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '###P###$1###END###')
    .replace(/<[^>]+>/g, '')
    .split('###END###')
    .map(s => s.trim())
    .filter(s => s.length > 0)

  const content = paragraphs.map(p => {
    if (p.startsWith('###H1###')) {
      return { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: p.replace('###H1###', '').trim() }] }
    }
    if (p.startsWith('###H2###')) {
      return { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: p.replace('###H2###', '').trim() }] }
    }
    if (p.startsWith('###H3###')) {
      return { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: p.replace('###H3###', '').trim() }] }
    }
    if (p.startsWith('###LI###')) {
      return { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: p.replace('###LI###', '').trim() }] }] }
    }
    const text = p.replace('###P###', '').trim()
    if (!text) return null
    return { type: 'paragraph', content: [{ type: 'text', text }] }
  }).filter(Boolean)

  return { type: 'doc', content: content.length > 0 ? content : [{ type: 'paragraph', content: [] }] }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string

    if (!file || !userId) {
      return NextResponse.json({ error: 'Missing file or user' }, { status: 400 })
    }

const fileName = file.name.toLowerCase()
    const isTxt = fileName.endsWith('.txt') || file.type === 'text/plain'
    const isDocx = fileName.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

    if (!isTxt && !isDocx) {
      return NextResponse.json({ error: 'Unsupported file type. Use .txt or .docx' }, { status: 400 })
    }

    let tiptapContent

if (isTxt) {
          const text = await file.text()
      const lines = text.split('\n').filter(l => l.trim().length > 0)
      tiptapContent = {
        type: 'doc',
        content: lines.map(line => ({
          type: 'paragraph',
          content: [{ type: 'text', text: line }]
        }))
      }
    } else {
      const mammoth = await import('mammoth')
      const buffer = await file.arrayBuffer()
      const result = await mammoth.convertToHtml({ buffer: Buffer.from(buffer) })
      tiptapContent = htmlToTiptapContent(result.value)
    }

    const title = file.name.replace(/\.(txt|docx)$/i, '') || 'Uploaded Document'

    const { data: existing } = await supabase
      .from('documents')
      .select('id')
      .eq('owner_id', userId)
      .eq('title', title)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: `A document named "${title}" already exists` }, { status: 409 })
    }

    const { data, error } = await supabase
      .from('documents')
      .insert({
        title,
        content: tiptapContent,
        owner_id: userId
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ id: data.id })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

type ShareRecord = {
  shared_with_email: string
}

export default function EditorPage() {
  const [title, setTitle] = useState('Untitled Document')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [shareEmail, setShareEmail] = useState('')
  const [showShareModal, setShowShareModal] = useState(false)
  const [shares, setShares] = useState<ShareRecord[]>([])
  const [shareError, setShareError] = useState('')
  const [shareSuccess, setShareSuccess] = useState('')
  const [editorState, setEditorState] = useState(0)
  const [active, setActive] = useState({
    bold: false,
    italic: false,
    strike: false,
    h1: false,
    h2: false,
    h3: false,
    bulletList: false,
    orderedList: false
  })
  const router = useRouter()
  const params = useParams()
  const docId = params.id as string

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        bold: {},
        italic: {},
        strike: {},
        bulletList: {},
        orderedList: {},
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder: 'Start writing...' }),
    ],
    content: '',
    onTransaction: ({ editor: e }) => {
      setActive({
        bold: e.isActive('bold'),
        italic: e.isActive('italic'),
        strike: e.isActive('strike'),
        h1: e.isActive('heading', { level: 1 }),
        h2: e.isActive('heading', { level: 2 }),
        h3: e.isActive('heading', { level: 3 }),
        bulletList: e.isActive('bulletList'),
        orderedList: e.isActive('orderedList'),
      })
      setEditorState(n => n + 1)
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[500px] px-8 py-6',
      },
    },
  })

  useEffect(() => {
    loadDocument()
  }, [docId])

  const loadDocument = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', docId)
      .single()

    if (error || !data) { router.push('/documents'); return }

    setTitle(data.title)
    setIsOwner(data.owner_id === user.id)

    if (data.content && Object.keys(data.content).length > 0) {
      editor?.commands.setContent(data.content)
    }

    if (data.owner_id === user.id) {
      const { data: shareData } = await supabase
        .from('document_shares')
        .select('shared_with_email')
        .eq('document_id', docId)
      setShares(shareData || [])
    }
  }

  const saveDocument = useCallback(async () => {
    if (!editor) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase
      .from('documents')
      .update({
        title,
        content: editor.getJSON(),
        updated_at: new Date().toISOString(),
        last_edited_by: user?.email || 'Unknown'
      })
      .eq('id', docId)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [editor, title, docId])

  const handleShare = async () => {
    setShareError('')
    setShareSuccess('')
    if (!shareEmail) return

    // Look up user by email
    const { data: userData, error: userError } = await supabase
      .from('document_shares')
      .select('id')
      .eq('document_id', docId)
      .eq('shared_with_email', shareEmail)

    if (userData && userData.length > 0) {
      setShareError('Already shared with this user')
      return
    }

    // Find user id from auth - we store email and resolve id on login
    const { error } = await supabase
      .from('document_shares')
      .insert({
        document_id: docId,
        shared_with_email: shareEmail,
        shared_with_id: null
      })

    if (error) {
      setShareError('Failed to share. Please try again.')
    } else {
      setShareSuccess(`Shared with ${shareEmail}`)
      setShares(prev => [...prev, { shared_with_email: shareEmail }])
      setShareEmail('')
    }
  }

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(saveDocument, 30000)
    return () => clearInterval(interval)
  }, [saveDocument])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        saveDocument()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [saveDocument])

if (!editor) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-gray-400 text-sm">Loading editor...</p>
    </div>
  )
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 bg-white z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/documents')}
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            ← Back
          </button>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="text-sm font-medium text-gray-900 border-none outline-none bg-transparent w-64 focus:bg-gray-50 focus:px-2 rounded"
            placeholder="Document title"
          />
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-xs text-green-500">Saved</span>}
          {saving && <span className="text-xs text-gray-400">Saving...</span>}
          {isOwner && (
            <button
              onClick={() => setShowShareModal(true)}
              className="text-sm text-gray-600 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50"
            >
              Share
            </button>
          )}
         <button
            onClick={() => {
              const text = editor.state.doc.textContent
              const blob = new Blob([text], { type: 'text/plain' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `${title}.txt`
              a.click()
              URL.revokeObjectURL(url)
            }}
            className="text-sm text-gray-600 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50"
          >
            Export
          </button>
          <button
            onClick={saveDocument}
            className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="border-b border-gray-100 px-6 py-2 flex items-center gap-1 bg-gray-50">

        {[
          { label: 'B', action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold'), title: 'Bold' },
          { label: 'I', action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic'), title: 'Italic' },
{ label: 'U', action: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive('strike'), title: 'Strikethrough' },        ].map(btn => (
          <button
            key={btn.label}
            onClick={btn.action}
                title={btn.title}
            className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
              btn.active ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            {btn.label}
          </button>
        ))}

        <div className="w-px h-5 bg-gray-300 mx-1" />

        {[1, 2, 3].map(level => (
          <button
            key={level}
            onClick={() => editor.chain().focus().toggleHeading({ level: level as 1|2|3 }).run()}
            className={`px-2 h-8 rounded text-xs font-medium transition-colors ${
              editor.isActive('heading', { level }) ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            H{level}
          </button>
        ))}

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-2 h-8 rounded text-xs font-medium transition-colors ${
            editor.isActive('bulletList') ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'
          }`}
        >
          • List
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-2 h-8 rounded text-xs font-medium transition-colors ${
            editor.isActive('orderedList') ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'
          }`}
        >
          1. List
        </button>
      </div>

      {/* Editor */}
     <div
        className="max-w-4xl mx-auto mt-8 cursor-text"
        onClick={() => editor.commands.focus()}
      >
        <EditorContent editor={editor} />
      </div>

<div className="max-w-4xl mx-auto px-8 py-3 border-t border-gray-100" data-state={editorState}>
        <p className="text-xs text-gray-400">
          {(() => {
            const text = editor.state.doc.textContent.trim()
            if (!text) return '0 words'
            const count = text.split(/\s+/).filter(w => w.length > 0).length
const chars = text.length
            return `${count} ${count === 1 ? 'word' : 'words'} · ${chars} characters`          })()}
        </p>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Share Document</h2>

            <div className="flex gap-2 mb-4">
              <input
                type="email"
                value={shareEmail}
                onChange={e => setShareEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleShare()}
                placeholder="Enter email address"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleShare}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Share
              </button>
            </div>

            {shareError && <p className="text-red-500 text-xs mb-3">{shareError}</p>}
            {shareSuccess && <p className="text-green-500 text-xs mb-3">{shareSuccess}</p>}

            {shares.length > 0 && (
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-400 mb-2">Shared with</p>
                {shares.map(s => (
                  <p key={s.shared_with_email} className="text-sm text-gray-700 py-1">
                    {s.shared_with_email}
                  </p>
                ))}
              </div>
            )}

            <button
              onClick={() => { setShowShareModal(false); setShareError(''); setShareSuccess('') }}
              className="mt-4 text-sm text-gray-400 hover:text-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
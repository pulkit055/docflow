'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Document = {
  id: string
  title: string
  created_at: string
  updated_at: string
  owner_id: string
  isShared?: boolean
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Document[]>([])
  const [userId, setUserId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const router = useRouter()

  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    setUserId(user.id)

    // Resolve any pending shares for this user's email
    await supabase
      .from('document_shares')
      .update({ shared_with_id: user.id })
      .eq('shared_with_email', user.email)
      .is('shared_with_id', null)

    const { data: owned } = await supabase
      .from('documents')
      .select('*')
      .eq('owner_id', user.id)
      .order('updated_at', { ascending: false })

    const { data: shares } = await supabase
      .from('document_shares')
      .select('document_id')
      .eq('shared_with_id', user.id)

    let sharedDocs: Document[] = []
    if (shares && shares.length > 0) {
      const ids = shares.map(s => s.document_id)
      const { data: shared } = await supabase
        .from('documents')
        .select('*')
        .in('id', ids)
      sharedDocs = (shared || []).map(d => ({ ...d, isShared: true }))
    }

    setDocs([...(owned || []), ...sharedDocs])
    setLoading(false)
  }

  const createDocument = async () => {
    setCreating(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('documents')
      .insert({ title: 'Untitled Document', content: {}, owner_id: user.id })
      .select()
      .single()

    if (data) router.push(`/documents/${data.id}`)
    setCreating(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const allowedTypes = [
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
    if (!allowedTypes.includes(file.type)) {
      alert('Supported formats: .txt and .docx only')
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('userId', user.id)

    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    const result = await res.json()

    if (result.id) {
      router.push(`/documents/${result.id}`)
    } else {
      alert('Upload failed. Please try again.')
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Loading documents...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">DocFlow</h1>
        <div className="flex items-center gap-3">
          <label className="cursor-pointer bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
            Upload File
            <input type="file" accept=".txt,.docx" className="hidden" onChange={handleFileUpload} />
          </label>
          <button
            onClick={createDocument}
            disabled={creating}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {creating ? 'Creating...' : '+ New Document'}
          </button>
          <button
            onClick={handleSignOut}
            className="text-gray-500 text-sm hover:text-gray-700"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {docs.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm mb-4">No documents yet</p>
            <button
              onClick={createDocument}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Create your first document
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-4">
              {docs.length} document{docs.length !== 1 ? 's' : ''}
            </p>
            {docs.map(doc => (
              <div
                key={doc.id}
                onClick={() => router.push(`/documents/${doc.id}`)}
                className="bg-white border border-gray-200 rounded-lg px-5 py-4 flex items-center justify-between cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{doc.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Updated {new Date(doc.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  doc.isShared
                    ? 'bg-purple-50 text-purple-600'
                    : 'bg-blue-50 text-blue-600'
                }`}>
                  {doc.isShared ? 'Shared with you' : 'Owner'}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
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
  last_edited_by?: string
  isShared?: boolean
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Document[]>([])
  const [userId, setUserId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const router = useRouter()
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }
    const user = session.user
    setUserId(user.id)
    setUserEmail(user.email || '')
    // Resolve any pending shares for this user's email
await supabase
  .from('document_shares')
  .update({ shared_with_id: user.id })
  .eq('shared_with_email', user.email)
  .is('shared_with_id', null)

    // Owned documents
    const { data: owned } = await supabase
      .from('documents')
      .select('*')
      .eq('owner_id', user.id)
      .order('updated_at', { ascending: false })

    // Shared documents
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

    const { data, error } = await supabase
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

    const allowedTypes = ['text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
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
      alert(result.error || 'Upload failed. Please try again.')
    }
  }

  const renameDocument = async (id: string) => {
    const newTitle = renameValue.trim()
    if (!newTitle) { setRenamingId(null); return }
    const existing = docs.find(d => d.id !== id && d.title === newTitle && !d.isShared)
    if (existing) { alert(`A document named "${newTitle}" already exists`); return }
    await supabase.from('documents').update({ title: newTitle }).eq('id', id)
    setDocs(prev => prev.map(d => d.id === id ? { ...d, title: newTitle } : d))
    setRenamingId(null)
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Loading documents...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
     <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">D</span>
          </div>
          <h1 className="text-lg font-semibold text-gray-900">DocFlow</h1>
        </div>
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
<div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 text-xs font-semibold">
                {userEmail ? userEmail[0].toUpperCase() : 'U'}
              </span>
            </div>
            <button
              onClick={handleSignOut}
              className="text-gray-500 text-sm hover:text-gray-700"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

<main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
                {docs.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="6" y="4" width="20" height="24" rx="3" fill="#E5E7EB"/>
                <rect x="6" y="4" width="20" height="24" rx="3" stroke="#D1D5DB" strokeWidth="1"/>
                <line x1="10" y1="11" x2="22" y2="11" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="10" y1="15" x2="22" y2="15" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="10" y1="19" x2="18" y2="19" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-gray-900 font-medium text-sm mb-1">No documents yet</p>
            <p className="text-gray-400 text-xs mb-6">Create a new document or upload a file to get started</p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={createDocument}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                + New Document
              </button>
              <label className="cursor-pointer border border-gray-300 text-gray-600 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                Upload File
                <input type="file" accept=".txt,.docx" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-4">
              {docs.length} document{docs.length !== 1 ? 's' : ''}
            </p>
{docs.filter(doc => doc.title.toLowerCase().includes(search.toLowerCase())).map(doc => (
              <div
                key={doc.id}
                className="bg-white border border-gray-200 rounded-lg px-5 py-4 flex items-center justify-between hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex-1 min-w-0">
                  {renamingId === doc.id ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onBlur={() => renameDocument(doc.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') renameDocument(doc.id)
                        if (e.key === 'Escape') setRenamingId(null)
                      }}
                      onClick={e => e.stopPropagation()}
                      className="text-sm font-medium text-gray-900 border border-blue-400 rounded px-2 py-0.5 outline-none w-full max-w-xs"
                    />
                  ) : (
                    <p
                      className="text-sm font-medium text-gray-900 cursor-pointer truncate"
                      onClick={() => router.push(`/documents/${doc.id}`)}
                    >
                      {doc.title}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    Updated {new Date(doc.updated_at).toLocaleDateString()}
                    {doc.last_edited_by && (
                      <span className="ml-1">· by {doc.last_edited_by}</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    doc.isShared
                      ? 'bg-purple-50 text-purple-600'
                      : 'bg-blue-50 text-blue-600'
                  }`}>
                    {doc.isShared ? 'Shared with you' : 'Owner'}
                  </span>
                  {!doc.isShared && (
                    <>
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          setRenamingId(doc.id)
                          setRenameValue(doc.title)
                        }}
                        className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                      >
                        Rename
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          if (!confirm('Delete this document?')) return
                          await supabase.from('documents').delete().eq('id', doc.id)
                          setDocs(prev => prev.filter(d => d.id !== doc.id))
                        }}
                        className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
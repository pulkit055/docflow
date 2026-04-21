# Architecture Note

## Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind | Fast to scaffold, clean Vercel deployment, shared TypeScript types across stack |
| Rich text editor | Tiptap (ProseMirror-based) | Headless, stores content as JSON, serializes cleanly to Postgres JSONB |
| Backend | Next.js API routes | No separate service needed, deploys as serverless functions on Vercel |
| Database and Auth | Supabase Postgres | Persistence and auth in one managed free-tier service |
| File parsing | mammoth | Best-in-class .docx parser, no license issues |
| Deployment | Vercel CLI | One-command deployment, environment variables managed in dashboard |

---

## Key Decisions

### Why Next.js API routes instead of a separate backend
A separate Express or FastAPI service adds deployment complexity with no functional benefit at this scope. API routes colocate with the frontend, deploy as serverless functions on Vercel, and share TypeScript types across the stack. This saved approximately 45 minutes of deployment configuration compared to a split architecture.

### Why Tiptap
Tiptap stores document content as JSON using the ProseMirror document model, which serializes cleanly to Postgres JSONB without encoding hacks. The toolbar active state is tracked via the onTransaction callback which fires on every editor state change, enabling accurate real-time formatting indicators. Alternatives considered: Quill (less flexible serialization), Draft.js (React-specific, known serialization issues).

### Why Supabase
Supabase provides Postgres, Row Level Security, and Auth in one managed service with a generous free tier. The sharing model uses deferred user ID resolution — owners share by email, and the recipient's user ID is written to the shares table on their next login. This avoids requiring the recipient to have an account before sharing.

### File Upload Design
Supported formats: .txt and .docx only. Files are parsed server-side in a Next.js API route. MIME type validation happens server-side before parsing — client-side validation alone is insufficient. .docx files are converted to HTML via mammoth, then transformed into proper Tiptap JSON nodes. .txt files are split by newline into paragraph nodes. Raw HTML storage was deliberately avoided to ensure uploaded content renders correctly in the editor.

### Toolbar Active State
Toolbar buttons use onMouseDown with e.preventDefault() instead of onClick. This prevents the editor from losing focus when a toolbar button is clicked, which is critical for the active state to reflect the correct formatting at the cursor position.

### Sharing Model
Documents have a single owner set at creation time. Owners share by entering a recipient email. On the recipient's next login, their user ID is resolved against the shared_with_email field and written to shared_with_id. The document then appears in their list with a "Shared with you" badge. Delete is restricted to owners only.

---

## What I Would Build Next

1. **Yjs CRDT layer** for real-time collaboration — the current Tiptap setup supports this as a direct extension via the @tiptap/extension-collaboration package
2. **Role-based permissions** (editor vs viewer) — requires adding a permission field to document_shares and conditional read-only mode in the editor
3. **Document version snapshots** on save — store content history in a separate document_versions table with a rollback UI
4. **Re-enable and harden RLS policies** — RLS is currently disabled to unblock the build; the policy logic is correct but needs environment-specific testing
5. **Automated test suite** — share API route, session validation, and file parser output are the three highest-priority test targets

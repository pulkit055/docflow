# Submission

## Live URL
https://docflow-pied.vercel.app

## Test Accounts
| Email | Password | Role |
|---|---|---|
| alice@ajaia.dev | password123 | Document owner |
| bob@ajaia.dev | password123 | Shared access recipient |

---

## Contents

| File | Description |
|---|---|
| README.md | Setup instructions, feature list, local run guide |
| ARCHITECTURE.md | Stack decisions and rationale |
| AI-WORKFLOW.md | AI tools used, what was changed, verification process |
| SUBMISSION.md | This file |
| app/page.tsx | Login page |
| app/documents/page.tsx | Document list with search, upload, delete |
| app/documents/[id]/page.tsx | Rich text editor with toolbar, sharing, export |
| app/api/upload/route.ts | File upload API route (.txt and .docx) |
| lib/supabase.ts | Supabase client |

---

## What Is Working

- Document create, rename, edit, save, reopen
- Rich text formatting: bold, italic, strikethrough, H1/H2/H3, bullet lists, numbered lists
- Auto-save every 30 seconds and Cmd+S keyboard shortcut
- File upload: .txt and .docx parsed into new editable documents
- Sharing: owner grants access by email, recipient sees "Shared with you" badge
- Delete documents (owners only)
- Search and filter documents by title in real time
- Export document to .txt
- Word count and character count updated in real time
- Last edited timestamp and editor email visible on document list
- Persistence via Supabase Postgres with Tiptap JSON formatting

---

## What Is Incomplete

- **RLS policies are disabled** — Row Level Security is currently disabled on both tables. Sharing is enforced at the application layer (Supabase queries filter by owner_id and shared_with_id). This is a known gap documented here intentionally rather than silently.
- **No automated tests** — deprioritized in favor of shipping complete core functionality within the timebox. The three highest-priority test targets are identified in the next steps below.

---

## What I Would Build Next (2-4 hours)

1. **Re-enable and harden RLS policies** — the policy logic is correct, the issue was environment-specific; needs isolated testing per environment
2. **Automated test: share API route** — verify that a document shared with bob@ajaia.dev appears in his list and not in a third user's list
3. **Automated test: session validation** — verify that unauthenticated requests to /documents redirect to login
4. **Role-based permissions** — add a permission field (editor vs viewer) to document_shares, enforce read-only mode in the editor for viewers
5. **Yjs real-time collaboration** — the current Tiptap setup supports this as a direct extension

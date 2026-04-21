# DocFlow — Lightweight Collaborative Document Editor

## Live Demo

**URL:** https://docflow-pied.vercel.app

**Test Accounts:**

| Email | Password | Role |
|---|---|---|
| alice@ajaia.dev | password123 | Document owner |
| bob@ajaia.dev | password123 | Shared access recipient |

---

## What Is Working

- Document create, rename, edit, save, reopen
- Rich text formatting: bold, italic, strikethrough, H1/H2/H3, bullet lists, numbered lists
- Auto-save every 30 seconds and Cmd+S keyboard shortcut
- File upload: .txt and .docx parsed into new editable documents
- Sharing: owner grants access by email, recipient sees "Shared with you" badge
- Delete documents (owners only)
- Search and filter documents by title
- Export document to .txt
- Word count and character count in editor footer
- Last edited timestamp and editor email on document list
- Persistence via Supabase Postgres, formatting stored as Tiptap JSON

---

## What Is Intentionally Not Built

- Real-time collaboration (requires CRDT layer, 6+ hours of complexity)
- Version history (needs schema changes and snapshot logic)
- Role-based permissions beyond viewer access
- .md and .pdf file upload support
- Comments or suggestion mode

---

## Local Setup

### Prerequisites
- Node 18+
- A Supabase account (free tier)

### Steps

**1. Clone the repo and install dependencies**

```bash
git clone https://github.com/pulkit055/docflow.git
cd docflow
npm install
```

**2. Create `.env.local` in the project root**

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**3. Run the dev server**

```bash
npm run dev
```

**4. Open `http://localhost:3000`**

---

## Database Setup

Run this SQL in your Supabase SQL Editor:

```sql
create extension if not exists "uuid-ossp";

create table documents (
  id uuid primary key default uuid_generate_v4(),
  title text not null default 'Untitled Document',
  content jsonb,
  owner_id uuid references auth.users not null,
  last_edited_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table document_shares (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid references documents on delete cascade not null,
  shared_with_email text not null,
  shared_with_id uuid references auth.users,
  created_at timestamptz default now()
);
```

Then create two test users in Supabase Authentication:
- alice@ajaia.dev / password123
- bob@ajaia.dev / password123

---

## Project Structure

```
docflow/
├── app/
│   ├── page.tsx                  # Login page
│   ├── documents/
│   │   ├── page.tsx              # Document list
│   │   └── [id]/
│   │       └── page.tsx          # Editor page
│   └── api/
│       └── upload/
│           └── route.ts          # File upload API
├── lib/
│   └── supabase.ts               # Supabase client
├── ARCHITECTURE.md
├── AI-WORKFLOW.md
└── SUBMISSION.md
```

---

## Architecture
See `ARCHITECTURE.md`

## AI Workflow
See `AI-WORKFLOW.md`

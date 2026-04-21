# AI Workflow Note

## Tools Used

- Claude (claude.ai), Gemini — architecture planning, execution sequencing, code generation, debugging, and written deliverables

---

## Where AI Materially Accelerated Work

### Architecture decisions (saved approximately 45 minutes)
Claude compressed the planning phase from an open-ended brief to a prioritized execution order with a concrete schema and stack recommendation in one pass. The key decision — using Next.js API routes over a separate Express backend — was Claude's suggestion. I accepted it after understanding the rationale: fewer deployment surfaces, shared TypeScript types, same functional outcome at this scope.

### Boilerplate and component scaffolding (saved approximately 90 minutes)
Claude generated the initial Tiptap editor setup, Supabase client configuration, toolbar component, share modal, and API route structure. This eliminated documentation-reading time for libraries I was configuring for the first time in this environment.

### Debugging (saved approximately 60 minutes)
Multiple errors were diagnosed and resolved through Claude:
- Tiptap SSR hydration error (fixed with immediatelyRender: false)
- Supabase RLS policies blocking all requests (diagnosed via browser console and network tab)
- Login page overwrite — app/page.tsx was accidentally replaced with documents page code
- Session persistence bug on the live Vercel URL
- Toolbar active state showing all buttons highlighted simultaneously (fixed by tracking state via onTransaction callback with explicit ActiveFormats type)

### Written deliverables (saved approximately 30 minutes)
Claude drafted the initial README, architecture note, and this document as structured starting points. I rewrote sections where the rationale needed to reflect actual decisions made during the build rather than generic best practices.

---

## What I Rejected or Changed

- **Raw HTML file upload storage** — Claude initially suggested storing uploaded file content as raw HTML strings. I changed this to proper Tiptap JSON nodes so uploaded content renders with correct formatting in the editor rather than as escaped HTML.

- **onClick for toolbar buttons** — Claude's first toolbar implementation used onClick. I changed this to onMouseDown with e.preventDefault() after diagnosing that onClick caused the editor to lose focus before the active state could be read, which broke the formatting indicators.

- **Separate Express backend** — Claude's first architecture draft included a standalone API server. I overrode this because it adds a second deployment surface, a second set of environment variables, and a second failure point for reviewers — with no functional benefit at this scope.

- **RLS policy approach** — Claude's initial RLS policies caused 500 errors in production. Rather than continuing to iterate on policy syntax under time pressure, I made a deliberate scope decision to disable RLS and enforce sharing logic at the application layer, which is documented clearly in SUBMISSION.md as a known gap.

---

## How I Verified Correctness

- Every feature was tested manually on localhost before deployment
- Sharing flow was verified end-to-end by logging in as both alice and bob and confirming document visibility and badge distinction
- Live URL was tested in an incognito window to confirm session handling without cached state
- File upload was tested with both .txt and .docx files, including a multi-section document with headings and lists
- Export was verified by downloading the .txt output and confirming content integrity
- Each bug fix was verified by reproducing the original error, applying the fix, and confirming resolution before moving on

---

## Reflection

AI was most valuable as a thinking partner and boilerplate accelerator — not as a replacement for judgment. Every architectural decision, scope cut, and bug fix required me to understand what was happening and why before accepting or overriding Claude's output.

The pattern I used throughout: Claude generates a structured first draft, I evaluate it against the actual constraints of the build, I accept what's sound and change what isn't. This is exactly how I would use AI on a client engagement at Ajaia — compress planning, accelerate execution, verify everything, own every decision.

# Clarity

Voice-first SOP capture. Walk through a process talking and snapping photos —
get back a clean, structured SOP you can use, share, or run from.

This repo is the **Phase 1 MVP** and the anchor product of The Clarity Hub
portfolio. Tech: Next.js 15 (App Router), TypeScript strict, Tailwind +
shadcn-style primitives, Supabase (Auth + Postgres + Storage), OpenAI Whisper,
Anthropic Claude (`claude-sonnet-4-6`), Stripe (Week 2+).

## Status

| Layer | State |
|---|---|
| Repo scaffold | ✅ |
| Test harness (Whisper → Claude) | ✅ — run before building capture UI |
| Supabase schema + RLS + signup trigger | ✅ (SQL ready, run via `db/migrations/`) |
| Auth (magic link) | ✅ |
| Design system primitives | ✅ |
| Mobile recording UI | Week 3 |
| Pipeline route + photo matching | Week 4 |
| Editor + share + PDF | Weeks 6–7 |
| Stripe + paywall | Weeks 2 / 8 |

## Quickstart

```bash
pnpm install
cp .env.example .env             # fill in Supabase + OpenAI + Anthropic keys
# Apply DB migrations in order via Supabase CLI or the SQL editor:
#   db/migrations/0001_init.sql
#   db/migrations/0002_storage_policies.sql
# Then in the Supabase dashboard create two private buckets:
#   sop-audio, sop-photos
pnpm dev
```

## Validate the AI pipeline first

Before any capture UI exists, validate the Whisper → Claude pipeline against
real recordings. Drop an audio file in `test-audio/` and run:

```bash
pnpm harness test-audio/your-recording.m4a
```

Outputs land in `test-output/`. See `scripts/README.md` for the 10 recommended
test cases.

## Repo layout

```
app/                      Next.js App Router
  (app)/                  authed route group (dashboard, sops/*, settings/*)
  auth/                   magic-link callback, signout
  signin/                 signin page
  page.tsx                marketing landing
  layout.tsx              root layout + fonts
components/
  ui/                     primitives (Button, Input, Card, Modal, Toast, Label)
  shared/                 cross-Hub chrome (AppShell, BrandMark, decoration)
db/
  migrations/             plain SQL, applied in order
lib/
  ai/                     prompt SSOT (.mjs) + zod schema for structured output
  supabase/               browser / server / service-role / middleware clients
  env.ts                  runtime-checked env vars
  utils.ts                cn() helper
scripts/
  test-harness.mjs        standalone Whisper → Claude validator
legacy/etsy-pipeline/     previous repo occupant; unrelated, kept for reference
```

## Design decisions worth knowing

- **Public share access** goes through `get_shared_sop(token)`, a SECURITY
  DEFINER SQL function — not a permissive public SELECT RLS policy. The anon
  role only has one entry point to shared content, and it requires a valid
  token. See `db/migrations/0001_init.sql`.
- **Organisations from day one.** Multi-tenancy is painful to retrofit. Phase 1
  auto-creates a personal org per user via the `handle_new_user()` trigger.
- **Steps as rows, not JSON.** Lets us reorder, link photos, and spawn tasks
  (Phase 2) without rewriting.
- **Prompt single source of truth.** `lib/ai/prompt-sop-structuring.mjs` is the
  only copy of the SOP structuring prompt. Both the harness and the production
  pipeline import it.
- **Segment-level Whisper timestamps**, not word-level — cheaper, smaller, plenty
  granular for photo-to-step matching.

## Out of scope for Phase 1

Tasks layer, recurring SOPs, team accounts, screen recording, Notion/Slack/Drive
integrations, white-label branding, AI "improve this" features, templates,
native apps, multi-language. **Push back on scope creep.**

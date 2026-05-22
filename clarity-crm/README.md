# Clarity CRM

Personal social-content workflow tool for The Clarity Hub. Takes a seed idea
and shepherds it through AI interview → draft → variants → graphic briefs →
status tracking, across two independent tracks:

- **Track A — LinkedIn-led:** LinkedIn long-form + 3 hooks → Substack Note + Instagram variants → graphic briefs.
- **Track B — Substack article:** standalone AI how-to, signed "Heather".

## Stack

Next.js 15 (App Router, TS strict) · Tailwind + shadcn/ui · Supabase
(Postgres, Auth, RLS) · Anthropic API (Claude Sonnet 4) · Vercel.

## Setup

1. `cp .env.example .env.local` and fill in:
   - Supabase URL + anon key (new `clarity-crm` project)
   - `ANTHROPIC_API_KEY` (server-only)
2. Apply the schema: run `supabase/migrations/0001_init.sql` against the new
   Supabase project (SQL editor or `supabase db push`). This creates the tables,
   RLS policies, and a trigger that seeds Heather's cadence slots on signup.
3. `npm install`
4. `npm run dev` → http://localhost:3000

## Conventions

- Server Components first; Client Components only for interactivity.
- All AI calls are server-side (`src/lib/anthropic.ts`); the key never reaches the browser.
- Prompts live in `/prompts/*.md`, loaded as raw strings via `src/lib/prompts.ts` — never hardcoded in handlers.
- Every table is RLS-protected (owner-only) from day one.
- The interview uses streaming (`/api/interview`).

## Cadence (Brisbane time)

LinkedIn / Instagram / Substack note — Sun & Wed 17:00 · Substack article — Fri 09:30.

## Routes

`/dashboard` · `/ideas` · `/new` · `/unit/[id]` · `/settings`

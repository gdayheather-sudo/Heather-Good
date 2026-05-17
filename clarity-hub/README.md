# Clarity Hub

Shared Next.js shell for The Clarity Hub. The **Client Onboarding Builder** is the first module — a paid tool that generates a 4-email welcome sequence, intake form, kickoff checklist, and onboarding timeline from one short brief.

This README covers running the scaffold locally. The full product brief lives at the repo root in `CLARITY_ONBOARDING_BRIEF.md` (or wherever it ends up); refer to it for strategic decisions and the phased roadmap.

## Stack

- **Next.js 14** (App Router) + Tailwind, deployed on Vercel
- **Supabase** (Postgres, Auth, RLS) — one shared project across all Hub tools
- **Anthropic** `claude-sonnet-4-6` via the server-only API route
- **Stripe** Checkout + webhook (`$27` one-time → 3 unlock credits)
- **Exports:** `.docx` via `docx`, `.pdf` via `@react-pdf/renderer`

## Layout

```
src/
  app/
    layout.tsx, page.tsx, globals.css        # shell + landing
    login/                                   # passwordless email sign-in
    auth/callback/                           # OTP code exchange
    (app)/                                   # signed-in routes (middleware-guarded)
      home/                                  # dashboard with tool tiles
      account/                               # profile + default brand voice
      billing/                               # credits by tool + history
      onboarding/                            # the Onboarding Builder module
        page.tsx                             # kit list
        new/                                 # input flow (structured + dump)
        [kitId]/                             # preview · unlock · edit · export
    api/
      extract-dump/                          # claude: free text → KitInputs
      generate-kit/                          # claude: KitInputs → 7 artifacts
      save-artifact/                         # inline edits
      checkout/                              # stripe checkout session
      stripe-webhook/                        # checkout.session.completed → purchases
      unlock-kit/                            # spend a credit, unlock kit
      export/[kitId]/docx/                   # branded .docx
      export/[kitId]/pdf/                    # branded .pdf
  lib/
    supabase/                                # client, server, service-role clients
    anthropic.ts, stripe.ts, brand.ts
    credits.ts, prompts.ts, json.ts, kit-types.ts
    export/docx.ts, export/pdf.tsx
  components/                                # SignOutButton, ArtifactCard
  middleware.ts                              # guards (app) routes
supabase/migrations/
  0001_init.sql                              # schema (profiles, kits, kit_artifacts, purchases, generations)
  0002_rls.sql                               # owner-only policies
```

## Setup

1. **Install**
   ```bash
   cd clarity-hub
   npm install
   ```

2. **Supabase**
   - Create a project at supabase.com.
   - Run the two SQL files in `supabase/migrations/` (SQL editor or `supabase db push`).
   - Auth → enable Email provider, leave password disabled, set the redirect URL to `${NEXT_PUBLIC_APP_URL}/auth/callback`.

3. **Stripe**
   - Create a one-time price for "Onboarding Builder — 3 kits" at $27. Copy its `price_…` id.
   - For local webhook testing: `stripe listen --forward-to localhost:3000/api/stripe-webhook` — copy the `whsec_…` it prints.

4. **Env**
   ```bash
   cp .env.example .env.local
   # fill in the Supabase, Anthropic, and Stripe values
   ```

5. **Run**
   ```bash
   npm run dev
   ```

## Notes on the architecture

- **One Supabase project, per-tool tables.** `profiles` and `purchases` are shared. The Onboarding Builder owns `kits`, `kit_artifacts`, `generations`. The SOP Builder, when it migrates in, gets its own `sop_*` tables.
- **Credits are per-tool.** `purchases.product` discriminates them. A future "Clarity Hub Pass" plugs in by writing rows with `product = 'pass'` and adding a single rule in `lib/credits.ts` — **no schema change**.
- **RLS is on for everything.** Server-side writes to `purchases` / `generations` use the service-role key (`lib/supabase/service.ts`) — never import that file from a client component.
- **Auth copy is `"Continue with email"` → `"Check your inbox for your sign-in link"`.** Don't surface the words "magic link" in the UI.
- **Exports use `@react-pdf/renderer`, not a headless browser** — Vercel-friendly.

## Known TODOs before launch

- Empty states / first-run walkthrough on `/onboarding`
- Per-artifact rich editors (intake form, checklist, timeline) — current editor is a JSON fallback for non-email artifacts
- Basic analytics
- Add a second `name` field to the new-kit form so kits can be renamed without re-keying the business name
- 5–10 real founder descriptions through the system prompt before any further UI polish (per brief)

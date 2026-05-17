# CLARITY_ONBOARDING_BRIEF.md  ·  v2

**Product:** Client Onboarding Builder
**Owner:** Heather Good — The Clarity Hub
**Status:** Ready to build · Paste into Claude Code

-----

## 1. What we're building

A web tool where a service-based founder describes their business **once** and gets a complete, branded **client onboarding kit**:

- A **4-email** welcome sequence (incl. a mid-project check-in)
- A tailored client intake form
- A kickoff checklist (internal + client-facing)
- A client-facing onboarding timeline ("here's what happens, and when")

The founder fills a short questionnaire (or pastes a messy brain-dump), Claude structures it into all artifacts, and they edit + export. It's the **paid sibling** of the free SOP Brain Dump and Founder Clarity tools — same audience, same "messy in, clean system out" promise.

**Who it's for:** Early-stage service founders (1–20 people) who reinvent onboarding badly every time they sign a client.

**Price:** One-time **$27**. One purchase = **3 kits** (covers multiple service tiers).

-----

## 2. Strategic decisions (locked)

| Decision       | Choice                                                                                                                                      | Why                                                                                                                |
|----------------|---------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------|
| Monetisation   | Free generation, **pay to unlock** full export + editing                                                                                    | AI demos its value before payment → higher conversion + real demand signal                                         |
| Build approach | Build the **Clarity Hub shell**; Onboarding Builder is its first module (see §13)                                                           | One login, one billing page across all tools                                                                       |
| Credits        | 1 purchase = 3 kit unlocks                                                                                                                  | Generous (covers service tiers/gifting), capped (prevents abuse)                                                   |
| AI model       | `claude-sonnet-4-6`                                                                                                                         | High-volume + low price = token cost matters; Sonnet is the right speed/cost tier                                  |
| Input mode     | Structured questionnaire **+** "just paste it" dump mode                                                                                    | Consistent with the SOP brain-dump pattern; low friction                                                           |
| Auth           | Passwordless email sign-in. UI copy: **"Continue with email"** → *"Check your inbox for your sign-in link"*                                 | Less friction, fewer support requests — without the cheesy "magic link" label                                      |
| Email count    | **4** — welcome, prep, kickoff-ready, mid-project check-in                                                                                  | The check-in is the artifact most founders forget; high perceived value                                            |
| Export         | **`.docx` + `.pdf`** in v1, plus copy-to-clipboard                                                                                          | Founders want a finished, sendable file, not just text                                                             |
| Pricing model  | **Per-tool one-off now** — $27 = Onboarding Builder (3 kits). A bundled **"Clarity Hub Pass"** is introduced later, once 3+ tools are live. | Can't price a "suite" that's only 2 tools; the dashboard earns the second sale via cross-sell, not a blanket price |

> **Pricing note (read this).** Etsy hosts *downloadable files*, not logged-in web apps — so the AI Builder can't be sold there and isn't truly competing with Etsy template products. Recommended funnel: sell a **static Onboarding Template Pack** (the fillable, non-AI version of these same outputs) on Etsy as cheap, high-traffic top-of-funnel; it drives buyers to the AI Builder on clarityhub.com.au. Two SKUs, two jobs. Don't anchor the Builder's price to Etsy — $27 is set because *you* chose it, not because Etsy forces it.

-----

## 3. Tech stack

- **Frontend:** Next.js (App Router) + Tailwind, deployed on Vercel
- **Backend/DB/Auth:** Supabase (Postgres + Auth + RLS) — one shared Clarity Hub project
- **Auth:** Supabase passwordless email sign-in (OTP/link). Never surface the words "magic link" to users.
- **AI:** Anthropic API (`claude-sonnet-4-6`) called from a Next.js server route — never expose the key client-side
- **Payments:** Stripe Checkout + webhook
- **Export:**
  - `.docx` via the `docx` npm package
  - `.pdf` via `@react-pdf/renderer` (serverless-friendly — no headless browser needed on Vercel)
  - copy-to-clipboard for each artifact

**Brand system (shared across Clarity Hub):**
Warm white `#F7F4EF`, charcoal `#2E2E2E`, navy `#3F5366`, sage `#8FA79A`, clay `#C97E63`. Headings DM Serif Display, body DM Sans. Wave-and-dots SVG motif. Apply the same tokens to exported `.docx`/`.pdf` so deliverables look on-brand.

-----

## 4. User flow

1. **Sign in** — "Continue with email" → sign-in link
2. **Home** — Clarity Hub dashboard (see §13) → open Client Onboarding Builder
3. **New kit** → choose *Structured questions* or *Paste a brain-dump*
4. **Fill inputs** → save to `kits.inputs`
5. **Generate** → server route calls Claude → stores artifacts in `kit_artifacts`
6. **Preview** → emails truncated, checklist partial, "Unlock" CTA visible
7. **Purchase** (if no credits) → Stripe Checkout → webhook grants 3 credits
8. **Unlock kit** → consumes 1 credit, `kits.is_unlocked = true`
9. **Edit + Export** → inline edit each artifact → export `.docx` / `.pdf` / copy

-----

(See `clarity-hub/README.md` for build-side documentation; this file remains
the strategic source of truth.)

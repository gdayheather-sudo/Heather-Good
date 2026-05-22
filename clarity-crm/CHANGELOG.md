# Changelog

## Phase 2 — Track B end-to-end (Substack article)

### Built

- **Robust long-form drafting:** the Substack article draft now returns raw
  Markdown instead of JSON. Embedding a 600–1100-word article inside a JSON
  string was fragile (unescaped quotes/newlines); raw Markdown is reliable.
  `generateDraft` branches by track — Track A still parses JSON for body + hooks.
- **Editorial rendering:** article bodies render as brand-styled Markdown
  (`@tailwindcss/typography` + `react-markdown`/`remark-gfm`), headings in
  DM Serif Display, links in Soft Clay. Track A bodies stay plain (their line
  breaks matter). Graphic briefs render as Markdown too.
- **Inline body editing:** every post body has an Edit → textarea → Save flow
  (`updatePostBody`), so the AI draft is a starting point Heather can refine —
  essential for the article as an editorial product.
- **Article-aware layout:** Track B units render single-column so the article
  gets full reading width (Track A keeps the side-by-side variant view).
- **Reading meta:** word count + estimated read time on the article card.
- **Track B graphic briefs:** hero + per-step visuals generated via
  `graphic_brief_substack_article` (one pasteable Markdown brief covering all
  graphics); Track B correctly produces no variants.

### Skipped / deferred

- Per-graphic brief rows (each step as its own `platform_posts`-style record)
  were not added — the single Markdown brief covers hero + steps and matches the
  paste-into-graphics workflow. Revisit only if Heather wants per-step status.
- Same live-provisioning caveat as Phase 1: code is committed; Heather runs the
  Supabase migration and sets env vars to exercise Track B in production.

---

## Phase 1 — Schema + Auth + Track A end-to-end

### Built

- **Project scaffold:** Next.js 15 App Router, TypeScript strict, Tailwind +
  shadcn/ui (only the components used: button, card, input, textarea, label,
  badge, select). Clarity Hub brand palette + DM Serif Display / DM Sans wired
  into the theme.
- **Supabase schema** (`supabase/migrations/0001_init.sql`): `content_units`,
  `interviews`, `platform_posts`, `cadence_slots`. Platform is a free-text
  column (new platforms need no migration). `updated_at` trigger on posts.
- **RLS from day one:** owner-only policies on all four tables; child tables
  inherit ownership via their parent `content_unit`.
- **Auth:** Supabase magic-link login, session refresh + route gating in
  middleware, `/auth/callback` code exchange.
- **Cadence seeding:** `on_auth_user_created` trigger seeds Heather's slots —
  LinkedIn/Instagram/Substack-note Sun & Wed 17:00, Substack article Fri 09:30
  (Brisbane local time).
- **Track A end-to-end:** seed capture (`/new`) → streaming LinkedIn interview
  (`/api/interview`) → draft + 3 hook variants → one-click Substack Note +
  Instagram variants → graphic briefs (carousel for LinkedIn, single for
  Note/IG). Per-post status (drafting → ready → scheduled → posted), schedule
  datetime and posted URL.
- **Track B draft path** is also wired (interview + article draft + brief
  prompts exist) so Phase 2 mostly needs UI polish and sign-off — but it is NOT
  yet exercised per the "don't start Phase 2 until Phase 1 is live" rule.
- **Versioned prompts** in `/prompts/*.md` (persona / audience / do's / don'ts /
  output format), loaded as raw strings.
- **Dashboard + ideas list:** pipeline counts per track and a cadence
  "needs attention" view (brought forward from Phase 3 since the data was
  cheap to surface).

### Skipped / deferred (by design)

- **No live provisioning:** this was built in a sandbox with no Supabase /
  Vercel / Anthropic credentials. Code, schema and prompts are committed;
  Heather runs the migration and sets env vars to bring it up.
- **Cadence gap detection is simplified:** a slot shows "needs attention" when
  no post for that platform is `ready`/`scheduled`. The exact "Sunday 5pm empty
  by Saturday morning, in Brisbane time" timing logic is Phase 3.
- **Settings is read-only** (cadence editing, brand-voice tweaks, prompt
  overrides) — Phase 3.
- **30-day auto-archive of posted items** — not yet implemented (Phase 3).
- **Auth is single-user magic-link**; no team features (out of scope for v1).

### Needs Heather's input

- Run `0001_init.sql` against the new Supabase project, then confirm the
  cadence-seeding trigger fired on your first sign-in (check `/settings`).
- Confirm the Anthropic model id in `.env` (`ANTHROPIC_MODEL`, defaults to a
  Claude Sonnet 4 id) matches the key/account you provision.
- Sign-off gate: confirm Track A works end-to-end in production before I start
  Phase 2 (Track B UI).

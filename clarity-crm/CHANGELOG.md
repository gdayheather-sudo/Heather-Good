# Changelog

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

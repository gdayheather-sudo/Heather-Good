# clarity-hub-web

Public marketing site for The Clarity Hub (clarityhub.com.au).

Phase 1 scope: four routes — `/`, `/about`, `/sop-brain-dump`, `/thank-you`.

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Deployed on Vercel

## Brand tokens

| Token | Hex |
| --- | --- |
| warm-white | `#F7F4EF` |
| charcoal | `#2E2E2E` |
| navy | `#3F5366` |
| sage | `#8FA79A` |
| clay | `#C97E63` |

Fonts: DM Serif Display (headings), DM Sans (body), loaded from Google Fonts.

## Local dev

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Formspree

Replace `FORMSPREE_ENDPOINT` in `app/sop-brain-dump/page.tsx` with the real
Formspree form ID before shipping.

## Deploying to Vercel

1. Push to GitHub.
2. Import this folder as a project in Vercel (set root to `clarity-hub-web`).
3. Add custom domain `clarityhub.com.au`.
4. Drop the workflow PDF at `public/sop-brain-dump.pdf` so the autoresponse
   link resolves.

## Not in Phase 1

Blog, shop, testimonials, case studies, `/hub` dashboard. See
`Documents/` (repo root) for the full build brief.

# Journey Together — MVP prototype

A mobile-first PWA that connects people with disabilities to verified adult
companions who are **already travelling a similar route**. This is **not**
a rideshare/Uber alternative — it is a community carpool/companion model
with capped contribution fees.

> The whole app runs on dummy data and `localStorage`. There is no backend,
> no real auth, no real maps, no real payments, no real SMS. Everything is
> stubbed so the flows can be walked end-to-end.

## Run it

```bash
cd journey-together
npm install
npm run dev
# open http://localhost:3000
```

Build for production:

```bash
npm run build
npm start
```

## How to use the demo

- The header has a **“Sign in as…”** picker. Use it to swap between any
  seeded user — companion, requester, or admin. The active user persists
  across reloads.
- Suggested walkthrough:
  1. Start as **Heather Lin** (requester). Hit *Find a companion* — try
     the prefilled Footscray → Southern Cross search.
  2. Pick the top match, *Request to join*, then *Pay* in the booking screen.
  3. Switch to that **companion** (e.g. *Aroha Tane*) — you'll see a pending
     request on their home screen. Approve, then *Start trip* (a fake SMS
     toast goes to the requester's trusted contact).
  4. *End trip* as the companion, then both sides can *rate* each other.
  5. Switch to **Toni Alvarez (Admin)** and open `/admin` (full-width
     desktop layout) to see verifications, users, flagged issues and
     metrics. Use *Reset demo data* to start over.

## Reset the demo

Two ways:

- Click **Reset demo data** in your Profile (or on the admin page).
- Or wipe `localStorage` for the origin in DevTools.

## Tech

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS**
- shadcn/ui-style primitives are colocated under `components/ui` (no extra
  dependency — these are simple, accessible building blocks).
- All state in a `StoreProvider` (`lib/store.tsx`) backed by `localStorage`.
- Mock data in `lib/mockData.ts` — 8 companions, 6 requesters, 15 trips,
  3 seeded bookings, sample messages and ratings.
- Matching engine in `lib/matching.ts` (haversine distance + heuristic
  route overlap + time proximity + rating + accessibility-profile fit).

## What's stubbed

| Area | Stubbed how |
| --- | --- |
| Auth | A user picker in the header swaps `activeUserId`. No passwords, no sessions. |
| Document uploads (WWCC, WWDC, ID, licence) | 2-second fake check; everything resolves to “verified” |
| Background-check API | None — the admin dashboard just toggles a status |
| Maps | A simple SVG route diagram; coordinates are real-ish (Melbourne) so distance maths work |
| Payments | A modal that flips a `paidHeldInEscrow` flag. No Stripe, no card capture |
| SMS to trusted contact | A toast notification shown in-app |
| Real-time messaging | `setTimeout`-based fake replies inside the booking thread |
| OCR / document verification | None — admin reviews placeholder “preview” tiles |

## Accessibility notes

- WCAG-conscious colour pairings (deep teal ink + amber accent). High contrast
  in both light and dark mode. Dark mode toggle in the header.
- Tap targets are at least 48px tall on primary actions.
- All form fields have proper `<label>`s; errors and hints are bound to fields.
- Skip-to-content link at the top of every page.
- `prefers-reduced-motion` is respected for transitions and the SOS pulse.
- Icons are paired with text labels everywhere primary.
- Tooltips define jargon (NDIS, WWCC, WWDC) inline on first use.

## Routes

- `/` – Landing
- `/about` – Model, fee philosophy, safety, eligibility
- `/signup` – Pick a role
- `/onboarding/[role]` – Multi-step sign-up flow
- `/home` – Role-aware dashboard
- `/trips/post` – Companion posts a journey
- `/trips/request` – Requester searches for a companion
- `/trips/[id]` – Trip detail, messaging, lifecycle, payment, SOS, rating
- `/profile` – Your own profile
- `/profile/[userId]` – Public profile view
- `/admin` – Trust & safety dashboard (desktop layout)

## Renaming the app

Two places hold the placeholder name:

- `app/layout.tsx` — `<title>` / metadata
- `components/Header.tsx` — logo text

Both reference the literal string “Journey Together”. Find-and-replace and
you're done.

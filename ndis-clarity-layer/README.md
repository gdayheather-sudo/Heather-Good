# NDIS Clarity Layer

An NDIS Intelligence Layer that turns daily support case notes into structured,
compliant, report-ready outputs. **Not** a CRM — no rostering, billing, or
scheduling. Just three core capabilities done well:

1. **Participant support profiles** — context that shapes every note.
2. **Smart case notes** — structured capture with AI-assisted formatting and a
   human approval step.
3. **Report generation** — monthly summaries, plan reviews and allied health
   updates produced as PDF and Word.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- PostgreSQL via Prisma
- Session auth: bcrypt + JWT in HTTP-only cookie (jose)
- AI: Anthropic SDK (`@anthropic-ai/sdk`) with a deterministic local fallback
  so the app remains fully usable without an API key
- Reports rendered with `pdfkit` (PDF) and `docx` (Word)

## Getting started

```bash
cp .env.example .env       # fill in DATABASE_URL, AUTH_SECRET, DATA_ENCRYPTION_KEY
npm install
npm run db:generate
npm run db:push            # or: npm run db:migrate
npm run db:seed            # optional — creates a demo org with three users
npm run dev
```

Then sign in at <http://localhost:3000> with one of the seeded accounts:

| Role           | Email                 | Password           |
|----------------|-----------------------|--------------------|
| Admin          | admin@example.com     | demo-password-12   |
| Team lead      | lead@example.com      | demo-password-12   |
| Support worker | worker@example.com    | demo-password-12   |

Or click **Create an account** on the sign-in page to bootstrap a new
organisation; you will be the first admin.

## Roles and permissions

| Capability                          | Support worker | Team lead | Admin | External viewer |
|-------------------------------------|:--:|:--:|:--:|:--:|
| View participant Quick view         | ✓ | ✓ | ✓ |   |
| View participant Full profile       |   | ✓ | ✓ |   |
| Edit participant profiles           |   | ✓ | ✓ |   |
| Create / edit case notes (drafts)   | ✓ | ✓ | ✓ |   |
| Approve case notes                  |   | ✓ | ✓ |   |
| Generate / share reports            |   | ✓ | ✓ |   |
| Manage users and branding           |   |   | ✓ |   |
| View shared report links            |   |   |   | ✓ |

Permissions live in `src/lib/rbac.ts` and are enforced both in route handlers
and in the UI navigation.

## Security

- Authentication is required on every route (see `src/middleware.ts`); only
  `/login`, `/register` and `/shared/<token>` are public.
- Sensitive participant fields (support context, risk/safety, contacts,
  medications) are encrypted at rest with **AES-256-GCM** using
  `DATA_ENCRYPTION_KEY` (see `src/lib/crypto.ts`).
- Per-organisation isolation is enforced on every query via
  `organisationId` filters.
- A full audit trail (`AuditEvent`) is written on login/logout, create/update,
  approval, generation, sharing and unsharing actions.
- Case notes and reports keep a version history table (`CaseNoteVersion`,
  `ReportVersion`).

## Workflow at a glance

```
Support worker ─► writes raw note ─► clicks "Structure note"
                                       │
                                       ▼
                          AI returns DAP-style draft
                                       │
                                       ▼
                       Worker reviews, edits, approves & saves
                                       │
                                       ▼
Team lead ────────────► reviews and clicks "Approve note"  (status → APPROVED)
                                       │
                                       ▼
Team lead ─► picks participant + date range + report type
              ─► system aggregates approved notes by goal
                  ─► AI writes the narrative
                      ─► PDF + Word generated, optionally shared
```

## Project layout

```
src/
  app/
    (app)/                  authenticated app shell (sidebar + topbar)
      dashboard/
      participants/
      case-notes/
      reports/
      admin/
    api/                    route handlers
    login/, register/       public auth pages
    shared/[token]/         read-only external view
  components/               shared UI (Sidebar, Topbar, AppShell)
  lib/
    auth.ts                 session + RBAC primitives
    rbac.ts                 capability matrix
    crypto.ts               AES-256-GCM helpers
    db.ts                   Prisma singleton
    audit.ts                audit log writer
    ai.ts                   Anthropic client + local fallback
    participants.ts         schema + encrypted-field helpers
    reports.ts              PDF/DOCX renderers
prisma/
  schema.prisma
  seed.ts
```

## Things deliberately not built (per MVP scope)

- Rostering / scheduling
- Billing / invoicing
- Clinical-level medication administration tracking
- Workflow builders or automation

## Notes on the AI assist

If `ANTHROPIC_API_KEY` is set, structured case notes and report narratives are
written by Claude. If it isn't set, a deterministic local formatter produces a
DAP-style note and a structured narrative. Either way, **nothing is finalised
without explicit user approval** — the worker reviews and approves the
structured note before it is saved as a draft, and the team lead approves the
draft before it counts toward reports.

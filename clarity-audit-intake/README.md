# The Clarity Audit — Intake

Pre-call intake system for **The Clarity Audit**, the 90-minute consulting
offering under The Clarity Hub. Founders complete this ~15-minute intake before
their booked call. Answers are captured by **voice** (Whisper transcription) or
**typed** input — their choice per question. On submission, two Claude-generated
documents are produced in parallel: a polished **Pre-Audit Summary** emailed to
the client, and an internal **Audit Prep Doc** emailed to Heather.

This is the first piece of Clarity Hub infrastructure. `RecordButton`,
`QuestionCard`, and `TranscriptEditor` are built to be reused in the
voice-to-SOP tool.

## Stack

- Next.js 15 (App Router) · React 19 · TypeScript
- Tailwind CSS (brand tokens in `tailwind.config.ts`)
- Supabase (Postgres + Storage)
- OpenAI Whisper (`whisper-1`) — transcription only
- Anthropic Claude (`claude-opus-4-7`) — document generation
- Resend — transactional email

## Getting started

```bash
cp .env.example .env.local   # fill in real keys
npm install
npm run dev                  # http://localhost:3000
```

### 1. Supabase

1. Create a project.
2. Run `supabase/schema.sql` in the SQL editor (tables, RLS, storage trigger).
3. Storage → New bucket → name `intake-audio`, **uncheck "Public"**.
4. Copy the project URL, anon key, and service-role key into `.env.local`.

### 2. Create a test session

Run `supabase/seed.sql` in the SQL editor. It returns an `intake_url` —
open it in the browser to start the intake.

(Heather creating sessions via an admin dashboard is Phase 2; for now,
sessions are inserted by SQL.)

### 3. Keys

- `ANTHROPIC_API_KEY` — Claude
- `OPENAI_API_KEY` — Whisper
- `RESEND_API_KEY` + verified sender (`hello@clarityhub.com.au`)
- `HEATHER_EMAIL` — where the internal prep doc is sent

## Architecture

```
app/audit/intake/[token]/page.tsx     Server: validate token, load state
app/audit/intake/[token]/IntakeForm   Client: journal UI, autosave, submit
app/api/intake/[token]/save-response   Upsert one answer (autosave target)
app/api/intake/[token]/transcribe      Upload audio → Whisper → transcript
app/api/intake/[token]/submit          Validate, mark submitted, kick processing
app/api/intake/[token]/process         Internal retry: regenerate + re-email
lib/process.ts                         Parallel Claude calls, save docs, email
lib/prompts.ts                         The two calibrated system prompts
lib/email.ts                           Resend + markdown→HTML branded shell
data/questions.json                    The 8 calibrated questions (do not edit)
```

### Flow

1. Client opens `/audit/intake/[token]`. Invalid token → 404.
2. Single-page journal with all 8 questions; voice/text toggle per question.
3. Autosave: 1.5s debounce after typing, 30s heartbeat, and `pagehide` beacon.
4. Submit validates every question (voice transcript present, or typed answer
   meets `min_words`), marks `submitted`, and runs processing via `after()`.
5. Processing runs both Claude prompts in parallel, saves to `audit_documents`,
   emails the client their summary and Heather the prep doc, marks `processed`.

## Notes

- The service-role Supabase client (`lib/supabase/server.ts`) bypasses RLS and
  is server-only; every query is token-scoped in the API layer.
- Audio is stored privately; clients can never read `audit_documents`.
- `design-reference/clarity-audit-landing.html` is the canonical design source
  for the Clarity Hub visual language.

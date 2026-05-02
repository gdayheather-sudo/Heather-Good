# Bright Paths — Adaptive Tutoring Platform

A web-based adaptive tutoring platform for school-aged learners (Foundation
to Year 10, starting with Year 1), aligned to the Australian National
Curriculum (**ACARA v9.0**).

> **Design principle:** Meet the student where they are — not where the
> system expects them to be.

## What it does

- Personalises learning by **ability**, not age or year level.
- Adapts difficulty in real time using evidence-based learning techniques:
  retrieval practice, spaced repetition, interleaving, dual coding,
  immediate feedback, desirable difficulty.
- Tracks progress against ACARA outcomes (skill-mastery map, traffic-light
  indicators, recommended focus areas).
- Three role-based interfaces: **Student**, **Mentor**
  (teacher / parent / support worker), **Admin** (org / NDIS provider).
- Accessibility-first UI: read-aloud, themes (space / ocean / dogs / art),
  larger text, high-contrast, reduced motion, generous tap targets.

## Run it

```bash
cd adaptive-tutoring-platform
npm install
npm start
# open http://localhost:3000
```

The first run seeds two demo students under one mentor and one admin,
inside one organisation (`org-bright-paths`). Persistence is JSON files in
`./data/`.

### Demo accounts

| Role    | Username  | PIN  |
|---------|-----------|------|
| Admin   | `admin`   | `0000` |
| Mentor  | `heather` | `1234` |
| Student | `arlo`    | `11`   |
| Student | `mia`     | `22`   |

## Architecture

```
server.js                  Express app + REST routes + auth gate
src/
  curriculum/              ACARA v9.0 outcome map (English, Maths)
  content/                 Lesson units (Teach + Practice + Retrieval + Review)
  adaptive-engine.js       Ability tracking, item selection, SM-2 scheduling
  profile-system.js        Student profile CRUD + progress summaries
  data-store.js            JSON-file persistence (swap for Postgres/Firestore)
  reports.js               Org overview + NDIS-friendly CSV export
public/
  index.html               Role picker + sign-in
  student.html, mentor.html, admin.html
  js/
    api.js                 fetch client + token storage
    lesson-engine.js       Interactive lesson player (mc, numeric, tap-count,
                           order, sentence-build, blend, true-false)
    student-app.js         Dashboard + settings + lesson loop
    mentor-app.js          Skill map, profile editor, focus areas, time chart
    admin-app.js           Org KPIs, learner table, CSV export
  styles/                  Calm token-based design system (themes + a11y)
data/                      Seeded JSON state (gitignored)
```

### Adaptive engine

`src/adaptive-engine.js` combines four mechanisms:

1. **Ability tracking** — an Elo-style update per subject. Each correct
   answer at a given difficulty band nudges the learner's ability up; each
   miss nudges it down. Decoupled from year level so a Year 1 student can
   work on Year 2 maths while still doing Foundation phonics.
2. **Item selection (desirable difficulty)** — outcomes within ±0.3 bands
   of the learner's ability are preferred so the work is challenging but
   reachable. Mentor-set focus areas always win.
3. **Spaced repetition** — SM-2-inspired schedule per
   `(student × outcome)`. Correct retrievals push the next review further
   out; misses reset the interval to 1 day.
4. **Interleaving** — once an outcome has been seen at least twice, a
   single quick retrieval item from another already-seen outcome is mixed
   into each lesson plan. The lesson player flags it so the learner sees
   "🔁 Quick mix-up!".

Every attempt is recorded with `{ correct, durationMs, prompt, given,
expected, mode }`, which feeds the mentor and admin dashboards.

### Lesson structure

Each unit ships four phases:

1. **Teach** — short, dual-coded explanation (visual + label) and an "I'm
   ready" gate. Learners can replay the audio.
2. **Practice** — guided items with hints baked into feedback.
3. **Retrieval** — no hints; this is where mastery actually grows.
4. **Review** — spaced re-exposure for already-mastered outcomes.

The engine assembles a different mix depending on outcome status:
`new → Teach + 3 Practice + 1 Retrieval`, `developing → quick recap + 2 + 2`,
`struggling → scaffold to prerequisite unit`, `mastered → 2 spaced review
items`. An interleaved retrieval is tacked on the end.

### Profile system

```ts
{
  id, name, yearLevel,                 // year only used for reporting context
  level: { english, mathematics },     // ability bands - the real driver
  interests: [...],                    // dogs, space, ocean, art, sport...
  theme: 'space' | 'ocean' | ...,      // drives visuals + mascot
  sensory: { reduceMotion, reduceSound, highContrast, largeText },
  strengths, challenges,
  focus: [outcomeCode, ...],           // mentor override of AI selection
  streakDays, points, badges
}
```

The adaptive engine reads `interests`, `sensory`, `level`, and `focus`
when building each lesson plan.

### Curriculum coverage in the MVP

| Subject     | Years    | Outcomes shipped            |
|-------------|----------|-----------------------------|
| Mathematics | F, 1, 2, 3 | Number, Algebra, Measurement, Space, Statistics, Probability |
| English     | F, 1, 2, 3 | Language, Literature, Literacy |

Year 1 has the deepest content; Foundation and Year 2 outcomes are seeded
so the engine can move a Year 1 student up or down without leaving the
mapped curriculum.

## API

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| `POST` | `/api/auth/login` | any | `{username, pin, role}` → `{token, user}` |
| `GET`  | `/api/auth/me` | any | current user |
| `GET`  | `/api/curriculum` | any | list subjects + year levels |
| `GET`  | `/api/curriculum/:subject/:year` | any | outcomes for a year |
| `GET`  | `/api/students` | mentor, admin | list visible students |
| `POST` | `/api/students` | mentor, admin | create student profile |
| `PATCH`| `/api/students/:id` | mentor, admin | update profile / focus / sensory |
| `GET`  | `/api/lessons/next` | student | next adaptive lesson plan |
| `POST` | `/api/lessons/attempt` | student | record one attempt, get feedback |
| `GET`  | `/api/progress/:studentId` | any-with-access | skill map + recommendations |
| `GET`  | `/api/admin/overview` | admin | org KPIs + learner roll-up |
| `GET`  | `/api/admin/student/:id/report.csv` | mentor, admin | NDIS-ready CSV |
| `GET`  | `/api/baseline/:studentId` | any-with-access | diagnostic baseline questions |
| `POST` | `/api/baseline/:studentId` | any-with-access | score baseline → seed ability |

## Accessibility (NDIS-aligned)

- **Read aloud** — Speech Synthesis on prompts, examples and feedback
  (toggle in the top bar).
- **Themes** — interest-driven (space / ocean / dogs / art) so the same
  shapes and patterns appear in a familiar visual world.
- **Sensory toggles** — large text, high contrast, reduced motion, reduced
  sound.
- **Predictable layout** — same lesson skeleton every time so neurodiverse
  learners aren't surprised by the UI.
- **No time pressure** — there is no countdown; pacing is the learner's.
- **Big tap targets** — 44 px minimum, generous spacing, drag-or-tap on
  ordering items.
- **Skip link** + visible focus rings on every interactive element.
- **Calm feedback** — celebratory but not overstimulating; explanations
  always state *why*.

## Audio: TTS, recorded files, and neural voices

Synthetic browser voices struggle with phonics - they read "sh" as
"ess aitch" and isolated phonemes like /k/ /a/ /t/ come out robotic.
The platform handles this with a layered fallback:

1. **`audio` URL on a teach example or item** — if present, plays that
   recorded file via an `<audio>` element. This is the gold standard.
   Drop MP3s/WAVs into `public/audio/` and reference them:

   ```js
   examples: [
     { show: 'd-o-g', say: 'dog', label: 'dog', audio: '/audio/dog.mp3' },
   ]
   ```

2. **`say` field with natural language** — full-word, well-formed
   sentences that TTS can pronounce well. Avoid isolated phonemes here.

3. **`prompt` / `intro`** — the fallback text used when nothing else is
   set. The phonetic preprocessor only rewrites quoted digraphs and a
   handful of safe cases.

For high-quality recorded audio without recording everything yourself,
the platform ships with optional **ElevenLabs neural TTS** integration.
Once enabled it dramatically improves phonics audio (digraphs sh/ch/th,
isolated phonemes) and reads sentences in a near-human voice.

### Enabling ElevenLabs

```bash
cp .env.example .env
# edit .env, paste your key:
# ELEVENLABS_API_KEY=eleven-...
npm start
```

That's it. Restart the server and the lesson player automatically
routes every read-aloud through ElevenLabs. Audio is cached on disk in
`public/audio/tts-cache/` so each unique line costs at most one API
call across all learners. Browser TTS remains the fallback when the
key is missing or a request fails.

#### Voice selection

- Default: **Charlotte** (en-GB female, voice id `XB0fDUnXU5powFXDhCwa`).
- To use a different voice, browse https://elevenlabs.io/app/voice-library,
  copy any voice id, and set `ELEVENLABS_VOICE_ID=` in `.env`.
- To use **your own voice**: paid tier ($5/mo "Starter"). Record 1–10 min
  of yourself reading, click "Add voice → Instant clone", then paste
  the resulting voice id into `.env`. Every prompt and feedback line
  the platform speaks will then be in your voice.

#### Cost

Free tier ships with ~10k chars/month — enough to cover all of Year 1
phonics with caching. Paid tiers start at $5/mo for ~30k chars and
include voice cloning.

## Future expansion (already scaffolded)

- `src/curriculum/*` accepts more subjects (Science, HASS, Life skills) by
  exporting another `{ name, years }` module.
- `src/data-store.js` is the only file with disk I/O — replacing with
  Postgres/Firestore won't touch any route logic.
- `src/content/*-units.js` is plain data — content authoring or AI-generated
  lessons (e.g. Anthropic Claude) can append units without code changes.
- Speech input (`SpeechRecognition`) and live mentor messaging are obvious
  next additions on the same surface.

## Licence

Internal MVP. Replace before any external deployment.

# ✦ Social Studio

A **local, self-contained web app** for creating, generating and scheduling social
media posts across **multiple brands** and **multiple platforms** — powered by
**Claude** and **ChatGPT**.

Everything lives on your machine: posts, brands, images and your API keys are
stored in a local SQLite database (`data/app.db`). Nothing is sent anywhere
except the AI provider you choose when you click *Generate*.

---

## What it does

- **Multi-brand workspace** — keep each company separate, each with its own
  voice, audience, guidelines, colours, example posts and reference images.
- **AI Composer (the chat bot)** — type one brief, pick your platforms, and get a
  tailored caption for each one. Choose **Claude** or **ChatGPT** per generation.
- **Brand-aware** — the AI is given the brand's voice and example posts so the
  copy actually sounds like the brand, not generic marketing.
- **Reference images** — attach reference images to a brand and include them in a
  generation; the text model "sees" them (vision) to shape the copy and the
  image prompt.
- **Image generation** — generate a platform-sized image for any post via OpenAI
  (`gpt-image-1`), or upload your own. *(Claude/Anthropic models write copy and
  read images but cannot generate images, so image generation uses OpenAI.)*
- **Content calendar** — a month view of scheduled posts, per brand or all brands.
- **Pipeline board** — drag posts through `Idea → Draft → In review → Approved →
  Scheduled → Published`.
- **To-do list** — track everything that needs attention, by brand and priority.
- **Dashboard** — what needs review, what's coming up, and recent activity.

---

## Requirements

- **Node.js 22.5 or newer** (uses Node's built-in SQLite — no native build step).

Check your version:

```bash
node --version
```

---

## Getting started

```bash
cd webapp
npm install
npm start
```

Then open **http://localhost:4477**.

On first run:

1. Go to **Settings** and paste your API keys:
   - **Anthropic** key for Claude captions — <https://console.anthropic.com/settings/keys>
   - **OpenAI** key for ChatGPT captions and image generation — <https://platform.openai.com/api-keys>

   Keys are stored locally in `data/app.db` and never leave your machine. You can
   use just one provider if you prefer.
2. Create a **Brand** (name, voice, audience, guidelines) and add a few
   **example posts** and **reference images** so the AI learns the brand.
3. Open the **Composer**, write a brief, pick platforms, and generate.
4. **Save as post**, generate images, set a schedule, and watch it move through
   the **Pipeline** and appear on the **Calendar**.

---

## Configuration (optional)

Settings entered in the app take priority. If you'd rather use a file, copy
`.env.example` to `.env`:

| Variable | Purpose | Default |
|---|---|---|
| `PORT` | Server port | `4477` |
| `ANTHROPIC_API_KEY` | Claude key (overridden by the UI value) | — |
| `OPENAI_API_KEY` | OpenAI key (overridden by the UI value) | — |
| `ANTHROPIC_MODEL` | Claude model for copy | `claude-opus-4-8` |
| `OPENAI_MODEL` | OpenAI chat model for copy | `gpt-4o` |
| `OPENAI_IMAGE_MODEL` | OpenAI image model | `gpt-image-1` |

---

## How it's built

- **Backend** — Node.js + Express, Node's built-in `node:sqlite` (zero external
  database), `multer` for image uploads. AI via the official `@anthropic-ai/sdk`
  and `openai` SDKs.
- **Frontend** — a dependency-free vanilla-JS single-page app (ES modules, no
  build step). Just static files served by the same server.
- **Data** — one SQLite file at `data/app.db`; uploaded and generated images in
  `data/uploads/`. Both are git-ignored.

```
webapp/
  server/
    index.js            Express app + static serving
    db.js               SQLite schema & helpers
    settings.js         API keys / models (DB → env → default)
    constants.js        Platforms & pipeline statuses
    routes/             brands, posts, tasks, generate, settings, meta
    services/ai.js      Claude + ChatGPT copy, OpenAI image generation
  public/
    index.html, css/, js/   The single-page app
  data/                 SQLite db + uploads (created on first run)
```

### Backup / reset

Your whole workspace is the `data/` folder. Copy it to back up. Delete
`data/app.db*` to start fresh.

---

## Notes

- This app **generates and organises** content. It does **not** auto-publish to
  the social networks — you copy the finished caption/image into each platform
  (or your scheduler) when you're ready. Publishing integrations can be added per
  platform later.
- A separate, earlier prototype (an Etsy-focused CLI pipeline) lives in the
  repository root; this `webapp/` is the standalone multi-brand application.

# Ethical Shopping Companion — MVP

A shopping companion that takes any product and returns a **ranking + short summary
scored against the _user's own_ priorities** (ingredients, materials, packaging,
environmental impact, fair labour, price). It never declares a brand "good" or
"bad" — it applies the user's stated weights to tiered evidence and **shows its
working**.

This is the **web MVP** that validates the scoring engine. Native iOS (Share
Sheet, camera, App Intents) is Phase 2 and is intentionally **not** built here.

> **The real unknown this MVP validates:** can the engine produce a ranking a
> sceptical, _facts-only_ user finds fair and legible? See `test/` — that is
> where the non-negotiable rules are pinned down.

## Run it

No build step, no `npm install`. You need Node ≥ 20 only to run the dev server
and tests.

```bash
cd app
npm run dev      # → http://localhost:5173  (serves the folder; opens in browser)
npm test         # runs the engine + research test suites (no network)
```

The app fetches live product data from **Open Food Facts** in the browser, so the
machine running the _browser_ needs internet — the dev server itself does not.

Try a barcode such as `3017620422003` (Nutella) or `737628064502`, a product
name, or paste an Open Food Facts URL.

## How it maps to the brief

### Core principle — the user's weights do the judging (§2)
The engine is **category-agnostic** and applies the user's normalised weights to
per-attribute sub-scores. The same evidence scores differently under different
weights — proven in `test/scoringEngine.test.js` → _"THE CORE PRINCIPLE"_.

### The evidence stack & override rule (§3)
Every finding is tagged `verified | disclosed | inferred`. Higher tiers **always
override** lower ones for the same attribute (`resolveAttribute()`), so a
transparent brand is never punished by a category prior it has disproven. Proven
end-to-end with a Fairtrade fixture in `test/research.test.js`.

### Absence as signal + the bug guard (§4)
Each attribute carries a status:
`verified | disclosed | not_disclosed | search_inconclusive`.
- `not_disclosed` (we searched, the company is silent) → a **low signal**,
  weighted by the user's prefs.
- `search_inconclusive` (our retrieval failed) → **excluded from the score** so
  our limitation can't penalise the product — **but it still lowers confidence.**

### Inference shows its basis (§5)
Every `inferred` finding ships with a mandatory, visible, **dismissible** basis
string (see `categoryPriors.js`). Dismissing an assumption re-scores live and the
attribute falls back to "inconclusive" (no penalty).

### Confidence & the receipts (§6)
Each result renders the overall score, a **per-attribute breakdown**
(value · tier · status · source link), and a **confidence indicator** derived
from how much of the user's weighting is verified vs disclosed vs inferred vs
not found.

### Research-agent architecture (§8)
`researchAgent.js` runs: **resolve** (barcode / URL / search) → **gather**
(Open Food Facts; web-search is a pluggable hook) → **classify** (into the
evidence stack) → **score** → **cache**. The per-product evidence **cache**
(`cache.js`) is the proprietary moat: the next lookup of the same product is
instant.

### Legal posture (§12)
All copy frames output as "by your priorities…", labels assumptions, and
distinguishes opinion from fact. (Not legal advice.)

## Architecture

```
app/
  index.html              # entry; importmap loads React + htm; Tailwind Play CDN
  serve.js                # zero-dependency static dev server
  src/
    engine/
      scoringEngine.js     # ★ THE module — pure, dependency-free, framework-free,
                           #   category-agnostic. Lifts unchanged into native later.
    research/
      openFoodFacts.js     # OFF client + field→tiered-evidence classifier
      categoryPriors.js    # the ONLY place INFERRED assumptions are minted
      researchAgent.js     # resolve → gather → classify → cache orchestration
      cache.js             # localStorage evidence cache (the moat)
    state/
      preferences.js       # weights + presets, stored locally
    ui/
      html.js              # binds htm to React (no JSX build step)
      components.js        # presentational components (receipts, badges, sliders)
      app.js               # root: onboarding, search, live re-scoring
  test/
    scoringEngine.test.js  # the non-negotiable rules, as executable specs
    research.test.js       # OFF classification + override, on fixtures
```

### Why zero-build
The scoring logic is the asset, and it must drop into the native app **unchanged**
(§14). Keeping the engine a pure ES module (no bundler, no framework, no deps)
makes that lift trivial and lets the rules be tested with nothing but
`node --test`. The UI uses `htm` so React needs no JSX compile step.

## Deliberate non-goals (this MVP)
No crowd reviews, no star ratings, no "this brand is bad" claims, no native iOS,
no accounts. (§13)

## Notes / next steps
- **Web-search tier:** `researchAgent` exposes the seam for a serverless
  web-search step (brand site claims, certification registries, transparency
  indices). Today, attributes OFF can't cover are honestly marked inconclusive
  or carry a labelled prior — never fabricated.
- **LLM summary:** `buildSummary()` is deterministic so the app runs with no API
  key; swap in an LLM-written ≤2-sentence summary at that seam (§8 step 5).
- **More categories:** the engine is already category-agnostic; expand by adding
  classifiers + priors alongside `openFoodFacts.js` once the engine is trusted.

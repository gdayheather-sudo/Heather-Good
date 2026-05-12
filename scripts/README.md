# Test harness

Validates the Whisper → Claude SOP-structuring pipeline against real audio
recordings — before any capture UI exists.

## Setup

```bash
pnpm install
cp .env.example .env   # fill in OPENAI_API_KEY and ANTHROPIC_API_KEY
mkdir -p test-audio    # drop your recordings here (gitignored)
```

## Run

```bash
pnpm harness test-audio/my-recording.m4a
```

Outputs land in `test-output/`:

- `{name}.transcript.json` — full Whisper verbose_json response (segments + timing)
- `{name}.raw.txt` — Claude's raw output before JSON parsing
- `{name}.sop.json` — parsed, validated SOP object

The console prints the structured SOP plus an estimated cost. Target: $0.02–0.10
per SOP. If a run sits well above that range, investigate before scaling.

## Test cases to record (per the build brief)

1. Clean recording — control (making coffee, locking up the office)
2. Rambling with tangents ("oh and also I should mention…")
3. Very short (10 sec) — should trigger the `insufficient_content` error
4. With explicit warnings ("be careful not to…")
5. With timing cues ("let it sit for 15 minutes")
6. Digital workflow (logging in, running a report)
7. Physical workflow (stocktake, cleaning)
8. Mid-stream self-corrections
9. Two distinct sub-processes in one recording
10. Noisy environment

## Iterating on the prompt

The system prompt is `lib/ai/prompt-sop-structuring.mjs` — the **only** copy.
Both this harness and the production app import it. Edit it there, re-run
the harness against your reference recordings, compare `*.sop.json` outputs.

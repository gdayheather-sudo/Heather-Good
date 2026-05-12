# Legacy: Etsy Social Pipeline

This directory holds the previous occupant of this repo — a multi-agent pipeline
that pulled Etsy listings, scored them, and generated social media content for
Pinterest and Instagram.

It is unrelated to the current Phase 1 product (Clarity SOP) and is kept here
purely for reference. Nothing in the live app reads from it.

To run it standalone:

```bash
cd legacy/etsy-pipeline
npm install
cp .env.example .env  # fill in keys
npm run dev
```

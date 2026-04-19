# The Clarity Hub — Website

Static site (HTML + CSS + a sprinkle of JS) for The Clarity Hub.

## Local preview

Just open `index.html` in a browser, or serve the folder:

```
npx serve clarity-hub-web
# or
python3 -m http.server -d clarity-hub-web 8000
```

## Assets

The site expects these files in `clarity-hub-web/public/`:

- `The Clarity Hub Logo.png` — used as favicon and header mark
- `wave.svg` — decorative element behind the hero

Copy your local `C:\Users\hcgoo\Heather-Good\clarity-hub-web\public\` contents
into this `public/` folder before deploying. The `LinkedIn N.jpg` files aren't
referenced by the site yet — they're available if we want to add a gallery
section later.

## Contact form (Formspree)

The form in `index.html` posts to:

```
https://formspree.io/f/YOUR_FORM_ID
```

Replace `YOUR_FORM_ID` with the ID from your Formspree dashboard
(e.g. `https://formspree.io/f/xpzgkqrn`). The hidden `_gotcha` field is a
honeypot that Formspree uses for spam filtering — leave it as-is.

## Deploy

Drop the `clarity-hub-web/` folder onto any static host:

- **Netlify** — drag the folder into the dashboard, or `netlify deploy`
- **Vercel** — `vercel` from inside the folder
- **GitHub Pages** — push to a `gh-pages` branch with the folder as root
- **Cloudflare Pages** — connect the repo, set build output to `clarity-hub-web`

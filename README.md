# sala.company store

The ebook store at https://sala.company (SALA CO, Kuwait, commercial license 502625), rebuilt off Shopify as one
Cloudflare Worker. Checkout asks only for a verified email and a name, payment goes through Tap, and ebooks are
delivered from a private bucket.

Status: **built and tested locally, not deployed yet.** See [docs/DEPLOY.md](docs/DEPLOY.md).

```bash
npm ci
npm test          # builds, then runs the Worker in wrangler dev against fake Tap + Resend (20 end-to-end checks)
npm run ui-check  # every page in Chromium: phone/desktop, light/dark, no sideways scroll, axe (WCAG AA)
npm run dev       # local store at http://localhost:8787 (needs .dev.vars with test keys)
```

## Layout

| Path | What |
|---|---|
| `catalog/` | Source of truth: `products.json` (prices in fils), `collections.json`, `articles.json`, `policies/`, `site.json` (business details, menu, announcements), `media/` (web-sized images and trailers) |
| `src/` | `style.css`, `app.js` (cart, checkout, order, downloads), GoatCounter snippet |
| `tools/build.mjs` | catalog → `public/` static pages (same URLs as Shopify), sitemap, Atom feed, CSP headers, redirects |
| `worker/` | API: email codes, checkout, Tap charges and webhook, signed downloads from R2. `schema.sql` / `migrations/` for D1 |
| `tools/test.mjs`, `tools/ui-check.mjs` | end-to-end and browser checks |
| `tools/upload-ebooks.mjs` | upload ebook files to the private bucket |
| `tools/media.mjs` | make web-sized images and trailers (ffmpeg) |
| `tools/snapshot.py`, `tools/import-shopify.mjs`, `shopify-export/` | the one-time pull from the old Shopify store |

## Docs

- [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md): what the store must do (Ministry of Commerce details, Tap, email-only checkout).
- [docs/DEPLOY.md](docs/DEPLOY.md): Cloudflare setup, test purchases, cutover, day-to-day.
- [docs/SHOPIFY-AUDIT.md](docs/SHOPIFY-AUDIT.md): how the old Shopify store was built.
- [docs/NEED-FROM-SHOPIFY.md](docs/NEED-FROM-SHOPIFY.md): open items.

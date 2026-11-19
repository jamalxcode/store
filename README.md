# sala.company store

The ebook store of SALA CO (Kuwait, commercial register 502625, licence 2024/16512), moved off Shopify onto one Cloudflare Worker.
Checkout asks only for a confirmed email and a name, payment goes through Tap, and ebooks are delivered from a
private bucket.

**Status:** live for testing at https://sala-store.jamal-akuna-matata.workers.dev. https://sala.company is still
Shopify until cutover. All 17 ebooks and the bundle are loaded (EPUB, PDF, Mobi). Waiting only for Tap's API keys. See [docs/TODO.md](docs/TODO.md).

## How it works

1. A shopper browses static pages: products, collections, blog and policies, at the same URLs as on Shopify.
2. At checkout they type their email, get a 6-digit code by email (Resend), then enter their name and accept the terms.
3. Paid items: the Worker creates a Tap charge, and the shopper pays on Tap's page (KNET, card, Apple Pay).
   Free items skip this step.
4. The Worker asks Tap whether the charge is `CAPTURED` with the right amount. Only then is the order marked paid.
5. The buyer gets a receipt with download links (7 days, 20 downloads per file), and the owner gets an order alert.
   "My downloads" gives fresh links anytime.

The full rules are in [docs/BUSINESS-RULES.md](docs/BUSINESS-RULES.md).

## Commands (Node 22)

```bash
npm ci
npm test            # build + 23 end-to-end checks: real Worker in wrangler dev, fake Tap and Resend
npm run ui-check    # every page in Chromium: phone/desktop, light/dark, sideways scroll, axe (WCAG AA)
npm run dev         # local store at http://localhost:8787 (put test keys in .dev.vars)
npm run media       # web-sized images and trailers after adding a product image or video (needs ffmpeg)
npm run upload-ebooks -- ./ebooks   # upload ebook files to the private bucket
```

Deploys happen automatically on GitHub after tests pass on `main`, or by hand via Actions → Deploy → Run workflow.

## Layout

| Path | What |
|---|---|
| `catalog/` | Source of truth: `products.json` (prices in fils), `collections.json`, `articles.json`, `policies/`, `site.json` (business details, menu, announcements), `media/` |
| `src/` | `style.css`, `app.js` (cart, checkout, order, downloads), GoatCounter snippet |
| `worker/` | API: email codes, checkout, Tap, webhook, signed downloads. `migrations/` for D1 |
| `tools/` | `build.mjs` (pages), `test.mjs`, `ui-check.mjs`, `media.mjs`, `upload-ebooks.mjs`, `snapshot.py` + `import-shopify.mjs` (Shopify pull) |
| `shopify-export/` | Frozen public snapshot of the old Shopify store |
| `wrangler.jsonc` | Worker config: static assets, D1 `store`, R2 `sala-ebooks` |

## Services

| Service | Used for | Where the key lives |
|---|---|---|
| Cloudflare | Worker, D1, R2 | GitHub secret `CLOUDFLARE_API_TOKEN` |
| Tap | payments | Worker secret `TAP_SECRET_KEY` (pending) |
| Resend | code and receipt emails from `orders@sala.company` | Worker secret `RESEND_API_KEY` |
| GoatCounter | analytics (shared sala.company dashboard) | none |

## Docs

- [docs/TODO.md](docs/TODO.md): what's left, and who does it.
- [docs/BUSINESS-RULES.md](docs/BUSINESS-RULES.md): every rule the store enforces.
- [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md): what the owner asked for (Ministry of Commerce, Tap, email-only checkout).
- [docs/DEPLOY.md](docs/DEPLOY.md): Cloudflare setup, test purchases, cutover, day-to-day.
- [docs/compliance/AUDIT.md](docs/compliance/AUDIT.md): Kuwait MOCI website checklist, control by control (checklist in the same folder).
- [docs/LESSONS.md](docs/LESSONS.md): gotchas found along the way.
- [docs/SHOPIFY-AUDIT.md](docs/SHOPIFY-AUDIT.md): how the old Shopify store was built.
- [CHANGELOG.md](CHANGELOG.md)

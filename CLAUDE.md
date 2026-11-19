# CLAUDE.md

The sala.company ebook store, rebuilt off Shopify as one Cloudflare Worker: static pages plus a small API, with D1 and a private R2 bucket.

Read before working:
- `docs/REQUIREMENTS.md`: must-haves. Kuwait Ministry of Commerce details (trade name, CR 502625, address) on every
  page and in receipts; Tap payments, confirmed server-side only; checkout asks for a verified email and a name, never a postal address.
- `docs/DEPLOY.md`: setup, cutover and operations.
- `docs/compliance/AUDIT.md`: Kuwait MOCI checklist status. Company identity comes only from `catalog/site.json` → `business` via `src/identity.js`; never hard-code it.
- `docs/BUSINESS-RULES.md`: every enforced rule. Update it in the same change as the code.
- `docs/LESSONS.md`: gotchas (deploy from the session fails at asset upload; use the GitHub Deploy workflow).
- `docs/TODO.md`: open items and who owns them. Add a `CHANGELOG.md` entry for user-visible changes.

Commands (Node 22): `npm ci`, `npm test` (build + 23 end-to-end checks in wrangler dev against fake Tap/Resend),
`npm run ui-check` (Chromium + axe, phone, tablet and desktop, light and dark), `npm run dev`, `npm run deploy`.

Rules:
- `catalog/` is the source of truth. Prices are integer **fils** (4.000 KWD = 4000) and show with 3 decimals.
  `shopify-export/` is the frozen Shopify pull, so don't edit it. `public/` is build output (gitignored).
- Keep Shopify URL paths (`/products/<handle>`, `/collections/<handle>`, `/blogs/news/<handle>`, `/policies/<name>`).
  Old paths go in the `_redirects` block of `tools/build.mjs`.
- Policies are bilingual EN/AR (from Shopify, owner-approved edits on 18 Nov 2026). Change them only when the owner asks, in both languages.
- An order is paid only when `GET /v2/charges/{id}` at Tap says CAPTURED with a matching amount, currency and order id.
  Never trust the redirect or the webhook body. Fulfilment is idempotent (`UPDATE ... WHERE status != 'paid'`).
- Ebook files live only in R2 under `ebooks/<handle>/`. Never in git, never public. A product with no file can't be sold.
- Never commit secrets (Tap, Resend, `SIGNING_SECRET`) or customer and order data.
- Inline scripts are allowed by CSP hash (computed in `tools/build.mjs`). Keep the GoatCounter snippet in
  `src/goatcounter.html` verbatim (endpoint `https://salacompany.goatcounter.com/count`).
- WCAG AA in light and dark mode, no sideways scroll on phones (`npm run ui-check` enforces both). Asset URLs carry content hashes.
- Add a test to `tools/test.mjs` for any change to payment, verification or download behaviour.

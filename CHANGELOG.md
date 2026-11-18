# Changelog

## 2026-11-18 (later)

### Added: Kuwait MOCI website checklist
- The owner's checklist is saved in `docs/compliance/`, and the store has been audited control by control (`docs/compliance/AUDIT.md`).
- Arabic-first company identity block in every footer and email (`src/identity.js`), with separate lines for the license and the CR number.
- Arabic information on every product page (title, description, price in د.ك, delivery, payment, returns).
- Arabic/English e-invoice for every paid order (`/invoice`), linked from the receipt email, order page and My downloads.
- Contact and complaints page with a reference number, owner alert, D1 storage (migration `0002_complaints`) and escalation to MOCI (135).
- Checkout shows the final total, delivery, returns and invoice note before payment. Terms agreement in Arabic as well.
- Receipt and code emails are now bilingual, Arabic first.
- 3 new end-to-end tests (23 total); the browser check now covers 17 pages.

### Company register details
- From the commercial register extract: CR **502625** (23/05/2024), licence **2024/16512** (freelance business licence), legal form **شركة الشخص الواحد**, capital **1000 KWD**. All are in the identity block on every page, email and invoice (capital on invoices). Earlier versions called 502625 the licence number, which was wrong. The documents themselves aren't stored in the repo, which is public.

### Owner answers applied
- Phone **+965 41030312** and capital **1000 KWD fully paid** on every footer, invoice and email.
- Policies updated with approval: the privacy policy now matches the new store (no address; Tap, Cloudflare, Resend, GoatCounter; Shopify removed). CR and licence numbers corrected in all policies. Contact information gains legal form, capital, phone and complaints.
- Refund policy and Arabic product texts kept as is. Newsletter, search and orders page not wanted for now. Cutover tentatively about 2 December 2026.

### Still open
- Confirm that licensed activity 620200 covers ebook sales (MOCI).
- Tap test key in Cloudflare; ebook files pulled from Shopify.
- Privacy policy update (draft waiting for approval).

## 2026-11-18 (earlier)

### Live (test address)
- The store runs at **https://sala-store.jamal-akuna-matata.workers.dev** on Cloudflare. GitHub deploys it after tests pass on `main`. sala.company is still on Shopify.
- Resend email set up: `sala.company` verified (Ireland, auto-configured on GoDaddy). The test code email reached the inbox.
- Cloudflare: D1 database `store`, private R2 bucket `sala-ebooks` (Eastern Europe), Worker `sala-store` with `SIGNING_SECRET` and `RESEND_API_KEY`.
- Waiting for: Tap API keys (requested from Tap support), the ebook files, and the Ministry of Commerce conditions list.

### Changed
- Ebook bucket renamed from `sala-store-files` to `sala-ebooks`, so it could live in Eastern Europe. The old name was locked to North America.
- Deploys go through GitHub Actions, because `wrangler deploy` can't upload assets from the cloud session. Only the `CLOUDFLARE_API_TOKEN` repository secret is needed.
- `SITE_URL` is unset until cutover, so emails and Tap redirects use whichever address the store is reached at.

### Added
- **The store**, built as one Cloudflare Worker:
  - Static storefront generated from `catalog/` (20 products, 4 collections, 11 blog posts, 5 bilingual policies) at the same URLs as Shopify. Old Shopify links redirect.
  - Brand design from the logo (yellow, magenta, purple), light and dark mode, phone layout, video trailers, Atom feed, sitemap, structured data, strict CSP.
  - Checkout with only a confirmed email, a name and agreement to the terms. No address.
  - Tap charges confirmed by asking Tap directly. Fulfilment happens once.
  - Receipt emails with download links and the Ministry of Commerce details, plus an owner alert for each order.
  - Signed, expiring (7 days), counted (20 per file) downloads from a private R2 bucket.
  - "My downloads" page in place of customer accounts.
  - Rate limits, an audit log and 5-year order records in D1.
- Tests: 20 end-to-end checks running the real Worker against fake Tap and Resend (`npm test`), plus a browser check of 15 pages × phone/desktop × light/dark with axe (`npm run ui-check`). Both run on GitHub.
- Tools: `snapshot.py` (public Shopify pull), `import-shopify.mjs`, `media.mjs` (web-sized images and trailers), `upload-ebooks.mjs`, `build.mjs`.
- Docs: requirements, Shopify audit, deploy guide, business rules, lessons learned, to-do list.

### Research
- Audited the Shopify store: Dawn 15.2.0 theme, KWD only, 20 digital products, Tap payments, Ministry of Commerce details in the policies and the welcome blog post. Saved a public snapshot in `shopify-export/`.

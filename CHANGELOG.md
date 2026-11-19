# Changelog

Newest first. Test address: https://sala-store.jamal-akuna-matata.workers.dev (sala.company is still on Shopify).

## 2026-11-19

### Ebooks loaded
- All **17 ebooks** are in the private bucket `sala-ebooks`, each as **EPUB, PDF (5x8) and Mobi (Kindle)**: 51 files, 1.2 GB. They come from the owner's Draft2Digital account. Before going live, each file's title was checked against its book (EPUB `<dc:title>` or the PDF's first page), and each file was named after its book (e.g. `The Nadia Upgrade.epub`).
- **18 products are on sale**: 17 ebooks plus the AI Revolution Collection bundle, which delivers 9 files.
- Product pages list the formats: "EPUB, PDF and Mobi (Kindle)", in Arabic too.
- The owner bulk-uploaded through the Cloudflare dashboard. Claude sorted the files into `ebooks/<handle>/` and deleted the loose copies.

### Changed
- New `hidden` flag in `catalog/products.json`. A hidden product has no page, listing or sitemap entry, and its URL redirects to `/collections/all`.
- **Fun Kuwait font** and **Super Coder source code** are hidden until their files exist (owner decision).
- Home page: the "Get the free font" button is now "Children's books", and the free-font announcement is removed.

### Status
- The store is complete except for payments: **waiting on Tap support for API keys**.

## 2026-11-18 (evening): Kuwait Ministry of Commerce checklist

### Added
- The owner's MOCI website checklist (`docs/compliance/KUWAIT-WEBSITE-CHECKLIST.md`) and a control-by-control audit (`docs/compliance/AUDIT.md`).
- An Arabic-first **company identity block** in every page footer, email and invoice (`src/identity.js`, data in `catalog/site.json`).
- **Arabic product information** on every product page: title, description, price in د.ك, formats, delivery, payment, returns.
- An **Arabic/English e-invoice** for every paid order (`/invoice`), linked from the receipt email, the order page and My downloads, and printable.
- A **contact and complaints page** (`/complaints`): reference number by email, owner alert, stored in D1 (migration `0002_complaints`), escalation to MOCI (online service, phone 135).
- Checkout shows, before payment: the final total, delivery, returns and an invoice note. The terms agreement is in Arabic too.
- Code and receipt emails are bilingual, Arabic first.
- End-to-end tests went from 20 to 23.

### Company details (from the official register extract)
- Commercial register **502625** (23/05/2024), licence **2024/16512** (freelance business licence), **Single Person Company**, capital **1,000 KWD fully paid**, activity **620200**, phone **+965 41030312**.
- Earlier text, including the Shopify policies, called 502625 the "commercial license". It's the register number, and this is now corrected everywhere.
- The register documents aren't stored in the repo, which is public. One of them holds personal data.

### Policies (owner-approved edits)
- **Privacy policy**: rewritten sections 1 and 3 (EN and AR) to match the new store. It now lists name, email and IP; no address; Tap, Cloudflare, Resend and GoatCounter. Shopify is removed. Marked "updated 18 November 2026".
- **Contact information**: adds legal form, CR, licence, capital, phone and the complaints link.
- **Refund policy**: register and licence numbers corrected. The wording is otherwise unchanged (owner decision).

## 2026-11-18 (afternoon): test store live

- Deployed to Cloudflare: Worker `sala-store`, D1 database `store`, R2 bucket `sala-ebooks` (Eastern Europe).
- Deploys run through GitHub Actions (Test, then Deploy), because `wrangler deploy` can't upload assets from the cloud session.
- **Resend** set up: `sala.company` verified (Ireland region, records auto-added on GoDaddy). Code emails reach the Gmail inbox.
- The ebook bucket was renamed from `sala-store-files` to `sala-ebooks`, because a deleted bucket's name keeps its old region.
- `SITE_URL` stays unset until cutover, so links follow whichever address the store is reached at.
- Tap API keys requested from Tap support.

## 2026-11-18 (morning): store built

### Added
- **The store**, built as one Cloudflare Worker:
  - Static pages generated from `catalog/` (products, collections, 11 blog posts, 5 bilingual policies) at the same URLs as Shopify. Old Shopify links redirect.
  - Brand design from the logo (yellow, magenta, purple), light and dark mode, phone layout, video trailers (re-encoded from about 33 MB to about 10 MB), Atom feed, sitemap, structured data, strict CSP.
  - **Checkout**: a confirmed email (6-digit code), a name and agreement to the terms. No address and no account.
  - **Tap** charges are only marked paid when Tap itself confirms `CAPTURED` with the matching amount, currency and order id. Fulfilment happens once.
  - Receipt emails with download links, and an owner alert for each order.
  - Signed, expiring (7 days), counted (20 per file) downloads from the private R2 bucket.
  - **My downloads** replaces customer accounts.
  - Rate limits, an audit log and 5-year order records in D1.
- Tests: end-to-end checks of the real Worker against fake Tap and Resend (`npm test`), and a browser check of every page × phone/desktop × light/dark with axe (`npm run ui-check`). Both run on GitHub.
- Tools: `snapshot.py`, `import-shopify.mjs`, `media.mjs`, `upload-ebooks.mjs`, `build.mjs`.

### Research
- Audited the Shopify store: Dawn 15.2.0 theme, KWD only, 20 digital products, Tap payments, Ministry of Commerce details in the policies. Saved a public snapshot in `shopify-export/`.

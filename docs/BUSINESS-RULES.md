# Business rules

Every rule the store enforces, and where it lives. Keep this in sync with the code. If code and this file disagree,
fix one of them in the same change.

## Products and prices

- Every product is digital: ebooks, a font and source code. There's no shipping and nothing physical.
- Prices are in **Kuwaiti dinar (KWD)** only, stored as integer **fils** (`price_fils`; 4.000 KWD = `4000`) and always shown with 3 decimals (`4.000 KWD`). A price of 0 shows as "Free". (`catalog/products.json`, `money()` in `src/app.js`, `tools/build.mjs` and `worker/email.js`)
- The price charged is always computed **on the server** from `catalog/products.json`. Anything the browser sends about price is ignored. (`checkout()` in `worker/index.js`)
- A **bundle** (`includes: [...]`) is sold at its own price and delivers the files of every included product, plus any files in its own folder. Today the only bundle is AI Revolution Collection (24.000 KWD): Productivity Handbook + Art in the Age of AI + Super Coder.
- **Free products** (Fun Kuwait font, Super Coder source code) go through the same checkout, minus payment: the email must still be confirmed.
- A product is **sellable only when its file exists** in the private bucket under `ebooks/<handle>/`. Products without one show "Coming soon", and checkout refuses them with a 409. A bundle is sellable when all its parts are. (`listFiles()`, `availableHandles()`, `/api/stock`)

## Checkout: email only

- Checkout asks for **email** (confirmed with a code), **name** (Tap requires `customer.first_name`) and **agreement to the terms and refund policy**. **No postal address, phone or account.**
- Up to 30 items per order, no duplicates. Unknown handles are rejected.
- Agreement is recorded per order (`terms_accepted_at`).
- Emails are lowercased and trimmed; names are trimmed and limited to 80 characters.

## Email confirmation

| Rule | Value |
|---|---|
| Code | 6 random digits, emailed via Resend |
| Code lifetime | 10 minutes; a new request replaces the old code |
| Wrong attempts | 5 per code, then a new code is needed |
| Code requests | 5 per email per hour, 20 per IP per hour |
| Storage | only a salted SHA-256 hash of the code is kept |
| After confirming | a signed token valid for **2 hours**, held in the browser session |
| Checkouts | 20 per email per hour |

(`verifyStart()`, `verifyCheck()`, `limit()` in `worker/index.js`)

## Payment (Tap)

- Paid orders create a Tap charge (`POST /v2/charges`) in KWD with `source.id = src_all`. The buyer pays on Tap's hosted page (KNET, cards, Apple Pay); card data never touches the store.
- The charge carries the order id in `metadata.order_id` and `reference.order`. It includes no address. Tap's own receipts are turned off, because the store sends its own.
- **An order becomes paid only when the store asks Tap** (`GET /v2/charges/{id}` with the secret key) and Tap answers `CAPTURED` **with the same amount, currency (KWD) and order id**. The browser redirect and the webhook body are never trusted on their own; they only prompt that check.
- A mismatch (wrong amount, currency or order id) never fulfils, and is logged as `tap_mismatch`.
- These Tap statuses mark an order **failed**: FAILED, DECLINED, CANCELLED, RESTRICTED, VOID, TIMEDOUT, ABANDONED, REVERSED. Any other status leaves it pending.
- If Tap can't create a charge, the order is marked failed and the buyer sees "You haven't been charged".
- Fulfilment happens **exactly once** (`UPDATE ... WHERE status != 'paid'`), however many webhooks or page refreshes arrive.

Order statuses: `pending` (charge created, waiting for Tap) → `paid` or `failed`. Free orders go straight to `paid`.

## Delivery

- When an order is paid, the buyer gets an email with a receipt and download links, and the owner (`OWNER_EMAIL`) gets an order alert.
- The order page (`/order?id=…&t=…`) shows the same links. It's protected by a signed token in the link.
- **Download links** are signed (HMAC), tied to one order and one file, and expire after **7 days** (`download_days`).
- Each file can be downloaded **20 times per order** (`max_downloads`). After that the buyer has to email the store.
- **My downloads** (`/downloads`): confirming the email again lists every paid order for that address, with fresh links. This replaces Shopify customer accounts.
- Files are sent as attachments with `Cache-Control: private, no-store` and `X-Robots-Tag: noindex`.
- Ebook files live **only** in the private R2 bucket `sala-ebooks` (Eastern Europe). It has no public access, and the files are never in git.

## Kuwait Ministry of Commerce

The full control-by-control audit is in [compliance/AUDIT.md](compliance/AUDIT.md), against the owner's checklist [compliance/KUWAIT-WEBSITE-CHECKLIST.md](compliance/KUWAIT-WEBSITE-CHECKLIST.md).

- **Identity block** (Arabic first, then English), built by `src/identity.js` from `catalog/site.json` → `business`: trade name (+ legal form), commercial register no., commercial license no. and date, address, phone and email. It's shown in every page footer, in every email, and (with capital and paid-up) on every invoice. Fields the owner hasn't confirmed (`null`) are hidden, never shown as placeholders. Pending: CR number, legal form, phone, capital.
- **Arabic product information**: every product has `title_ar`, `summary_ar` and `kind_ar`. Product pages show them with the price in د.ك, delivery timing, payment methods and the returns link.
- **Invoice**: every paid order has an Arabic-first bilingual e-invoice at `/invoice?id=…&t=…`. It's linked from the receipt email, the order page and My downloads, is printable, and states "electronic invoice, no signature required".
- **Before payment**, checkout shows: final total, no fees or shipping, instant delivery, returns link, payment methods, and bilingual agreement to the terms.
- **Complaints**: `/complaints` form → reference `C-XXXXXXXX` emailed to the customer, complaint emailed to the owner (reply-to the customer), stored in D1 table `complaints` (kept ≥ 6 months, never auto-deleted). Promise: reply within 2 business days, resolve within 7 (`site.json` → `complaints`). The page shows escalation to MOCI (online service, phone 135). Limits: 5 per IP and 5 per email per hour.

- The five policies (privacy, refund, shipping/digital delivery, terms, contact information) were carried over from Shopify, bilingual, at `/policies/<name>`. On 18 Nov 2026, with the owner's approval, the privacy policy was updated (no address, real providers), the licence/CR numbers corrected, and phone, capital and complaints added to the contact information. They change only when the owner asks.
- Orders, including email, name, items, amount, Tap charge id and timestamps, are kept for **at least 5 years**, as the privacy policy states, citing the Digital Commerce Law. Every state change is logged in `events`.
- Refunds follow the refund policy: no returns once a file is accessed, except corrupt or undelivered files, misdescription, or a technical error reported within 7 days. Refunds are issued by hand in the Tap dashboard.

## Site

- URLs match Shopify's (`/products/<handle>`, `/collections/<handle>`, `/collections/all`, `/blogs/news/<handle>`, `/policies/<name>`). Old Shopify-only paths redirect (`_redirects` in `tools/build.mjs`).
- Every page meets WCAG AA contrast in light and dark mode, with no sideways scrolling on phones. `npm run ui-check` enforces both.
- Browser API calls are refused from other sites (Origin check). The Tap webhook is exempt.
- Content Security Policy: scripts only from the site itself, GoatCounter, and the two inline scripts allowed by hash.
- Analytics: the shared sala.company GoatCounter, plus events `cart-add-*`, `buy-now-*`, `checkout-pay`, `checkout-free` and `order-paid`.

# Requirements for the rebuilt store

Things the new store must do, collected from the audit and from the owner. Keep this in sync as decisions are made.

## 1. Kuwait Ministry of Commerce compliance

The Shopify store shows these details to meet Ministry of Commerce (MOCI) e-commerce conditions. The new site must
show them **at least as visibly** (on every page in the footer, plus a dedicated contact page), in English and Arabic:

| Field | English | العربية |
|---|---|---|
| Trade name | SALA CO FOR COMPUTER CONSULTING AND FACILITIES MANAGEMENT ACTIVITIES | شركة سلة لأنشطة الخبرة الاستشارية الحاسوبية وإدارة المرافق الحاسوبية |
| Commercial license | 502625 (issued 23/05/2024) | الرخصة التجارية: 502625 (بتاريخ: 23/05/2024) |
| Address | PO Box 306, code 48154, Al-Salam, Kuwait | صندوق بريد 306، الرمز البريدي 48154، السالم، الكويت |
| Email | basketservicesllc@gmail.com | |
| Website / portal | sala.company / go.sala.company | |

Where it appears today:
- `/policies/contact-information` (bilingual)
- Every policy names the seller and license number at the top
- Blog post `/blogs/news/welcome-to-sala-company` (PO Box and license). The owner says other required statements were also added as blog posts.
- Laws the policies cite: Consumer Protection Law No. 39/2014, the Digital Commerce Law (2025), Electronic Transactions
  Law No. 20/2014 and Data Privacy Protection Regulation (DPPR) No. 26/2024. That includes 5-year data retention, a
  technical-error cancellation right within 7 days, and no returns on digital content once accessed.

Rules for the rebuild:
- Carry the five policy pages over **word for word** (source: `shopify-export/policies/*.md`), at the same URLs
  (`/policies/<name>`) so links already registered or printed elsewhere still work.
- Keep the compliance blog posts at the same URLs (`/blogs/news/<handle>`).
- The privacy policy currently says it collects a **billing address**. Update that sentence when checkout drops it (section 3).
- Done in the rebuild: every page footer and every receipt email shows the trade name, license and address in English and Arabic.
- Before cutover, ask the owner for the full list of MOCI conditions (e.g. whether the license must be on the home page
  or the checkout page, and whether a MOCI/"Maroof"-style badge or link is needed) and add it here.

## 2. Payments: Tap (tap.company)

- Tap is the gateway today, through Shopify. The new site will call Tap directly:
  - Create a charge server-side (Tap Charges API, `POST /v2/charges`) in KWD (3 decimals), with
    `source.id = src_all` (or `src_kw.knet` for KNET only). Use `redirect.url` back to the site and `post.url` for the webhook.
  - Redirect the buyer to Tap's hosted payment page. KNET, cards and Apple Pay are handled there, so card data never touches our code.
  - Mark an order paid **only** after the webhook or a server-side `GET /v2/charges/{id}` returns `CAPTURED`, never from the redirect alone.
  - Verify the webhook `hashstring` signature.
- Tap needs `customer.first_name` and an email or phone. No postal address is needed.
- Secrets: the Tap secret key stays server-side only. The publishable key is only needed if we embed Tap's card SDK instead of redirecting.
- To be confirmed with the owner: the Tap account type (direct merchant or Shopify plugin), which payment methods are on, and whether test keys exist.

## 3. Checkout: email only, verified (owner's main complaint)

The Shopify checkout asks for a full postal address even though every product has `requires_shipping: false`. For an
ebook store that's friction. The new checkout must ask for:

1. **Email** (required), verified **before** payment with a 6-digit code or magic link sent to that address, so the
   download is sure to reach the buyer. The policies already promise "you will receive an email with a download link instantly".
2. **Name** (one field, required only because Tap needs `customer.first_name`).
3. Optional phone (Tap and KNET may prefill it).

No address, no account creation, no password. Free products (the Fun Kuwait font, Super Coder source code) skip payment
but still verify the email.

After payment:
- Send an email with signed, expiring download links (e.g. valid 7 days, a limited number of downloads), and show the
  same links on the confirmation page.
- "Resend my downloads": enter an email, get a code, see all past purchases. This replaces Shopify customer accounts.
- Keep an order record (order id, email, items, amount, Tap charge id, timestamps) for **5 years** (privacy policy and Digital Commerce Law).

## 4. Content and URLs to keep

- All 20 products, 4 collections, 11 blog posts and 5 policies (`shopify-export/`).
- Keep URL paths for SEO and old links: `/products/<handle>`, `/collections/<handle>`, `/collections/all`,
  `/blogs/news`, `/blogs/news/<handle>`, `/policies/<name>`, `/cart`.
- Video trailers on the two sci-fi books (about 33 MB MP4s each; consider hosting them as YouTube or a lighter encode).
- Header links to `ai.sala.company`, `tetris.sala.company`, `galacticdefender.sala.company` and the `go.sala.company` portal.
- Prices in KWD with 3 decimals (`4.000 KWD`).
- Fix the typos in the current announcement bars ("Get or Free" → "Get our Free", "Galactice" → "Galactic").

## 5. House conventions (from the other sala.company sites)

- **Decided 2026-11-18: Cloudflare Workers, not GitHub Pages.** One Worker serves the static pages and the API on the
  same origin, with D1 for orders and private R2 for ebooks. GitHub Pages can't hold secrets or run the payment flow.
- Shared GoatCounter snippet (endpoint `https://salacompany.goatcounter.com/count`), copied verbatim from the other sala.company repos.
- WCAG AA contrast in light and dark mode, and no sideways scrolling on phones.

## 6. Cutover

`sala.company` (apex) points at Shopify today. When the new site is ready: export the ebook files, check that test
purchases work end to end with Tap test keys, then switch DNS, and keep Shopify for a short overlap so in-flight downloads still work.

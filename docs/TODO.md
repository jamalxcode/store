# To do

Status on 2026-11-18: the test store is live at https://sala-store.jamal-akuna-matata.workers.dev, deployed by
GitHub (Actions → Deploy). sala.company still runs on Shopify.

## Owner (needs you)

1. [x] **Resend** (done 2026-11-18, region Ireland, auto-configured on GoDaddy): sign up, add the domain `sala.company`, send the DNS records it shows, and say where the domain is registered.
2. [x] **Resend key**: paste it into Cloudflare → Workers & Pages → sala-store → Settings → Variables and Secrets, as secret `RESEND_API_KEY`.
3. [ ] **Tap test key** (`sk_test_…`): add it in the same place as secret `TAP_SECRET_KEY`.
4. [ ] **Ebook files**: 19 products need one (the bundle uses its books' files). Upload them to R2 `sala-ebooks` under `ebooks/<handle>/`, or send them to Claude.
5. [x] **Ministry of Commerce checklist** received (`docs/compliance/KUWAIT-WEBSITE-CHECKLIST.md`). Audit: `docs/compliance/AUDIT.md`.
5a. [ ] **Commercial register (CR) number**: required on the site in Arabic (fine KD 1,000–5,000 if missing).
5b. [ ] **Legal form** (e.g. شركة الشخص الواحد), **capital and paid-up amount**: for invoices.
5c. [ ] **Business phone** (monitored): for invoices and the contact page.
5d. [ ] Confirm the licensed activities cover selling digital products (licence and CR extract).
6. [ ] **Tap details**: direct Tap merchant account or Shopify plugin only? Which payment methods are on (KNET, cards, Apple Pay)?
7. [ ] **Privacy policy**: approve the draft in `docs/compliance/AUDIT.md` (drops "billing address" and Shopify; adds IP, Tap, Cloudflare, Resend, GoatCounter). This is a failing check (CX-06).
7a. [ ] Optional: have counsel confirm the refund-policy wording for digital content (CX-03) and the Arabic product texts.
8. [ ] Optional: Shopify orders and customers export, so past buyers can download again and the newsletter list carries over.
9. [ ] Pick a cutover date.

## Claude (after the owner items above)

10. [x] Point the Resend DNS records at the domain and check that code emails arrive (after 1–2). Verified: the code email reached the Gmail inbox, not spam.
11. [ ] Real test purchase with a Tap test card: paid, declined, then the webhook. Check the real Tap API matches the code (after 3).
12. [x] Ebook bucket is now `sala-ebooks` in Eastern Europe. A deleted bucket's name keeps its old region, so it got a new name.
13. [ ] Upload the ebooks, then check each product's download (after 4).
14. [x] Checklist applied: Arabic identity footer, Arabic product info, Arabic/English e-invoice, complaints page with MOCI escalation, pre-payment disclosures. The rest waits on 5a–5d and 7.
15. [ ] Build the newsletter signup and search. Shopify had both; not built yet.
16. [ ] Optional: a simple owner page listing orders (today it's `wrangler d1 execute`, see DEPLOY.md).
17. [ ] Cutover: DNS to Cloudflare, add the custom domain and `SITE_URL`, switch to Tap live keys, set the Tap webhook URL, remove the domain from Shopify.

## Dropped from Shopify (decide if needed)

- Customer accounts with passwords (replaced by the email code and My downloads).
- AI shopping agent endpoints (`agents.md`, UCP/MCP).
- Shop Pay and the country/currency selector (KWD only, as before).

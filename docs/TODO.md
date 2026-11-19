# To do

Status on **19 November 2026**: the store is complete apart from payments. It's live for testing at
https://sala-store.jamal-akuna-matata.workers.dev and deployed by GitHub (Actions → Test → Deploy). sala.company still
runs on Shopify. Cutover is planned for **about 2 December 2026** (tentative).

## Open

### Owner
1. [ ] **Tap API keys.** Waiting on Tap support (emailed 18 Nov). When they arrive, add the test secret key (`sk_test_…`) in Cloudflare → Workers & Pages → sala-store → Settings → Variables and Secrets → Production, as secret `TAP_SECRET_KEY`.
2. [ ] **Tap details.** Which payment methods are on (KNET, Visa/Mastercard, Apple Pay)? Is the money paid into the company bank account?
3. [ ] **Licensed activity.** The licence has only **620200** (computer consulting and facilities management). Ask MOCI whether that covers selling ebooks online, or add a digital-content / e-commerce activity.
4. [ ] **Social profiles** (freelance licence rule). Add "شركة سلة لأنشطة الخبرة الاستشارية الحاسوبية | س.ت 502625" to every social profile bio. List sala.company, go.sala.company and the social accounts in the annual MOCI update.
5. [ ] Optional: a Shopify orders and customers export, so past buyers can download again and the email list carries over. Keep it private and out of git.
6. [ ] Optional: the Fun Kuwait font file and the Super Coder source-code `.zip`. Both products are hidden until then.

### Claude
7. [ ] **First real test purchase** with Tap test keys (after 1). Run the checklist in `docs/DEPLOY.md`: paid, declined, webhook, email, downloads in all three formats, invoice. Fix anything where the real Tap API differs from the fake one used in tests.
8. [ ] **Cutover** (after 7, about 2 Dec). Follow `docs/DEPLOY.md` → "Cutover from Shopify": move DNS to Cloudflare (keep the Resend records), add the custom domain and `SITE_URL`, switch to the Tap live key, set the Tap webhook URL, remove the domain from Shopify.

## Done

- [x] Shopify audit and public snapshot (18 Nov).
- [x] Store built as a Cloudflare Worker, with tests (18 Nov).
- [x] Cloudflare set up: Worker, D1 `store`, R2 `sala-ebooks` in Eastern Europe, GitHub deploy secret (18 Nov).
- [x] Resend: domain verified (Ireland, auto-configured on GoDaddy), key in Cloudflare, test email reached the inbox (18 Nov).
- [x] MOCI checklist applied: identity block, Arabic product info, e-invoice, complaints page, pre-payment disclosures (18 Nov).
- [x] Company details from the register extract: CR 502625, licence 2024/16512, Single Person Company, capital 1,000 KWD paid, phone +965 41030312 (18 Nov).
- [x] Policies updated with approval: privacy rewritten, numbers corrected, contact information completed (18 Nov).
- [x] All 17 ebooks uploaded as EPUB, PDF and Mobi (51 files), titles checked, loose copies deleted (19 Nov).
- [x] Free font and source code hidden (19 Nov).

## Decided not to do (for now)

- Newsletter signup, site search, an owner orders page (owner, 18 Nov). Orders are viewable with the `wrangler d1` commands in `docs/DEPLOY.md`.
- Refund-policy legal review and a review of the Arabic product texts (owner: keep as is).
- Customer accounts with passwords (replaced by the email code and My downloads).
- Shopify's AI shopping-agent endpoints (`agents.md`, UCP/MCP), Shop Pay, the country/currency selector (KWD only, as before).

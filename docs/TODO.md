# To do

Status on 2026-11-18: the test store is live at https://sala-store.jamal-akuna-matata.workers.dev, deployed by
GitHub (Actions → Deploy). sala.company still runs on Shopify.

## Owner (needs you)

1. [x] **Resend** (done 2026-11-18, region Ireland, auto-configured on GoDaddy): sign up, add the domain `sala.company`, send the DNS records it shows, and say where the domain is registered.
2. [x] **Resend key**: paste it into Cloudflare → Workers & Pages → sala-store → Settings → Variables and Secrets, as secret `RESEND_API_KEY`.
3. [ ] Tap support replied (18 Nov). **Tap test key** (`sk_test_…`): add it in the same place as secret `TAP_SECRET_KEY`.
4. [ ] **Ebook files** are only in Shopify. The owner will give Shopify admin access so Claude can pull them. Then: 19 products need one (the bundle uses its books' files). Upload them to R2 `sala-ebooks` under `ebooks/<handle>/`, or send them to Claude.
5. [x] **Ministry of Commerce checklist** received (`docs/compliance/KUWAIT-WEBSITE-CHECKLIST.md`). Audit: `docs/compliance/AUDIT.md`.
5a. [x] From the register extract: **CR 502625**, **licence 2024/16512**, شركة الشخص الواحد, capital 1000 KWD, now shown everywhere.
5f. [ ] **Licensed activity is only 620200 (computer consulting).** Ask MOCI whether it covers selling ebooks online, or add a digital-content / e-commerce activity.
5g. [x] Policies corrected to CR 502625 / licence 2024/16512 (owner approved).
5b. [x] Capital 1000 KWD, fully paid: on invoices and the contact information page.
5c. [x] Business phone **+965 41030312**: in the footer, invoices, emails and contact pages.
5e. [ ] Freelance licence: add the company name and CR 502625 to every social profile bio, and list the sites in the annual MOCI update.
5d. [ ] Confirm the licensed activities cover selling digital products (licence and CR extract).
6. [ ] **Tap details**: direct Tap merchant account or Shopify plugin only? Which payment methods are on (KNET, cards, Apple Pay)?
7. [x] **Privacy policy** updated (owner approved). Was: approve the draft in `docs/compliance/AUDIT.md` (drops "billing address" and Shopify; adds IP, Tap, Cloudflare, Resend, GoatCounter). This is a failing check (CX-06).
7a. [x] Refund policy and Arabic product texts kept as is (owner decision).
8. [ ] Optional: Shopify orders and customers export, so past buyers can download again and the newsletter list carries over.
9. [ ] Cutover: **about 2 December 2026 (tentative)**, two weeks after 18 Nov, once the test purchase works.

## Claude (after the owner items above)

10. [x] Point the Resend DNS records at the domain and check that code emails arrive (after 1–2). Verified: the code email reached the Gmail inbox, not spam.
11. [ ] Real test purchase with a Tap test card: paid, declined, then the webhook. Check the real Tap API matches the code (after 3).
12. [x] Ebook bucket is now `sala-ebooks` in Eastern Europe. A deleted bucket's name keeps its old region, so it got a new name.
13. [ ] Upload the ebooks, then check each product's download (after 4).
14. [x] Checklist applied: Arabic identity footer, Arabic product info, Arabic/English e-invoice, complaints page with MOCI escalation, pre-payment disclosures. The rest waits on 5a–5d and 7.
15. [-] Newsletter, search and orders page: not wanted for now (owner, 18 Nov).
16. [-] Owner orders page: not wanted for now.
17. [ ] Cutover: DNS to Cloudflare, add the custom domain and `SITE_URL`, switch to Tap live keys, set the Tap webhook URL, remove the domain from Shopify.

## Dropped from Shopify (decide if needed)

- Customer accounts with passwords (replaced by the email code and My downloads).
- AI shopping agent endpoints (`agents.md`, UCP/MCP).
- Shop Pay and the country/currency selector (KWD only, as before).

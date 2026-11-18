# To do

Status on 2026-11-18: the test store is live at https://sala-store.jamal-akuna-matata.workers.dev, deployed by
GitHub (Actions → Deploy). sala.company still runs on Shopify.

## Owner (needs you)

1. [ ] **Resend**: sign up, add the domain `sala.company`, send the DNS records it shows, and say where the domain is registered.
2. [ ] **Resend key**: paste it into Cloudflare → Workers & Pages → sala-store → Settings → Variables and Secrets, as secret `RESEND_API_KEY`.
3. [ ] **Tap test key** (`sk_test_…`): add it in the same place as secret `TAP_SECRET_KEY`.
4. [ ] **Ebook files**: 19 products need one (the bundle uses its books' files). Upload them to R2 `sala-store-files` under `ebooks/<handle>/`, or send them to Claude.
5. [ ] **Ministry of Commerce**: the full list of conditions, plus links to any hidden compliance blog posts.
6. [ ] **Tap details**: direct Tap merchant account or Shopify plugin only? Which payment methods are on (KNET, cards, Apple Pay)?
7. [ ] **Privacy policy**: OK to change "billing address" (we no longer collect one)? Policies are only changed with your approval.
8. [ ] Optional: Shopify orders and customers export, so past buyers can download again and the newsletter list carries over.
9. [ ] Pick a cutover date.

## Claude (after the owner items above)

10. [ ] Point the Resend DNS records at the domain and check that code emails arrive (after 1–2).
11. [ ] Real test purchase with a Tap test card: paid, declined, then the webhook. Check the real Tap API matches the code (after 3).
12. [ ] Move the R2 bucket to the Eastern Europe region (it was created in North America), before ebooks are uploaded.
13. [ ] Upload the ebooks, then check each product's download (after 4).
14. [ ] Add whatever the Ministry of Commerce list requires (after 5).
15. [ ] Build the newsletter signup and search. Shopify had both; not built yet.
16. [ ] Optional: a simple owner page listing orders (today it's `wrangler d1 execute`, see DEPLOY.md).
17. [ ] Cutover: DNS to Cloudflare, add the custom domain and `SITE_URL`, switch to Tap live keys, set the Tap webhook URL, remove the domain from Shopify.

## Dropped from Shopify (decide if needed)

- Customer accounts with passwords (replaced by the email code and My downloads).
- AI shopping agent endpoints (`agents.md`, UCP/MCP).
- Shop Pay and the country/currency selector (KWD only, as before).

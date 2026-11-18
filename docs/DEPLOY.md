# Deploying

One Cloudflare Worker serves everything. It has three parts:

- **Static assets** (`public/`, built by `tools/build.mjs`): every page, image and trailer.
- **D1 database `store`**: orders, email codes, rate limits, download counts and the audit log.
- **Private R2 bucket `sala-store-files`**: the ebook files under `ebooks/<product-handle>/<file name>`. It has no public
  access. Files only leave through signed, expiring and counted `/dl/...` links for paid orders.

Outside services:

- **Tap** (payments). Secret key `TAP_SECRET_KEY`.
- **Resend** (email codes and receipts). Key `RESEND_API_KEY`, and the domain `sala.company` verified in Resend so mail
  can come from `orders@sala.company`.

## One-time setup

1. Create the Cloudflare resources (needs `npx wrangler login` or `CLOUDFLARE_API_TOKEN`):
   ```bash
   npx wrangler d1 create store            # copy the database_id into wrangler.jsonc
   npx wrangler r2 bucket create sala-store-files
   npx wrangler d1 migrations apply store --remote
   ```
2. Set the secrets:
   ```bash
   npx wrangler secret put TAP_SECRET_KEY   # sk_test_... first, sk_live_... at launch
   npx wrangler secret put RESEND_API_KEY
   openssl rand -base64 32 | npx wrangler secret put SIGNING_SECRET
   ```
   Changing `SIGNING_SECRET` later invalidates every emailed link. Buyers can get new ones at `/downloads`.
3. Upload the ebooks: `node tools/upload-ebooks.mjs ./ebooks` (one folder per product handle). You can also drag them
   into the bucket in the Cloudflare dashboard under R2 → `sala-store-files`, using folders named `ebooks/<handle>/`.
   A product with no file shows "Coming soon" and can't be bought.
4. Deploy: `npm run deploy`. The store is now live at `https://sala-store.<account>.workers.dev` for testing.
   From then on, GitHub deploys every push to `main` after tests pass. Add repository secrets `CLOUDFLARE_API_TOKEN`
   and `CLOUDFLARE_ACCOUNT_ID`.
5. In the Tap dashboard, set the webhook URL to `https://<host>/api/tap/webhook` (the charge also sends `post.url`, so this is a backup).

## Test purchase checklist (Tap test keys)

- [ ] Buy a paid book with a Tap test card. The order page turns to "paid", the email arrives with working links, and the owner email arrives.
- [ ] A declined test card shows "The payment didn't go through".
- [ ] Get a free product: the email code works and the download starts.
- [ ] `/downloads` with the same email lists the orders.
- [ ] The footer and policies show license 502625 on phone and desktop.

## Cutover from Shopify

1. Move the `sala.company` DNS zone to Cloudflare, if it isn't there already.
2. Add to `wrangler.jsonc`: `"routes": [{ "pattern": "sala.company", "custom_domain": true }]` and the var
   `"SITE_URL": "https://sala.company"`. Then switch Tap to live keys and deploy.
3. Remove `sala.company` from Shopify's domains. Keep the Shopify store (unpublished) for a few weeks so old
   Shopify download emails keep working.

## Day to day

- Orders: `npx wrangler d1 execute store --remote --command "SELECT id,email,total_fils,status,created_at FROM orders ORDER BY created_at DESC LIMIT 20"`
- One order's history: `... --command "SELECT * FROM events WHERE order_id='SC-XXXX'"`
- New product: add it to `catalog/products.json` (prices are in fils: 4.000 KWD = `4000`), put its cover image in
  `catalog/media/`, run `npm run media`, upload its file, then push.

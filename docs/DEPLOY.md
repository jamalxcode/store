# Deploying

One Cloudflare Worker serves everything. It has three parts:

- **Static assets** (`public/`, built by `tools/build.mjs`): every page, image and trailer.
- **D1 database `store`**: orders, email codes, rate limits, download counts and the audit log.
- **Private R2 bucket `sala-ebooks`**: the ebook files under `ebooks/<product-handle>/<file name>`. It has no public
  access. Files only leave through signed, expiring and counted `/dl/...` links for paid orders.

Outside services:

- **Tap** (payments). Secret key `TAP_SECRET_KEY`.
- **Resend** (email codes and receipts). Key `RESEND_API_KEY`, and the domain `sala.company` verified in Resend so mail
  can come from `orders@sala.company`.

## One-time setup

**Status (19 Nov 2026):** steps 1–4 are done. `TAP_SECRET_KEY` is the only missing secret (waiting on Tap support).

1. Create the Cloudflare resources (needs `npx wrangler login` or `CLOUDFLARE_API_TOKEN`):
   ```bash
   npx wrangler d1 create store            # copy the database_id into wrangler.jsonc
   npx wrangler r2 bucket create sala-ebooks --location eeur   # Eastern Europe, nearest to Kuwait
   npx wrangler d1 migrations apply store --remote
   ```
2. Set the secrets:
   ```bash
   npx wrangler secret put TAP_SECRET_KEY   # sk_test_... first, sk_live_... at launch
   npx wrangler secret put RESEND_API_KEY
   openssl rand -base64 32 | npx wrangler secret put SIGNING_SECRET
   ```
   Changing `SIGNING_SECRET` later invalidates every emailed link. Buyers can get new ones at `/downloads`.
3. Upload the ebooks. Each book gets three files, EPUB, PDF (5x8) and Mobi, at `ebooks/<handle>/<Book Title>.<ext>`.
   Every file in the folder is delivered to the buyer. Two ways to upload:
   - Easiest: drag the files from Draft2Digital into the top of the `sala-ebooks` bucket in the Cloudflare dashboard,
     then ask Claude to sort them into place, check the titles and delete the loose copies.
   - Command line: `node tools/upload-ebooks.mjs ./ebooks` (one subfolder per product handle).

   A product with no file shows "Coming soon" and can't be bought.
4. Deploy: `npm run deploy`. The store is now live at `https://sala-store.<account>.workers.dev` for testing.
   From then on, GitHub deploys every push to `main` after tests pass. Add the repository secret `CLOUDFLARE_API_TOKEN`
   (the account id is in `wrangler.jsonc`). Note: from a Claude cloud session, `wrangler deploy` fails at the asset upload
   (401), because the session proxy replaces the upload's own token. Deploy through the GitHub workflow instead
   (Actions → Deploy → Run workflow). Everything else (`d1`, `r2`, `secret put`) works from the session.
5. In the Tap dashboard, set the webhook URL to `https://<host>/api/tap/webhook` (the charge also sends `post.url`, so this is a backup).

## Test purchase checklist (Tap test keys)

- [ ] Buy a paid book with a Tap test card. The order page turns to "paid", the email arrives with working links, and the owner email arrives.
- [ ] A declined test card shows "The payment didn't go through".
- [ ] The download links work for all three formats (EPUB, PDF, Mobi) and the file names are the book titles.
- [ ] The invoice (`/invoice`, linked in the email) shows the Arabic and English seller details, CR 502625, licence 2024/16512, capital, phone and the total.
- [ ] A complaint from `/complaints` emails a reference number to the customer and the complaint to the owner.
- [ ] `/downloads` with the same email lists the orders.
- [ ] The footer and policies show CR 502625 on phone and desktop.

## Cutover from Shopify

1. Move the `sala.company` DNS zone from GoDaddy to Cloudflare: Cloudflare → Add a domain → copy the records it finds →
   change the nameservers at GoDaddy. **Check that the Resend records came across** (TXT `resend._domainkey`, the
   `send` records and `_dmarc`), or emails stop. The domain stays registered at GoDaddy.
2. Add to `wrangler.jsonc`: `"routes": [{ "pattern": "sala.company", "custom_domain": true }]` and the var
   `"SITE_URL": "https://sala.company"`. Then switch Tap to live keys and deploy.
3. Remove `sala.company` from Shopify's domains. Keep the Shopify store (unpublished) for a few weeks so old
   Shopify download emails keep working.

## Day to day

- Orders: `npx wrangler d1 execute store --remote --command "SELECT id,email,total_fils,status,created_at FROM orders ORDER BY created_at DESC LIMIT 20"`
- One order's history: `... --command "SELECT * FROM events WHERE order_id='SC-XXXX'"`
- New product: add it to `catalog/products.json` (prices are in fils: 4.000 KWD = `4000`), put its cover image in
  `catalog/media/`, run `npm run media`, upload its file, then push.

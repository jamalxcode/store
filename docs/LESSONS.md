# Lessons learned

Things that cost time or weren't obvious, so the next session doesn't relearn them.

## Shopify

- Without admin access, Shopify still shows a lot through public endpoints: `/meta.json`, `/products.json?limit=250`,
  `/collections.json`, `/collections/<h>/products.json`, `/blogs/<blog>.atom` (full article HTML), `/policies/<p>.json`
  and the sitemaps. `tools/snapshot.py` uses all of them.
- Product images point at `cdn.shopify.com`, which the cloud session blocks. The same files are served from the store's
  own domain at `https://sala.company/cdn/shop/files/<name>`.
- Article pages don't wrap the body in a predictable element. Use the Atom feed for the full HTML.
- Product descriptions pasted from ChatGPT carry junk classes such as `[&_strong:has(+br)]`. `tools/sanitize.mjs` strips them on import.
- The ebook files aren't in any public endpoint, and the Admin API may not reach files attached by the Digital Downloads
  app. Expect to download them by hand.
- Shopify asked buyers for a billing address even though no product required shipping. That was the owner's main complaint.

## Cloudflare

- **From a Claude cloud session, `wrangler deploy` fails at the static-asset upload with 401.** The session proxy
  injects the saved API token into every `api.cloudflare.com` request, overwriting the one-time upload JWT that the
  asset upload uses. Deploy through the GitHub workflow instead (Actions → Deploy). `d1`, `r2` and `secret put` work fine
  from the session (`CLOUDFLARE_API_TOKEN=proxy-injected`).
- Secrets the live Worker needs (Tap, Resend) can't come through the session's secure credential form, because that only
  injects into this session's own requests. The owner pastes them in Cloudflare → Workers & Pages → sala-store →
  Settings → Variables and Secrets → Production.
- R2 has to be switched on once in the dashboard ("Please enable R2", error 10042), and it needs a card even on the free plan.
- **A deleted R2 bucket's name keeps its old region.** Recreating `sala-store-files` with `locationHint: eeur` came back
  as ENAM again, so the bucket got a new name: `sala-ebooks`.
- Workers static assets cap files at 25 MiB. The Shopify trailers (about 33 MB at 4.5 Mbps) were re-encoded to about 10 MB at 1.3 Mbps with `tools/media.mjs`.
- `html_handling: auto-trailing-slash` serves `products/x.html` at `/products/x`, so the Shopify URLs are kept without redirects.
- A prefilled API-token link works and saves a lot of clicking:
  `dash.cloudflare.com/profile/api-tokens?permissionGroupKeys=[{"key":"workers_scripts","type":"edit"},{"key":"d1","type":"edit"},{"key":"workers_r2","type":"edit"},…]&accountId=*&zoneId=all&name=…` (URL-encoded).

## Resend

- The region is fixed when the domain is added. Choose **Ireland (eu-west-1)** before clicking Add (it defaulted to Tokyo).
- **Auto configure** with GoDaddy (Domain Connect) adds the DNS records itself, and was verified within about 6 minutes.
  The records only cover sending (DKIM TXT, `send`/`rsend` subdomains, DMARC), so the site and inbox aren't touched.
- Turn click and open tracking **off**: tracking rewrites links, which would break the signed download URLs.

## Tap

- The legacy Tap dashboard (as used through Shopify) has no Developers or API Keys section. Direct API keys have to be
  requested from support@tap.company. Sent on 2026-11-18.
- Tap's public docs don't describe the webhook `hashstring` format reliably, so the store doesn't depend on it. It
  re-fetches the charge with the secret key instead, which is stronger anyway.

## Ebook files

- The owner's ebooks are on Draft2Digital (EPUB, Mobi, PDF 4.5x6 and 5x8, samples). The store uses **EPUB + PDF 5x8**; Mobi is obsolete.
- Easiest bulk upload for the owner: drag everything into the `sala-ebooks` bucket in the Cloudflare dashboard. Claude then copies each file to `ebooks/<handle>/<Nice Name>.<ext>` through the API, checking the EPUB `<dc:title>` or the PDF's first page.
- Bulk-deleting objects from the session is blocked by the auto-mode safety check. Ask the owner to confirm, or have them delete in the dashboard.

## Company documents

- The MOCI register form (بيانات المستفيدين) gives the CR number (same as the licence, 502625), legal form and licence type, but it also holds the owner's civil ID, passport, birth date, home address and phone. Never commit it, and never publish the home address (checklist ID-06). It has no capital figure.
- The commercial register extract (شهادة مستخرج السجل التجاري) is the authority: **502625 is the register number; the licence is 2024/16512**. The owner's own text and the old Shopify policies call 502625 the "Commercial License". It also gives capital (1000 KWD) and the single licensed activity (620200). The repo is public, so neither document is committed.

## Working with the owner

- Wants short numbered steps, about 20 words each, one action per step, written for someone who has never seen the screen.
- Screenshots arrive instead of descriptions. Read the exact labels on them before giving the next step; Cloudflare,
  Resend and Tap screens differ from the docs.
- Ask for keys only through the secure form or the provider's own dashboard, never in chat. The form is aborted if the
  owner keeps typing while it's open, so ask them to say "ready" first.

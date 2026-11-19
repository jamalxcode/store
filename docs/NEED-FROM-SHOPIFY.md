# What we needed from the owner / Shopify

Kept for history. Everything still open now lives in [TODO.md](TODO.md).

| Item | Status |
|---|---|
| Ebook files | **Done** (19 Nov): from Draft2Digital, not Shopify. 17 books × EPUB, PDF and Mobi. No Shopify admin access was needed |
| Ministry of Commerce conditions | **Done**: owner's checklist in `compliance/`, audit in `compliance/AUDIT.md` |
| Company register details | **Done**: from the official register extract (CR 502625, licence 2024/16512) |
| Cloudflare account and API token | **Done** (18 Nov) |
| Resend account, domain and key | **Done** (18 Nov) |
| Tap API keys | **Open**: waiting on Tap support. Their legacy dashboard (used through Shopify) has no API-keys page |
| Tap payment methods / settlement account | **Open** |
| Shopify orders and customers export | Optional, not done. Lets past buyers download again and carries the email list over |
| Discount codes | None in use |
| Theme export, logo | Not needed: the logo came from the public site (`shopify-export/media/theme/logo.png`) |
| Font file, source-code zip | Not available. Both products are hidden |

Rules that still apply: never commit secrets or customer data. Keys go into Cloudflare's dashboard or the session's
secure credential form, never into chat or git. The register documents aren't stored in the repo, which is public.

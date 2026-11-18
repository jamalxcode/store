# What we still need from the owner / Shopify admin

The public storefront gave us the catalog, images, trailers, blog and policies (see `shopify-export/`). These items are
only available from the Shopify admin or from the owner. **Never commit secrets or customer data to this repo.** Send
keys through the cloud environment's credential prompt and keep customer exports out of git.

## Must have

1. **The ebook files** (PDF/EPUB/ZIP/font files) for all 20 products. Shopify admin → Apps → Digital Downloads (or
   whichever app delivers them) → each product → download the attached file. Also: which app is it?
2. **The Ministry of Commerce conditions list**: which statements are required and where (home page, footer, checkout, invoice),
   plus the URLs of any compliance blog posts that are hidden or unlisted (only 11 public posts were found, all in `news`).
3. **Tap account details**: direct Tap merchant account or Shopify-only plugin? Payment methods enabled (KNET, Visa/MC,
   Apple Pay)? Test and live secret keys (provided later as a credential, not in chat).

## Nice to have

4. Orders export (Admin → Orders → Export, CSV), so past buyers can still get their downloads. This stays private and out of git.
5. Customers and email-subscriber export (Admin → Customers → Export), for the newsletter list. Private.
6. Discount codes in use (Admin → Discounts).
7. Theme export (Online Store → Themes → … → Download theme file) if you want the exact Dawn settings. Not required.
8. A logo file if one exists (the store uses a text logo).
9. Where email is sent from today (Shopify Email) and which address buyers should see as the sender.

A **Shopify Admin API token** (custom app with read_products, read_orders, read_customers and read_files scopes) would
let a script pull items 1 and 4–6 automatically. It's optional; manual exports work too.

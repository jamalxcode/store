# sala.company store

Rebuild of the Shopify ebook store at https://sala.company (SALA CO, Kuwait, commercial license 502625) as our own
site, with Tap payments and an email-only checkout.

Status: **research done, build not started.**

- [docs/SHOPIFY-AUDIT.md](docs/SHOPIFY-AUDIT.md): how the current Shopify store is built (theme, layout, catalog, blog, policies).
- [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md): what the new store must do (MOCI compliance, Tap, email-verified checkout, URLs to keep).
- [docs/NEED-FROM-SHOPIFY.md](docs/NEED-FROM-SHOPIFY.md): what's still needed from the owner or the Shopify admin.
- [shopify-export/](shopify-export/): public snapshot of the store (products, collections, articles, policies, images, trailers).
- `tools/snapshot.py`: re-pulls that snapshot (`python3 tools/snapshot.py`, add `--no-media` to skip images and videos).

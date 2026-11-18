# How the current Shopify store is built

Audit of https://sala.company done on 2026-11-18, using only public pages and Shopify's public storefront JSON
(`/meta.json`, `/products.json`, `/collections.json`, blog Atom feeds, `/policies/*.json`, sitemaps). The raw
snapshot is in [`../shopify-export/`](../shopify-export/). `tools/snapshot.py` regenerates it.

## Store basics

| | |
|---|---|
| Store name | sala company |
| Shopify shop | `259379-22.myshopify.com` (shop id 69895815401) |
| Domain | `sala.company` (apex domain on Shopify). Other subdomains (`go.`, `ai.`, `tetris.`, `galacticdefender.`, `flattery.` …) are separate sites. |
| Location | Al Salam, Hawalli, Kuwait |
| Currency | KWD only, 3 decimals, `money_format` = `{{amount}}0 KD` (shows e.g. `4.000 KWD`). Every country sees KWD (no Markets currency conversion). |
| Ships to | ~240 countries, but every product has `requires_shipping: false` (all digital) |
| Shop Pay / installments | off |
| Language | English storefront. Policies are bilingual (English + Arabic). |
| Payments | Tap Payments (tap.company), per the owner and the policies |
| SEO description | "Discover sala.company – your source for AI-powered eBooks, consultancy, and management advice…" |

## Theme

- **Dawn 15.2.0**, Shopify's free reference theme (theme store id 887). The theme is called "Updated copy of Updated copy of Dawn" (id 145345904873).
- Font: **Assistant** (Shopify font CDN), used for body and headings.
- Colours: Dawn defaults. Colour schemes are white `#FFFFFF`, light grey `#F3F3F3`, near-black `#121212`, dark slate `#242833` and accent blue `#334FB4`.
- No logo image. The header shows the text "sala.company". Favicon: `media/theme/favicon.png`.
- No custom apps load on the storefront. Only Shopify's own scripts run: shop-js, web pixels, hCaptcha on forms and "standard actions". There's no third-party analytics and no GoatCounter.

## Home page (top to bottom)

1. **Announcement bar 1** (rotating): "We are Open - All Welcome" · "Get or Free Kuwait Themed Font" (sic) · "Teach your children about business in a simple fun way" · "Learn more about Coffee" · "Become an AI Powered Artist"
2. **Header**: text logo, menu **Home** (`/`) · **Catalog** (`/collections/all`) · **Blog** (`/blogs/news`) · **AI** (`http://ai.sala.company`), search, account login (Shopify customer accounts), cart, country selector.
3. **Announcement bar 2**: "Play Galactice Defender" (sic) → https://galacticdefender.sala.company/ · "Play Tetris" → https://tetris.sala.company/
4. **Featured collection** `featured`, heading "Click to watch an Exciting ebook video trailer". Shows The Boy Who Defied the Machine and The Nadia Upgrade (4.000 KWD each).
5. **Collection list**: AI eBooks, Business, Children eBooks (with their descriptions).
6. **Featured blog** "Latest News": the 3 newest posts.
7. **Footer**: email signup ("Subscribe to our emails"), country selector, policy links (privacy, refund, shipping, terms, contact information), "Powered by Shopify".

## Product page

Dawn `main-product` + `related-products` sections. Each product has one variant ("Default Title") and usually one cover
image. The Boy Who Defied the Machine has 4 images. The two sci-fi titles have an **MP4 video trailer** hosted on
Shopify (`media/videos/`, about 33 MB each). Descriptions name the author **Jamal Faisal Almutawa**.

## Catalog (20 products, all digital)

| Product | Handle | Price (KWD) | Collections | Created |
|---|---|---|---|---|
| 123 Come Count With Me | `123-come-count-with-me` | 1.000 | Children eBooks | 2024-06-16 |
| Aroma and Art: An Illustrated Coffee Journey | `aroma-and-art-an-illustrated-coffee-journey` | 12.000 | - | 2024-06-18 |
| Art in the Age of AI | `art-in-the-age-of-ai` | 12.000 | AI eBooks | 2024-06-18 |
| Exploring Legendary Creatures - Dragons to Manticore | `exploring-legendary-creatures-dragons-to-manticore` | 12.000 | Children eBooks | 2024-06-18 |
| How Can I Make Money From Investing? | `how-can-i-make-money-from-investing` | 12.000 | Business | 2024-06-19 |
| How Does a Lightbulb Work | `how-does-a-lightbulb-work` | 4.000 | Children eBooks | 2024-06-19 |
| Talk Time: Past to Future — An Illustrated Communications History Book | `talk-time-past-to-future-an-illustrated-communications-history-book` | 12.000 | - | 2024-06-19 |
| The AI-Powered Productivity Handbook | `the-ai-powered-productivity-handbook` | 12.000 | AI eBooks | 2024-06-19 |
| Top 10 Elements for the Young | `top-10-elements-for-the-young` | 4.000 | Children eBooks | 2024-06-19 |
| Stock Market for the Young | `stock-market-for-the-young` | 4.000 | Business, Children eBooks | 2024-06-19 |
| Meet the Animals | `meet-the-animals` | 4.000 | Children eBooks | 2024-06-19 |
| From Footsteps to Flight | `from-footsteps-to-flight` | 4.000 | Children eBooks | 2024-06-19 |
| Fun Kuwait Themed Letters (Font) | `fun-kuwait` | 0.000 (free) | - | 2024-08-09 |
| Super Coder | `super-coder` | 12.000 | AI eBooks | 2024-11-28 |
| Super Coder - Source Code | `super-coder-source-code` | 0.000 (free) | - | 2024-11-28 |
| AI Revolution Collection - From Art to Code (bundle) | `ai-revolution-collection-from-art-to-code` | 24.000 | - | 2025-01-25 |
| The Boy Who Defied the Machine - ebook | `the-boy-who-defied-the-machine` | 4.000 | featured (video trailers) | 2025-03-20 |
| The Nadia Upgrade - ebook | `the-nadia-upgrade` | 4.000 | featured (video trailers) | 2025-05-18 |
| Reddington the Fox | `reddington-the-fox` | 4.000 | Children eBooks | 2025-07-29 |
| AI Explained: A Teen's Guide to the Artificial Intelligence Future | `ai-explained-a-teens-guide-to-the-artificial-intelligence-future` | 12.000 | AI eBooks | 2025-08-16 |

Notes:
- No product types (only The Nadia Upgrade has `ebook`), no tags, vendor is always "sala company", no compare-at prices.
- Four products are in no collection (coffee, Talk Time, the font, the source code, the bundle). Only `/collections/all` lists them.
- The bundle's contents aren't machine-readable. They're only described in its text and blog post.

## Collections

| Title | Handle | Products |
|---|---|---|
| AI eBooks | `ai-ebooks` | 4 |
| Business | `business` | 2 |
| Children eBooks | `children-ebooks` | 8 |
| eBook Video Trailers - Click to watch the ebook video trailer | `featured` | 2 |
| Home page | `frontpage` | 0 (unused) |

## Blog `news` (11 posts)

| Date | Title | Handle |
|---|---|---|
| 2024-06-29 | Welcome to sala.company (**has the PO Box and Commercial License 502625, a Ministry of Commerce requirement**) | `welcome-to-sala-company` |
| 2024-06-29 | I just discovered websim.ai | `i-just-discovered-websim-ai` |
| 2024-06-30 | The Business Model Canvas | `the-business-model-canvas` |
| 2024-06-30 | Discover a Treasure Trove of Unique eBooks at Sala Company | `discover-a-treasure-trove-of-unique-ebooks-at-sala-company` |
| 2024-07-02 | Conducting an AI Orchestra: How I Used AI to Enhance My Writing Process | `conducting-an-ai-orchestra-…` |
| 2024-08-09 | Fun Kuwait Themed Font | `fun-kuwait-themed-font` |
| 2024-11-28 | Super Coder eBook has just been released. | `super-coder-ebook-has-just-been-released` |
| 2025-01-25 | Master AI with Our Exclusive Ebook Bundle … | `master-ai-with-our-exclusive-ebook-bundle-…` |
| 2025-03-20 | Introducing "The Boy Who Defied the Machine" … | `introducing-the-boy-who-defied-the-machine-…` |
| 2025-07-03 | Two Mind-Bending Sci-Fi Thrillers That Will Redefine Your Reality | `two-mind-bending-sci-fi-thrillers-…` |
| 2025-09-22 | Welcome to go.sala.company — The Gateway to All Things Sala | `welcome-to-go-sala-company-…` |

## Policies (bilingual EN/AR, effective 24 Feb 2026)

`/policies/privacy-policy`, `refund-policy`, `shipping-policy` ("Digital Delivery Policy"), `terms-of-service` and
`contact-information`. The full text is in `shopify-export/policies/`. They hold the Ministry of Commerce details. See
[REQUIREMENTS.md](REQUIREMENTS.md#1-kuwait-ministry-of-commerce-compliance).

## Shopify extras the new site gets for free today (decide what to keep)

- Customer accounts (login at `/customer_authentication/…`) with past downloads ("access files via your customer account", per the shipping policy).
- Email signup in the footer (Shopify Email list).
- Search (`/search/suggest.json`).
- Sitemaps, `robots.txt`, Open Graph tags, JSON-LD for products and articles.
- `agents.md` and the UCP/MCP endpoint (`/.well-known/ucp`, `/api/ucp/mcp`) so AI shopping agents can buy. This is Shopify-only and lost on migration unless rebuilt.
- Admin, order emails, tax/fraud tooling, hCaptcha on forms.

## What public data can't tell us

How the ebook files are delivered (Shopify Digital Downloads or another app), the files themselves, orders, customers,
email subscribers, discount codes, the Tap integration type and checkout settings. See
[NEED-FROM-SHOPIFY.md](NEED-FROM-SHOPIFY.md).

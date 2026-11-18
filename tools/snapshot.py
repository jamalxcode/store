#!/usr/bin/env python3
"""Snapshot the public content of the Shopify store at sala.company.

Pulls only what any visitor can see (no admin access): store metadata,
products, collections, blog articles, policies and every image/video they
reference. Writes everything under shopify-export/. Safe to re-run.

    python3 tools/snapshot.py            # default https://sala.company
    python3 tools/snapshot.py --no-media # skip images/videos
"""
import html, json, os, re, sys, time, urllib.request
from urllib.parse import urlparse

BASE = "https://sala.company"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "shopify-export")
UA = {"User-Agent": "sala-store-snapshot/1.0 (owner backup)"}
MEDIA = "--no-media" not in sys.argv


def get(url, binary=False):
    for attempt in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                data = r.read()
                return data if binary else data.decode("utf-8")
        except Exception as e:  # noqa: BLE001
            if attempt == 3:
                raise
            print("retry", url, e)
            time.sleep(2 * (attempt + 1))


def save(rel, content):
    path = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    mode = "wb" if isinstance(content, bytes) else "w"
    with open(path, mode) as f:
        f.write(content)


def save_json(rel, obj):
    save(rel, json.dumps(obj, indent=2, ensure_ascii=False) + "\n")


def text(h):
    h = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", h, flags=re.S)
    h = re.sub(r"<br\s*/?>|</p>|</h\d>|</li>", "\n", h)
    h = re.sub(r"<li[^>]*>", "- ", h)
    t = html.unescape(re.sub(r"<[^>]+>", "", h))
    return re.sub(r"\n\s*\n+", "\n\n", re.sub(r"[ \t]+", " ", t)).strip()


media = {}  # url -> local relative path


def want(url, folder):
    if not url:
        return None
    if url.startswith("//"):
        url = "https:" + url
    # cdn.shopify.com/s/files/<shop>/files/x is also served at <store>/cdn/shop/files/x
    url = re.sub(r"^https://cdn\.shopify\.com/s/files/[\d/]+/files/", BASE + "/cdn/shop/files/", url)
    clean = url.split("?")[0]
    name = os.path.basename(urlparse(clean).path)
    rel = f"media/{folder}/{name}"
    media[clean] = rel
    return rel


# Store metadata
save_json("meta.json", json.loads(get(BASE + "/meta.json")))

# Products (public storefront JSON, up to 250 per page)
products, page = [], 1
while True:
    batch = json.loads(get(f"{BASE}/products.json?limit=250&page={page}"))["products"]
    if not batch:
        break
    products += batch
    page += 1
for p in products:
    p["body_text"] = text(p.get("body_html") or "")
    for img in p["images"]:
        img["local"] = want(img["src"], "products")
    # product page: pick up videos (trailers) Shopify serves from /cdn/shop/videos
    ph = get(f"{BASE}/products/{p['handle']}")
    vids = sorted(set(re.findall(r'(//sala\.company/cdn/shop/videos/[^"\s]+?\.mp4)', ph)))
    p["videos"] = [{"src": "https:" + v, "local": want(v, "videos")} for v in vids]
save_json("products.json", products)

# Collections + membership
cols = json.loads(get(BASE + "/collections.json?limit=250"))["collections"]
for c in cols:
    c["description_text"] = text(c.get("description") or "")
    c["product_handles"] = [x["handle"] for x in json.loads(get(f"{BASE}/collections/{c['handle']}/products.json?limit=250"))["products"]]
    if c.get("image"):
        c["image"]["local"] = want(c["image"]["src"], "collections")
save_json("collections.json", cols)

# Blog articles: full HTML from each blog's Atom feed (blogs found via the sitemap)
sm = get(BASE + "/sitemap_blogs_1.xml")
blogs = re.findall(r"<loc>https://[^<]+/blogs/([^<]+)</loc>", sm) or ["news"]
articles = []
for blog in blogs:
    feed = get(f"{BASE}/blogs/{blog}.atom")
    for e in re.findall(r"<entry>(.*?)</entry>", feed, re.S):
        def tag(t):
            m = re.search(rf"<{t}[^>]*>(.*?)</{t}>", e, re.S)
            return html.unescape(m.group(1).strip()) if m else ""
        u = re.search(r'<link[^>]+href="([^"]+)"', e).group(1)
        body_html = tag("content")
        for src in re.findall(r'<img[^>]+src="([^"]+)"', body_html):
            want(src, "articles")
        ah = get(u)
        hero = re.search(r'"image":"([^"]+)"', ah)
        a = {
            "url": u, "handle": u.rstrip("/").split("/")[-1], "blog": blog,
            "title": tag("title"), "published": tag("published"), "updated": tag("updated"),
            "author": text(tag("author")), "tags": re.findall(r'<category term="([^"]+)"', e),
            "image": want(hero.group(1).replace("\\/", "/"), "articles") if hero else None,
            "body_html": body_html,
        }
        articles.append(a)
        save(f"articles/{a['handle']}.md", f"# {a['title']}\n\n_{a['published']}_ · {u}\n\n{text(body_html)}\n")
save_json("articles.json", articles)

# Policies
for p in ["privacy-policy", "refund-policy", "shipping-policy", "terms-of-service", "contact-information"]:
    try:
        pol = json.loads(get(f"{BASE}/policies/{p}.json"))["policy"]
        save(f"policies/{p}.md", f"# {pol['title']}\n\n{text(pol['body'])}\n")
    except Exception as e:  # noqa: BLE001
        print("policy", p, e)

# Home page HTML for reference (layout, sections, theme settings)
home = get(BASE + "/")
save("pages/home.html", home)
for m in re.findall(r'(//sala\.company/cdn/shop/files/[^"\s?]+)', home):
    want(m, "theme")

if MEDIA:
    for url, rel in sorted(media.items()):
        dest = os.path.join(OUT, rel)
        if os.path.exists(dest):
            continue
        try:
            save(rel, get(url, binary=True))
            print("media", rel)
        except Exception as e:  # noqa: BLE001
            print("media failed", url, e)

print(f"{len(products)} products, {len(cols)} collections, {len(articles)} articles, {len(media)} media files")

// One-time import: shopify-export/ (public snapshot) -> catalog/ (the store's editable source of truth).
// Re-running overwrites catalog/products.json, collections.json, articles.json and policies/,
// so after the first import edit catalog/ by hand instead.
import fs from "node:fs";
import path from "node:path";
import { sanitize } from "./sanitize.mjs";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const exp = (f) => JSON.parse(fs.readFileSync(path.join(root, "shopify-export", f), "utf8"));
const out = (f, v) => {
  const p = path.join(root, "catalog", f);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(v, null, 2) + "\n");
};

const products = exp("products.json");
const collections = exp("collections.json").filter((c) => c.product_handles.length);
const fils = (price) => Math.round(Number(price) * 1000);
const cleanTitle = (t) => t.replace(/\s+-\s+ebook$/i, "");
// Bundle contents are only described in prose on Shopify; recorded here explicitly.
const INCLUDES = {
  "ai-revolution-collection-from-art-to-code": ["the-ai-powered-productivity-handbook", "art-in-the-age-of-ai", "super-coder"],
};
const KIND = { "fun-kuwait": "font", "super-coder-source-code": "source code" };

out(
  "products.json",
  products
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((p) => ({
      handle: p.handle,
      title: cleanTitle(p.title),
      price_fils: fils(p.variants[0].price),
      kind: KIND[p.handle] || (INCLUDES[p.handle] ? "bundle" : "ebook"),
      author: /almutawa|amutawa/i.test(p.body_text) ? "Jamal Faisal Almutawa" : null,
      collections: collections.filter((c) => c.product_handles.includes(p.handle)).map((c) => c.handle),
      includes: INCLUDES[p.handle] || [],
      images: p.images.map((i) => ({ src: `shopify-export/${i.local}`, width: i.width, height: i.height, alt: i.alt || "" })),
      video: p.videos[0] ? `shopify-export/${p.videos[0].local}` : null,
      description_html: sanitize(p.body_html),
      created: p.created_at.slice(0, 10),
    })),
);

out(
  "collections.json",
  collections.map((c) => ({
    handle: c.handle,
    title: c.handle === "featured" ? "eBook video trailers" : c.title,
    description: c.description_text.replace(/\s+/g, " ").trim(),
  })),
);

out(
  "articles.json",
  exp("articles.json")
    .sort((a, b) => b.published.localeCompare(a.published))
    .map((a) => ({
      handle: a.handle,
      blog: a.blog,
      title: a.title.replace(/\s+/g, " ").trim(),
      published: a.published,
      author: a.author || "Sala Company",
      image: a.image ? `shopify-export/${a.image}` : null,
      body_html: sanitize(a.body_html).replace(/src="\/\/sala\.company\/cdn\/shop\/files\//g, 'src="/media/img/'),
    })),
);

for (const f of fs.readdirSync(path.join(root, "shopify-export/policies")).filter((f) => f.endsWith(".json"))) {
  out(`policies/${f}`, exp(`policies/${f}`));
}
console.log(`imported ${products.length} products, ${collections.length} collections`);

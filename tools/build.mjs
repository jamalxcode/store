// Builds the static storefront from catalog/ into public/ (served by the Worker's static assets).
//   node tools/build.mjs
// Pages keep Shopify's URL paths: /products/<handle>, /collections/<handle>, /blogs/news/<handle>, /policies/<name>.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { imgName, WIDTHS } from "./media.mjs";
import { identity, moneyAr } from "../src/identity.js";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(root, "public");
const read = (f) => JSON.parse(fs.readFileSync(path.join(root, "catalog", f), "utf8"));
const site = read("site.json");
// `hidden: true` products stay in the catalog (and the Worker can still sell them if their files exist)
// but get no page, no listing and no sitemap entry; their URL redirects to /collections/all.
const allProducts = read("products.json");
const products = allProducts.filter((p) => !p.hidden);
const collections = read("collections.json");
const articles = read("articles.json");
const policies = site.policies.map((h) => read(`policies/${h}.json`));
const bySlug = Object.fromEntries(products.map((p) => [p.handle, p]));

// ---------- helpers ----------
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const money = (fils) => (fils === 0 ? "Free" : `${(fils / 1000).toFixed(3)} KWD`);
const text = (h) => String(h).replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const excerpt = (h, n = 155) => { const t = text(h); return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : t; };
const date = (iso) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kuwait" });
const write = (rel, content) => {
  const p = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
};
const hash = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 10);
const img = (src, w) => `/media/img/${imgName(src, w)}`;
const picture = (src, { alt = "", sizes = "(max-width: 480px) 50vw, 240px", eager = false, width = 960, height = 1200 } = {}) =>
  `<img src="${img(src, WIDTHS[0])}" srcset="${WIDTHS.map((w) => `${img(src, w)} ${w}w`).join(", ")}" sizes="${sizes}" alt="${esc(alt)}" width="${width}" height="${height}"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async">`;
const dims = (i) => ({ width: i.width || 960, height: i.height || 1200 });
const cover = (p) => p.images[0];

// ---------- static assets ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const css = fs.readFileSync(path.join(root, "src/style.css"), "utf8");
const js = fs.readFileSync(path.join(root, "src/app.js"), "utf8");
const CSS = `/assets/style.css?v=${hash(css)}`;
const JS = `/assets/app.js?v=${hash(js)}`;
write("assets/style.css", css);
write("assets/app.js", js);
fs.cpSync(path.join(root, "catalog/media"), path.join(OUT, "media"), { recursive: true });
fs.copyFileSync(path.join(root, "shopify-export/media/theme/favicon.png"), path.join(OUT, "favicon.png"));
fs.copyFileSync(path.join(root, "shopify-export/media/theme/logo.png"), path.join(OUT, "logo.png"));

const GOAT = fs.readFileSync(path.join(root, "src/goatcounter.html"), "utf8").trim();
// Applies the saved theme before paint (same localStorage key as the other sala.company sites).
const THEME = `<script>try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}</script>`;
const inlineHashes = [GOAT, THEME].map((h) => {
  const body = h.match(/<script>([\s\S]*?)<\/script>/)[1];
  return `'sha256-${crypto.createHash("sha256").update(body).digest("base64")}'`;
});

const LOGO = `<svg viewBox="0 0 100 100" aria-hidden="true"><g transform="rotate(45 50 50)"><rect x="16" y="20" width="68" height="15" fill="#522c5e"/><rect x="16" y="42.5" width="68" height="15" fill="#f20a6b"/><rect x="16" y="65" width="68" height="15" fill="#fdeb2f"/></g></svg>`;
const ICON = {
  cart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6h15l-1.5 9h-12z"/><path d="M6 6 5 3H2"/><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/></svg>`,
  menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`,
  theme: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`,
};

const ID = identity(site.business, site.email);
// ---------- layout ----------
function layout({ title, description, url, body, current = "", og = null, jsonld = null, noindex = false }) {
  const full = title ? `${title} – ${site.name}` : `${site.wordmark} – ${site.name}`;
  const canonical = site.url + url;
  const ogImage = og ? site.url + og : `${site.url}/logo.png`;
  const b = site.business;
  const nav = site.nav.map((n) => `<a href="${n.href}"${n.external ? ' rel="noopener"' : ""}${current === n.href ? ' aria-current="page"' : ""}>${esc(n.text)}${n.external ? ' <span aria-hidden="true">↗</span>' : ""}</a>`).join("");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(full)}</title>
<meta name="description" content="${esc(description || site.description)}">
<link rel="canonical" href="${canonical}">
${noindex ? '<meta name="robots" content="noindex">\n' : ""}<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:title" content="${esc(title || site.wordmark)}">
<meta property="og:description" content="${esc(description || site.description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${ogImage}">
<meta property="og:type" content="${og && url.startsWith("/products/") ? "product" : "website"}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#522c5e">
<link rel="icon" type="image/png" href="/favicon.png">
<link rel="alternate" type="application/atom+xml" title="${esc(site.name)} blog" href="/blogs/news.atom">
<link rel="stylesheet" href="${CSS}">
${THEME}
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, "\\u003c")}</script>\n` : ""}<script type="module" src="${JS}"></script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="announce" role="region" aria-label="Announcements"><div class="wrap">${site.announcements
    .map((a, i) => `<span data-msg${i === 0 ? ' class="on"' : ""}>${a.href ? `<a href="${a.href}">${esc(a.text)}</a>` : esc(a.text)}</span>`)
    .join("")}</div></div>
<header class="header"><div class="wrap">
<a class="logo" href="/" aria-label="${esc(site.wordmark)} home">${LOGO}<span>${esc(site.wordmark)}</span></a>
<nav class="nav" aria-label="Main">${nav}</nav>
<details class="menu"><summary class="icon-btn" aria-label="Menu">${ICON.menu}</summary><nav class="menu-panel" aria-label="Menu">${nav}${site.games.map((g) => `<a href="${g.href}" rel="noopener">Play ${esc(g.text)}</a>`).join("")}</nav></details>
<button class="icon-btn" type="button" data-theme-toggle aria-label="Switch light or dark theme">${ICON.theme}</button>
<a class="icon-btn" href="/cart" aria-label="Cart">${ICON.cart}<span class="count" data-cart-count hidden>0</span></a>
</div></header>
<div class="stripe" aria-hidden="true"></div>
<main id="main">
${body}
</main>
<footer class="footer"><div class="wrap">
<div class="cols">
<div><a class="logo" href="/">${LOGO}<span>${esc(site.wordmark)}</span></a><p class="muted" style="margin-top:10px">${esc(site.tagline)}</p><p>Questions or complaints? <a href="/complaints">Contact us</a> · <a href="mailto:${site.email}">${site.email}</a></p></div>
<div><h2>Shop</h2><ul><li><a href="/collections/all">All products</a></li>${collections.map((c) => `<li><a href="/collections/${c.handle}">${esc(c.title)}</a></li>`).join("")}<li><a href="/downloads">My downloads</a></li><li><a href="/blogs/news">Blog</a></li></ul></div>
<div><h2>Help and policies</h2><ul><li><a href="/policies/refund-policy">Returns and refunds · الإرجاع والاسترداد</a></li><li><a href="/complaints">Contact and complaints · الشكاوى</a></li><li><a href="/policies/privacy-policy">Privacy · الخصوصية</a></li><li><a href="/policies/terms-of-service">Terms · الشروط</a></li><li><a href="/policies/shipping-policy">Digital delivery · التسليم الرقمي</a></li><li><a href="/policies/contact-information">Company information · بيانات الشركة</a></li><li><a href="${b.portal}" rel="noopener">go.sala.company</a></li></ul></div>
</div>
<div class="legal">
<p lang="ar" dir="rtl" data-identity="ar">${ID.ar.map(esc).join("<br>")}</p>
<p lang="en" data-identity="en">${ID.en.map(esc).join("<br>")}</p>
</div>
<div class="bottom"><span>© ${new Date().getFullYear()} ${esc(site.name)}. Prices in Kuwaiti dinar (KWD). Secure payment by Tap.</span><span>${site.games.map((g) => `<a href="${g.href}" rel="noopener">${esc(g.text)}</a>`).join(" · ")}</span></div>
</div></footer>
${GOAT}
</body>
</html>
`;
}

// ---------- components ----------
const card = (p, eager = false) => `<li class="card">
<div class="cover">${picture(cover(p).src, { alt: "", eager, ...dims(cover(p)) })}</div>
${p.price_fils === 0 ? '<span class="badge">Free</span>' : ""}
<h3><a href="/products/${p.handle}">${esc(p.title)}</a></h3>
<span class="price">${money(p.price_fils)}</span>
</li>`;
const grid = (list) => `<ul class="grid">${list.map((p, i) => card(p, i < 4)).join("")}</ul>`;
const chips = (current) => `<ul class="chips" aria-label="Collections"><li><a href="/collections/all"${current === "all" ? ' aria-current="page"' : ""}>All</a></li>${collections
  .map((c) => `<li><a href="/collections/${c.handle}"${current === c.handle ? ' aria-current="page"' : ""}>${esc(c.title)}</a></li>`)
  .join("")}</ul>`;
const postCard = (a) => `<li class="post">${a.image ? picture(a.image, { sizes: "(max-width: 600px) 100vw, 360px", width: 960, height: 540 }) : ""}<div><h3><a href="/blogs/news/${a.handle}">${esc(a.title)}</a></h3><time datetime="${a.published}">${date(a.published)}</time></div></li>`;
const inCollection = (h) => products.filter((p) => p.collections.includes(h));
const trailerProducts = products.filter((p) => p.video);
const trailer = (p) => `<article class="trailer"><video controls preload="none" playsinline poster="/media/video/${p.handle}.jpg" aria-label="${esc(p.title)} trailer"><source src="/media/video/${p.handle}.mp4" type="video/mp4"></video><div><h3><a href="/products/${p.handle}">${esc(p.title)}</a></h3><span class="price">${money(p.price_fils)}</span></div></article>`;

// ---------- pages ----------
const pages = [];
const page = (url, file, html, { sitemap = true } = {}) => {
  write(file, html);
  if (sitemap) pages.push(url);
};

// Home
const heroPicks = ["the-boy-who-defied-the-machine", "ai-explained-a-teens-guide-to-the-artificial-intelligence-future", "the-nadia-upgrade"].map((h) => bySlug[h]).filter(Boolean);
page("/", "index.html", layout({
  url: "/",
  title: "",
  current: "/",
  jsonld: { "@context": "https://schema.org", "@type": "OnlineStore", name: site.name, url: site.url, logo: `${site.url}/logo.png`, email: site.email, address: { "@type": "PostalAddress", addressLocality: "Al-Salam", addressCountry: "KW", postOfficeBoxNumber: "306", postalCode: "48154" } },
  body: `<section class="hero"><div class="wrap">
<div><h1>${esc(site.tagline)}</h1><p>Sci-fi, children's books and AI guides by Jamal Faisal Almutawa. Pay with KNET or card, download straight away. All you need is an email address.</p>
<div class="actions"><a class="btn" href="/collections/all">Browse the store</a><a class="btn secondary" href="/collections/children-ebooks">Children's books</a></div></div>
<div class="hero-art" aria-hidden="true">${heroPicks.map((p) => `<a href="/products/${p.handle}" tabindex="-1">${picture(cover(p).src, { sizes: "160px", eager: true, ...dims(cover(p)) })}</a>`).join("")}</div>
</div></section>
${trailerProducts.length ? `<section class="section"><div class="wrap"><div class="section-head"><h2>Watch the trailers</h2><a href="/collections/featured">See both books</a></div><div class="trailers">${trailerProducts.map(trailer).join("")}</div></div></section>` : ""}
<section class="section"><div class="wrap"><div class="section-head"><h2>Collections</h2></div><div class="collections">${collections
    .filter((c) => c.handle !== "featured")
    .map((c) => { const f = inCollection(c.handle)[0]; return `<a class="collection" href="/collections/${c.handle}">${f ? picture(cover(f).src, { sizes: "64px", ...dims(cover(f)) }) : ""}<div><strong>${esc(c.title)}</strong><span>${esc(c.description)}</span></div></a>`; })
    .join("")}</div></div></section>
<section class="section"><div class="wrap"><div class="section-head"><h2>All products</h2><a href="/collections/all">View all</a></div>${grid(products)}</div></section>
<section class="section"><div class="wrap"><div class="section-head"><h2>Latest news</h2><a href="/blogs/news">View all</a></div><ul class="posts">${articles.slice(0, 3).map(postCard).join("")}</ul></div></section>`,
}));

// Collections
page("/collections/all", "collections/all.html", layout({
  url: "/collections/all", title: "All products", current: "/collections/all",
  description: `All ${products.length} eBooks, fonts and downloads from ${site.wordmark}.`,
  body: `<div class="wrap section"><h1>All products</h1>${chips("all")}${grid(products)}</div>`,
}));
for (const c of collections) {
  page(`/collections/${c.handle}`, `collections/${c.handle}.html`, layout({
    url: `/collections/${c.handle}`, title: c.title, current: "/collections/all", description: c.description,
    body: `<div class="wrap section"><h1>${esc(c.title)}</h1><p class="muted">${esc(c.description)}</p>${chips(c.handle)}${grid(inCollection(c.handle))}</div>`,
  }));
}

// Products
for (const p of products) {
  const c = cover(p);
  const related = products.filter((x) => x.handle !== p.handle && x.collections.some((h) => p.collections.includes(h))).slice(0, 4);
  const free = p.price_fils === 0;
  const kindWord = p.kind === "font" ? "font file" : p.kind === "source code" ? "source code download" : p.kind === "bundle" ? "eBook bundle" : "eBook";
  page(`/products/${p.handle}`, `products/${p.handle}.html`, layout({
    url: `/products/${p.handle}`, title: p.title, current: "/collections/all", description: excerpt(p.description_html), og: img(c.src, 960),
    jsonld: {
      "@context": "https://schema.org", "@type": p.kind === "ebook" ? "Book" : "Product", name: p.title, image: site.url + img(c.src, 960), description: excerpt(p.description_html, 300), url: `${site.url}/products/${p.handle}`,
      ...(p.author ? { author: { "@type": "Person", name: p.author } } : {}),
      ...(p.kind === "ebook" ? { bookFormat: "https://schema.org/EBook" } : {}),
      offers: { "@type": "Offer", price: (p.price_fils / 1000).toFixed(3), priceCurrency: "KWD", availability: "https://schema.org/InStock", url: `${site.url}/products/${p.handle}`, seller: { "@type": "Organization", name: site.business.trade_name_en } },
    },
    body: `<div class="wrap"><div class="product">
<div class="gallery"><div class="main">${picture(c.src, { alt: `${p.title} cover`, sizes: "(max-width: 820px) 100vw, 560px", eager: true, ...dims(c) })}</div></div>
<div class="extras">
${p.images.length > 1 ? `<div class="thumbs">${p.images.slice(1).map((i) => `<a href="${img(i.src, 960)}">${picture(i.src, { alt: `${p.title}, inside page`, sizes: "140px", ...dims(i) })}</a>`).join("")}</div>` : ""}
${p.video ? `<div class="trailer"><video controls preload="none" playsinline poster="/media/video/${p.handle}.jpg" aria-label="${esc(p.title)} trailer"><source src="/media/video/${p.handle}.mp4" type="video/mp4"></video></div>` : ""}
</div>
<div class="buy" data-product="${p.handle}">
<p class="muted" style="margin:0">${esc(kindWord)}${p.author ? ` · by ${esc(p.author)}` : ""}</p>
<h1>${esc(p.title)}</h1>
<span class="price">${money(p.price_fils)}</span>
<div class="actions">
<button class="btn" type="button" data-buy-now="${p.handle}">${free ? "Get it free" : "Buy now"}</button>
${free ? "" : `<button class="btn secondary" type="button" data-add="${p.handle}">Add to cart</button>`}
</div>
<p class="msg" data-stock-msg hidden></p>
<ul class="facts">${p.kind === "ebook" || p.kind === "bundle" ? `<li>Formats: EPUB, PDF and Mobi (Kindle)${p.kind === "bundle" ? " for each book" : ""}</li>` : ""}<li>Final price, no extra fees</li><li>Instant download after ${free ? "confirming your email" : "payment"}</li><li>No address needed: just your email</li>${free ? "" : "<li>Pay with KNET, Visa, Mastercard or Apple Pay via Tap</li>"}<li>Download links are emailed and stay available in <a href="/downloads">My downloads</a></li></ul>
${p.includes.length ? `<div class="includes"><strong>This bundle includes</strong><ul>${p.includes.map((h) => bySlug[h]).filter(Boolean).map((x) => `<li><a href="/products/${x.handle}">${esc(x.title)}</a> (${money(x.price_fils)} on its own)</li>`).join("")}</ul></div>` : ""}
<section class="ar-info" lang="ar" dir="rtl"><h2>${esc(p.title_ar)}</h2><p class="muted">${esc(p.kind_ar)}${p.author ? " · تأليف جمال فيصل المطوع" : ""}</p><p>${esc(p.summary_ar)}</p><ul>${p.kind === "ebook" || p.kind === "bundle" ? "<li>الصيغ: EPUB وPDF وMobi (كيندل)</li>" : ""}<li>السعر: <strong>${moneyAr(p.price_fils)}</strong> (السعر نهائي، لا رسوم إضافية)</li><li>التسليم: تحميل فوري بعد ${free ? "تأكيد البريد الإلكتروني" : "الدفع"}، ويُرسل رابط التحميل إلى بريدك</li>${free ? "" : "<li>الدفع: كي نت، فيزا، ماستركارد، Apple Pay عبر Tap</li>"}<li>الإرجاع: حسب <a href="/policies/refund-policy">سياسة الإرجاع والاسترداد</a></li></ul></section>
<div class="desc prose">${p.description_html}</div>
</div>
</div>
${related.length ? `<section class="section"><div class="section-head"><h2>You may also like</h2></div>${grid(related)}</section>` : ""}
</div>`,
  }));
}

// Blog
page("/blogs/news", "blogs/news.html", layout({
  url: "/blogs/news", title: "News", current: "/blogs/news", description: `News and stories from ${site.wordmark}.`,
  body: `<div class="wrap section"><h1>News</h1><ul class="posts">${articles.map(postCard).join("")}</ul></div>`,
}));
for (const a of articles) {
  page(`/blogs/news/${a.handle}`, `blogs/news/${a.handle}.html`, layout({
    url: `/blogs/news/${a.handle}`, title: a.title, current: "/blogs/news", description: excerpt(a.body_html), og: a.image ? img(a.image, 960) : null,
    jsonld: { "@context": "https://schema.org", "@type": "BlogPosting", headline: a.title, datePublished: a.published, author: { "@type": "Organization", name: a.author }, publisher: { "@type": "Organization", name: site.name }, ...(a.image ? { image: site.url + img(a.image, 960) } : {}) },
    body: `<article class="wrap narrow section prose"><p class="muted"><a href="/blogs/news">News</a> · <time datetime="${a.published}">${date(a.published)}</time></p><h1>${esc(a.title)}</h1>${a.image ? `<img class="post-hero" src="${img(a.image, 960)}" alt="" width="960" height="540">` : ""}${a.body_html}</article>`,
  }));
}

// Policies (word for word from Shopify; bilingual, paragraphs pick their own direction)
for (const p of policies) {
  page(`/policies/${p.handle}`, `policies/${p.handle}.html`, layout({
    url: `/policies/${p.handle}`, title: p.title, description: `${p.title} for ${site.wordmark} (${site.business.trade_name_en}, commercial register ${site.business.cr_number}, license ${site.business.license}).`,
    body: `<article class="wrap narrow section prose"><h1>${esc(p.title)}</h1>${p.body_html}</article>`,
  }));
}

// App pages (filled in by app.js; not indexed)
const appPage = (url, title, body) => page(url, `${url.slice(1)}.html`, layout({ url, title, body, noindex: true, current: url }), { sitemap: false });
appPage("/cart", "Cart", `<div class="wrap narrow section"><h1>Your cart</h1><div data-cart><p class="muted">Loading your cart…</p></div></div>`);
appPage("/checkout", "Checkout", `<div class="wrap"><div class="checkout">
<div>
<h1>Checkout</h1>
<p class="muted">No address, no account. We only need your email so we can send your downloads.</p>
<section class="step panel" data-step="email"><h2><span class="n">1</span> Your email</h2>
<form data-form="email" novalidate><label for="email">Email address</label><input id="email" name="email" type="email" autocomplete="email" inputmode="email" required>
<p class="hint">We'll send a 6-digit code to confirm it's yours. Your downloads go to this address.</p>
<button class="btn wide" type="submit" style="margin-top:14px">Send code</button><p class="msg" role="status" data-msg></p></form>
<form data-form="code" hidden novalidate><label for="code">Enter the 6-digit code sent to <span data-email-echo></span></label><input id="code" name="code" class="code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required>
<div class="actions" style="margin-top:14px"><button class="btn" type="submit">Confirm</button><button class="link-btn" type="button" data-change-email>Use a different email</button><button class="link-btn" type="button" data-resend>Resend code</button></div><p class="msg" role="status" data-msg></p></form>
</section>
<section class="step panel" data-step="pay" hidden><h2><span class="n">2</span> Pay and download</h2>
<form data-form="pay" novalidate><label for="name">Your name</label><input id="name" name="name" type="text" autocomplete="name" maxlength="80" required>
<p class="hint">Printed on your receipt. Our payment provider requires a name.</p>
<label class="check"><input type="checkbox" name="terms" required> <span>I agree to the <a href="/policies/terms-of-service" target="_blank">terms of service</a> and the <a href="/policies/refund-policy" target="_blank">refund policy</a>. Digital products can't be returned once downloaded, except as the refund policy allows.<br><span lang="ar" dir="rtl">أوافق على <a href="/policies/terms-of-service" target="_blank">شروط الخدمة</a> و<a href="/policies/refund-policy" target="_blank">سياسة الإرجاع والاسترداد</a>.</span></span></label>
<button class="btn wide" type="submit" style="margin-top:16px" data-pay-label>Pay</button>
<p class="secure">${ICON.lock} Payment is handled on Tap's secure page (KNET, Visa, Mastercard, Apple Pay). We never see your card.</p>
<p class="msg" role="status" data-msg></p></form>
</section>
</div>
<aside><div class="panel"><h2>Order summary <span lang="ar" dir="rtl" class="muted" style="font-size:.9rem">ملخص الطلب</span></h2><div data-summary><p class="muted">Loading…</p></div>
<ul class="facts"><li>Total is final: no fees, no shipping · <span lang="ar" dir="rtl">المبلغ نهائي بدون رسوم</span></li><li>Delivery: instant download link by email · <span lang="ar" dir="rtl">التسليم فوري عبر البريد</span></li><li>Returns: <a href="/policies/refund-policy">refund policy</a> · <span lang="ar" dir="rtl">سياسة الإرجاع</span></li><li>An Arabic/English invoice is issued for every order · <span lang="ar" dir="rtl">فاتورة إلكترونية لكل طلب</span></li></ul></div></aside>
</div></div>`);
appPage("/order", "Your order", `<div class="wrap narrow section"><h1>Your order</h1><div class="panel" data-order><p class="muted">Checking your order…</p></div></div>`);
appPage("/downloads", "My downloads", `<div class="wrap narrow section"><h1>My downloads</h1><p class="muted">Lost your email? Confirm your address and we'll show everything you've bought.</p>
<div class="panel"><form data-form="email" novalidate><label for="email">Email address</label><input id="email" name="email" type="email" autocomplete="email" required><button class="btn wide" type="submit" style="margin-top:14px">Send code</button><p class="msg" role="status" data-msg></p></form>
<form data-form="code" hidden novalidate><label for="code">Enter the 6-digit code sent to <span data-email-echo></span></label><input id="code" name="code" class="code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required><div class="actions" style="margin-top:14px"><button class="btn" type="submit">Show my downloads</button><button class="link-btn" type="button" data-change-email>Use a different email</button></div><p class="msg" role="status" data-msg></p></form>
<div data-downloads></div></div></div>`);
const C = site.complaints;
page("/complaints", "complaints.html", layout({
  url: "/complaints", title: "Contact and complaints", current: "/complaints",
  description: `Contact ${site.wordmark} or file a complaint. ${site.business.trade_name_en}, commercial register ${site.business.cr_number}, license ${site.business.license}.`,
  body: `<div class="wrap narrow section">
<h1>Contact and complaints <span lang="ar" dir="rtl" class="muted" style="font-size:1.2rem">التواصل والشكاوى</span></h1>
<div class="prose">
<p>Something wrong with an order, a download or our website? Tell us below and you'll get a reference number by email straight away. We reply within ${C.ack_business_days} business days and aim to resolve every complaint within ${C.resolve_business_days} business days.</p>
<p lang="ar" dir="rtl">هل لديك مشكلة في طلب أو تحميل أو في الموقع؟ أرسل لنا شكواك عبر النموذج وستصلك رسالة برقم مرجعي فوراً. نرد خلال ${C.ack_business_days} يوم عمل، ونسعى لحل كل شكوى خلال ${C.resolve_business_days} أيام عمل.</p>
</div>
<div class="panel" style="margin:20px 0"><form data-form="complaint" novalidate>
<label for="c-name">Name · الاسم</label><input id="c-name" name="name" type="text" autocomplete="name" maxlength="80" required>
<label for="c-email">Email · البريد الإلكتروني</label><input id="c-email" name="email" type="email" autocomplete="email" required>
<label for="c-order">Order number, if any · رقم الطلب (إن وجد)</label><input id="c-order" name="order" type="text" maxlength="20" placeholder="SC-XXXXXXXX">
<label for="c-msg">What happened? · تفاصيل الشكوى</label><textarea id="c-msg" name="message" rows="6" maxlength="4000" required></textarea>
<button class="btn wide" type="submit" style="margin-top:14px">Send · إرسال</button><p class="msg" role="status" data-msg></p>
</form></div>
<div class="prose">
<h2>Other ways to reach us · طرق أخرى للتواصل</h2>
<ul><li>Email · البريد: <a href="mailto:${site.email}">${site.email}</a></li>${site.business.phone ? `<li>Phone · الهاتف: <a href="tel:${site.business.phone.replace(/\s/g, "")}">${esc(site.business.phone)}</a></li>` : ""}<li>Post · البريد العادي: ${esc(site.business.address_en)}</li></ul>
<h2>Not satisfied? · إذا لم تُحل شكواك</h2>
<p>You can complain to the Ministry of Commerce and Industry's consumer protection department online at the <a href="${C.moci_url}" rel="noopener">Kuwait Government Online consumer complaints service</a>, or by calling <strong>${C.moci_phone}</strong>.</p>
<p lang="ar" dir="rtl">يمكنك تقديم شكوى إلى إدارة حماية المستهلك في وزارة التجارة والصناعة عبر <a href="${C.moci_url}" rel="noopener">خدمة شكاوى المستهلكين في بوابة الكويت الإلكترونية</a> أو الاتصال على الرقم <strong>${C.moci_phone}</strong>.</p>
</div></div>`,
}));
appPage("/invoice", "Invoice", `<div class="wrap narrow section"><div data-invoice><p class="muted">Loading invoice…</p></div></div>`);
write("404.html", layout({ url: "/404", title: "Page not found", noindex: true, body: `<div class="wrap narrow section"><h1>Page not found</h1><p>That page doesn't exist (any more). Try the <a href="/collections/all">store</a> or the <a href="/blogs/news">blog</a>.</p></div>` }));

// ---------- data for app.js ----------
write("catalog.json", JSON.stringify({
  products: Object.fromEntries(products.map((p) => [p.handle, { title: p.title, title_ar: p.title_ar, kind_ar: p.kind_ar, price_fils: p.price_fils, img: img(cover(p).src, 480), includes: p.includes }])),
  download_days: site.download_days,
  seller: identity(site.business, site.email, { invoice: true }),
}));

// ---------- feeds, sitemap, headers ----------
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((u) => `<url><loc>${site.url}${u === "/" ? "/" : u}</loc></url>`).join("\n")}\n</urlset>\n`);
write("robots.txt", `User-agent: *\nDisallow: /cart\nDisallow: /checkout\nDisallow: /order\nDisallow: /downloads\nDisallow: /api/\nDisallow: /dl/\nSitemap: ${site.url}/sitemap.xml\n`);
write("blogs/news.atom", `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"><title>${esc(site.name)} – News</title><link href="${site.url}/blogs/news"/><link rel="self" href="${site.url}/blogs/news.atom"/><id>${site.url}/blogs/news</id><updated>${articles[0].published}</updated>
${articles.map((a) => `<entry><title>${esc(a.title)}</title><link href="${site.url}/blogs/news/${a.handle}"/><id>${site.url}/blogs/news/${a.handle}</id><published>${a.published}</published><updated>${a.published}</updated><author><name>${esc(a.author)}</name></author><content type="html">${esc(a.body_html)}</content></entry>`).join("\n")}
</feed>\n`);

const CSP = [
  "default-src 'self'",
  `script-src 'self' ${inlineHashes.join(" ")} https://gc.zgo.at`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://salacompany.goatcounter.com",
  "media-src 'self'",
  "connect-src 'self' https://salacompany.goatcounter.com",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
].join("; ");
write("_headers", `/*
  Content-Security-Policy: ${CSP}
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Strict-Transport-Security: max-age=31536000
/assets/*
  Cache-Control: public, max-age=31536000, immutable
/media/*
  Cache-Control: public, max-age=604800
`);
// Old Shopify paths that aren't pages here.
write("_redirects", `/collections/:c/products/:p /products/:p 301
/products/:p.json /products/:p 301
/collections/all/:x /collections/all 301
/blogs/news/tagged/* /blogs/news 301
/account /downloads 302
/account/* /downloads 302
/pages/contact /policies/contact-information 301
/pages/* / 302
/search /collections/all 302
/collections /collections/all 301
${allProducts.filter((p) => p.hidden).map((p) => `/products/${p.handle} /collections/all 302\n`).join("")}/blogs /blogs/news 301
`);
console.log(`built ${pages.length} indexed pages into public/`);

// sala.company store Worker: serves the static storefront (public/) and the small API behind it.
//
//   POST /api/verify/start   {email}                 -> emails a 6-digit code
//   POST /api/verify/check   {email, code}           -> {token, email, expires}  (signed, 2 h)
//   POST /api/checkout       {token, name, items[], terms:true} -> {redirect, order_id, view}
//   GET  /api/order?id=&t=                           -> order status (+ download links once paid)
//   POST /api/downloads      {token}                 -> every paid order for that email, with fresh links
//   POST /api/tap/webhook    (Tap charge object)     -> re-fetches the charge from Tap, fulfils if CAPTURED
//   POST /api/complaint     {name, email, order_id?, message} -> {reference}  (stored, emailed to owner + customer)
//   GET  /api/stock                                  -> handles whose files are uploaded
//   GET  /dl/<order>/<file>?x=&s=                    -> streams a private file from R2 (signed, expiring, counted)
//
// Ebook files live in the private R2 bucket (binding FILES) under ebooks/<product-handle>/<file name>.
// Nothing in R2 is public; the only way out is a signed /dl link for a paid order.
import products from "../catalog/products.json";
import site from "../catalog/site.json";
import { hmac, sha256, same, randomCode, orderId, b64urlText, fromB64urlText } from "./crypto.js";
import { createCharge, getCharge, toFils, FAILED } from "./tap.js";
import { send, codeEmail, receiptEmail, ownerEmail, complaintEmail, complaintOwnerEmail } from "./email.js";

const CATALOG = Object.fromEntries(products.map((p) => [p.handle, p]));
const EMAIL_RE = /^[^\s@<>()",;:]{1,64}@[^\s@<>()",;:]+\.[^\s@<>()",;:]{2,}$/;
const now = () => Math.floor(Date.now() / 1000);
const iso = () => new Date().toISOString();

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith("/dl/")) return await download(request, env, url);
      if (url.pathname.startsWith("/api/")) return await route(request, env, ctx, url);
      return env.ASSETS.fetch(request);
    } catch (err) {
      if (err instanceof HttpError) {
        if (url.pathname.startsWith("/dl/")) return page(err.status, err.message);
        return json({ error: err.message }, err.status);
      }
      console.error(err.stack || err);
      return json({ error: "Something went wrong on our side. Please try again in a moment." }, 500);
    }
  },
};

async function route(request, env, ctx, url) {
  const p = url.pathname;
  if (request.method === "GET") {
    if (p === "/api/order") return order(env, ctx, url);
    if (p === "/api/stock") return json({ available: await availableHandles(env) }, 200, { "cache-control": "public, max-age=60" });
    throw new HttpError(404, "Not found");
  }
  if (request.method !== "POST") throw new HttpError(405, "Method not allowed");
  if (p === "/api/tap/webhook") return webhook(request, env, ctx);
  sameOrigin(request, env, url);
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") throw new HttpError(400, "Bad request");
  const ip = request.headers.get("cf-connecting-ip") || "local";
  if (p === "/api/verify/start") return verifyStart(env, body, ip);
  if (p === "/api/verify/check") return verifyCheck(env, body);
  if (p === "/api/checkout") return checkout(env, ctx, body, ip, url);
  if (p === "/api/downloads") return downloads(env, body, url);
  if (p === "/api/complaint") return complaint(env, ctx, body, ip);
  throw new HttpError(404, "Not found");
}

// Browser-only endpoints: refuse cross-site requests.
function sameOrigin(request, env, url) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const ok = [url.origin, env.SITE_URL].filter(Boolean).map((o) => o.replace(/\/$/, ""));
  if (!ok.includes(origin)) throw new HttpError(403, "Forbidden");
  if (!(request.headers.get("content-type") || "").includes("application/json")) throw new HttpError(415, "Expected JSON");
}

// Links in emails and Tap redirects use SITE_URL when set (production), else the address the Worker was reached at (staging).
const siteUrl = (env, url) => (env.SITE_URL || url.origin).replace(/\/$/, "");

// ---------- rate limiting + audit ----------
async function limit(env, key, max, windowSec) {
  const t = now();
  const row = await env.DB.prepare(
    `INSERT INTO ratelimit (key, count, expires) VALUES (?1, 1, ?2)
     ON CONFLICT(key) DO UPDATE SET count = CASE WHEN expires < ?3 THEN 1 ELSE count + 1 END,
                                    expires = CASE WHEN expires < ?3 THEN ?2 ELSE expires END
     RETURNING count`,
  ).bind(key, t + windowSec, t).first();
  if (row.count > max) throw new HttpError(429, "Too many attempts. Please wait a few minutes and try again.");
}
const log = (env, orderId, kind, detail) =>
  env.DB.prepare("INSERT INTO events (at, order_id, kind, detail) VALUES (?, ?, ?, ?)").bind(iso(), orderId, kind, detail == null ? null : String(detail).slice(0, 2000)).run();

// ---------- email verification ----------
const codeHash = (env, email, code) => sha256(`${env.SIGNING_SECRET}|code|${email}|${code}`);
function cleanEmail(v) {
  const email = String(v || "").trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) throw new HttpError(400, "Please enter a valid email address.");
  return email;
}

async function verifyStart(env, body, ip) {
  const email = cleanEmail(body.email);
  await limit(env, `start:email:${email}`, 5, 3600);
  await limit(env, `start:ip:${ip}`, 20, 3600);
  const code = randomCode();
  await env.DB.prepare(
    `INSERT INTO codes (email, code_hash, expires, attempts) VALUES (?1, ?2, ?3, 0)
     ON CONFLICT(email) DO UPDATE SET code_hash = ?2, expires = ?3, attempts = 0`,
  ).bind(email, await codeHash(env, email, code), now() + 600).run();
  try {
    await send(env, { to: email, ...codeEmail(code) });
  } catch (err) {
    console.error(err.message);
    throw new HttpError(503, "We couldn't send the email just now. Please try again in a minute.");
  }
  return json({ ok: true });
}

async function verifyCheck(env, body) {
  const email = cleanEmail(body.email);
  const code = String(body.code || "").replace(/\D/g, "");
  const row = await env.DB.prepare("SELECT code_hash, expires, attempts FROM codes WHERE email = ?").bind(email).first();
  if (!row || row.expires < now()) throw new HttpError(400, "That code has expired. Request a new one.");
  if (row.attempts >= 5) throw new HttpError(429, "Too many wrong codes. Request a new one.");
  if (code.length !== 6 || !same(row.code_hash, await codeHash(env, email, code))) {
    await env.DB.prepare("UPDATE codes SET attempts = attempts + 1 WHERE email = ?").bind(email).run();
    throw new HttpError(400, "That code isn't right. Check the email and try again.");
  }
  await env.DB.prepare("DELETE FROM codes WHERE email = ?").bind(email).run();
  const expires = now() + 2 * 3600;
  const payload = b64urlText(JSON.stringify({ e: email, x: expires }));
  return json({ token: `${payload}.${await hmac(env.SIGNING_SECRET, `verified|${payload}`)}`, email, expires });
}

async function verifiedEmail(env, token) {
  const [payload, sig] = String(token || "").split(".");
  if (!payload || !sig || !same(sig, await hmac(env.SIGNING_SECRET, `verified|${payload}`))) throw new HttpError(401, "Please confirm your email again.");
  let data;
  try { data = JSON.parse(fromB64urlText(payload)); } catch { throw new HttpError(401, "Please confirm your email again."); }
  if (!data.x || data.x < now()) throw new HttpError(401, "Your email confirmation expired. Please confirm it again.");
  return data.e;
}

// ---------- files ----------
// Files for a product: everything under ebooks/<handle>/, plus the files of the products a bundle includes.
async function listFiles(env, handle, seen = new Set()) {
  if (seen.has(handle)) return [];
  seen.add(handle);
  const keys = [];
  let cursor;
  do {
    const page = await env.FILES.list({ prefix: `ebooks/${handle}/`, cursor });
    keys.push(...page.objects.map((o) => o.key).filter((k) => !k.endsWith("/")));
    cursor = page.truncated ? page.cursor : null;
  } while (cursor);
  for (const h of CATALOG[handle]?.includes || []) keys.push(...(await listFiles(env, h, seen)));
  return keys;
}
async function orderFiles(env, items) {
  const all = [];
  for (const i of items) for (const k of await listFiles(env, i.handle)) if (!all.includes(k)) all.push(k);
  return all;
}
const fileName = (key) => key.split("/").pop();

async function availableHandles(env) {
  const have = new Set();
  let cursor;
  do {
    const page = await env.FILES.list({ prefix: "ebooks/", cursor });
    for (const o of page.objects) { const h = o.key.split("/")[1]; if (h && !o.key.endsWith("/")) have.add(h); }
    cursor = page.truncated ? page.cursor : null;
  } while (cursor);
  const ok = (h, seen = new Set()) => !seen.has(h) && (seen.add(h), have.has(h) || ((CATALOG[h]?.includes || []).length > 0 && CATALOG[h].includes.every((x) => ok(x, seen))));
  return products.map((p) => p.handle).filter((h) => ok(h));
}

const viewToken = async (env, id) => (await hmac(env.SIGNING_SECRET, `view|${id}`)).slice(0, 32);

async function signedLinks(env, order, base) {
  const items = JSON.parse(order.items);
  const exp = now() + site.download_days * 86400;
  const keys = await orderFiles(env, items);
  return Promise.all(keys.map(async (key) => {
    const k = b64urlText(key);
    const s = await hmac(env.SIGNING_SECRET, `dl|${order.id}|${key}|${exp}`);
    return { name: fileName(key), url: `${base}/dl/${encodeURIComponent(order.id)}/${k}?x=${exp}&s=${s}` };
  }));
}

// ---------- checkout ----------
async function checkout(env, ctx, body, ip, url) {
  const email = await verifiedEmail(env, body.token);
  const name = String(body.name || "").replace(/\s+/g, " ").trim();
  if (!name || name.length > 80) throw new HttpError(400, "Please enter your name (up to 80 characters).");
  if (body.terms !== true) throw new HttpError(400, "Please agree to the terms and refund policy.");
  const handles = Array.isArray(body.items) ? [...new Set(body.items.map(String))] : [];
  if (!handles.length || handles.length > 30) throw new HttpError(400, "Your cart is empty.");
  const unknown = handles.filter((h) => !CATALOG[h]);
  if (unknown.length) throw new HttpError(400, "Some items are no longer available. Please refresh your cart.");
  await limit(env, `checkout:email:${email}`, 20, 3600);

  // Never sell something we can't deliver.
  const missing = [];
  for (const h of handles) if (!(await listFiles(env, h)).length) missing.push(CATALOG[h].title);
  if (missing.length) throw new HttpError(409, `Not available for download yet: ${missing.join(", ")}. Please remove it from your cart.`);

  const items = handles.map((h) => ({ handle: h, title: CATALOG[h].title, price_fils: CATALOG[h].price_fils }));
  const total = items.reduce((s, i) => s + i.price_fils, 0);
  const id = orderId();
  const view = await viewToken(env, id);
  const base = siteUrl(env, url);
  const order = { id, email, name, items: JSON.stringify(items), total_fils: total, created_at: iso(), terms_accepted_at: iso() };
  await env.DB.prepare(
    `INSERT INTO orders (id, email, name, items, total_fils, currency, status, created_at, terms_accepted_at, ip)
     VALUES (?, ?, ?, ?, ?, 'KWD', 'pending', ?, ?, ?)`,
  ).bind(id, email, name, order.items, total, order.created_at, order.terms_accepted_at, ip).run();
  await log(env, id, "created", `${total} fils, ${handles.join(",")}`);
  const orderPage = `${base}/order?id=${encodeURIComponent(id)}&t=${view}`;

  if (total === 0) {
    await fulfil(env, ctx, id, base, "free");
    return json({ redirect: orderPage, order_id: id, view });
  }
  let charge;
  try {
    charge = await createCharge(env, { order, site: base, viewToken: view });
  } catch (err) {
    console.error(err.message);
    await env.DB.prepare("UPDATE orders SET status = 'failed', tap_status = 'CREATE_FAILED' WHERE id = ?").bind(id).run();
    await log(env, id, "tap_create_failed", err.message);
    throw new HttpError(502, "The payment page couldn't be opened. You haven't been charged. Please try again.");
  }
  await env.DB.prepare("UPDATE orders SET tap_charge_id = ?, tap_status = ? WHERE id = ?").bind(charge.id, charge.status, id).run();
  await log(env, id, "tap_charge", `${charge.id} ${charge.status}`);
  const redirect = charge.transaction?.url;
  if (!redirect) throw new HttpError(502, "The payment page couldn't be opened. You haven't been charged. Please try again.");
  return json({ redirect, order_id: id, view });
}

// Mark paid exactly once, then email the buyer (and the owner).
async function fulfil(env, ctx, id, base, via) {
  const res = await env.DB.prepare("UPDATE orders SET status = 'paid', paid_at = ? WHERE id = ? AND status != 'paid'").bind(iso(), id).run();
  if (!res.meta.changes) return;
  await log(env, id, "paid", via);
  const order = await env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(id).first();
  const orderUrl = `${base}/order?id=${encodeURIComponent(id)}&t=${await viewToken(env, id)}`;
  try {
    await send(env, { to: order.email, ...receiptEmail(order, await signedLinks(env, order, base), orderUrl) });
    await env.DB.prepare("UPDATE orders SET emailed_at = ? WHERE id = ?").bind(iso(), id).run();
    await log(env, id, "emailed", order.email);
  } catch (err) {
    // The order page still shows the links; the buyer can also use /downloads.
    console.error(err.message);
    await log(env, id, "email_failed", err.message);
  }
  if (env.OWNER_EMAIL) ctx.waitUntil(send(env, { to: env.OWNER_EMAIL, ...ownerEmail(order) }).catch((e) => console.error(e.message)));
}

// Ask Tap (never the browser or the webhook body) what happened to the charge.
async function confirm(env, ctx, order, base) {
  if (order.status !== "pending" || !order.tap_charge_id) return order.status;
  const charge = await getCharge(env, order.tap_charge_id);
  const matches = (charge.metadata?.order_id === order.id || charge.reference?.order === order.id) && charge.currency === "KWD" && toFils(charge.amount) === order.total_fils;
  if (charge.status !== order.tap_status) {
    await env.DB.prepare("UPDATE orders SET tap_status = ? WHERE id = ?").bind(charge.status, order.id).run();
    await log(env, order.id, "tap_status", charge.status);
  }
  if (!matches) {
    await log(env, order.id, "tap_mismatch", JSON.stringify({ amount: charge.amount, currency: charge.currency, metadata: charge.metadata, reference: charge.reference }));
    return "pending";
  }
  if (charge.status === "CAPTURED") {
    await fulfil(env, ctx, order.id, base, `tap ${charge.id}`);
    return "paid";
  }
  if (FAILED.has(charge.status)) {
    await env.DB.prepare("UPDATE orders SET status = 'failed' WHERE id = ? AND status = 'pending'").bind(order.id).run();
    return "failed";
  }
  return "pending";
}

async function webhook(request, env, ctx) {
  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" && /^chg_[A-Za-z0-9_]+$/.test(body.id) ? body.id : null;
  if (!id) return json({ ok: true, ignored: "no charge id" });
  const order = await env.DB.prepare("SELECT * FROM orders WHERE tap_charge_id = ?").bind(id).first();
  if (!order) return json({ ok: true, ignored: "unknown charge" });
  await log(env, order.id, "webhook", body.status);
  const status = await confirm(env, ctx, order, siteUrl(env, new URL(request.url)));
  return json({ ok: true, status });
}

async function order(env, ctx, url) {
  const id = url.searchParams.get("id") || "";
  const t = url.searchParams.get("t") || "";
  if (!id || !same(t, await viewToken(env, id))) throw new HttpError(404, "We couldn't find that order.");
  let row = await env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(id).first();
  if (!row) throw new HttpError(404, "We couldn't find that order.");
  const base = siteUrl(env, url);
  if (row.status === "pending") {
    try { await confirm(env, ctx, row, base); } catch (err) { console.error(err.message); }
    row = await env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(id).first();
  }
  return json({
    id: row.id, status: row.status, name: row.name, email: row.email,
    items: JSON.parse(row.items), total_fils: row.total_fils, link_days: site.download_days,
    created_at: row.created_at, paid_at: row.paid_at, payment: row.tap_charge_id ? "tap" : row.total_fils === 0 ? "free" : null, tap_charge_id: row.tap_charge_id,
    files: row.status === "paid" ? await signedLinks(env, row, base) : [],
  });
}

async function downloads(env, body, url) {
  const email = await verifiedEmail(env, body.token);
  const base = siteUrl(env, url);
  const { results } = await env.DB.prepare("SELECT * FROM orders WHERE email = ? AND status = 'paid' ORDER BY paid_at DESC LIMIT 100").bind(email).all();
  return json({
    orders: await Promise.all(results.map(async (o) => ({ id: o.id, view: await viewToken(env, o.id), paid_at: o.paid_at, items: JSON.parse(o.items), files: await signedLinks(env, o, base) }))),
  });
}

// ---------- complaints ----------
async function complaint(env, ctx, body, ip) {
  const email = cleanEmail(body.email);
  const name = String(body.name || "").replace(/\s+/g, " ").trim().slice(0, 80);
  const message = String(body.message || "").trim();
  const orderRef = String(body.order_id || "").trim().toUpperCase().slice(0, 20) || null;
  if (!name) throw new HttpError(400, "Please enter your name.");
  if (message.length < 5 || message.length > 4000) throw new HttpError(400, "Please describe the problem (up to 4000 characters).");
  await limit(env, `complaint:ip:${ip}`, 5, 3600);
  await limit(env, `complaint:email:${email}`, 5, 3600);
  const id = orderId().replace(/^SC-/, "C-");
  await env.DB.prepare("INSERT INTO complaints (id, created_at, name, email, order_id, message, ip) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(id, iso(), name, email, orderRef, message, ip).run();
  const c = { id, name, email, order_id: orderRef, message };
  // The reference is stored either way; email failures are logged, not shown.
  ctx.waitUntil(Promise.all([
    send(env, { to: email, ...complaintEmail(c) }),
    env.OWNER_EMAIL ? send(env, { to: env.OWNER_EMAIL, replyTo: email, ...complaintOwnerEmail(c) }) : null,
  ]).catch((e) => console.error(e.message)));
  return json({ reference: id });
}

// ---------- private file delivery ----------
async function download(request, env, url) {
  if (request.method !== "GET" && request.method !== "HEAD") throw new HttpError(405, "Method not allowed");
  const [, , rawId, k] = url.pathname.split("/");
  const id = decodeURIComponent(rawId || "");
  const exp = Number(url.searchParams.get("x"));
  const sig = url.searchParams.get("s") || "";
  let key;
  try { key = fromB64urlText(k || ""); } catch { throw new HttpError(404, "This download link isn't valid."); }
  if (!id || !key || !same(sig, await hmac(env.SIGNING_SECRET, `dl|${id}|${key}|${exp}`))) throw new HttpError(403, "This download link isn't valid.");
  if (!(exp > now())) throw new HttpError(410, "This download link has expired.");
  const order = await env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(id).first();
  if (!order || order.status !== "paid") throw new HttpError(403, "This download link isn't valid.");
  if (!(await orderFiles(env, JSON.parse(order.items))).includes(key)) throw new HttpError(404, "This file is no longer available.");
  if (request.method === "GET") {
    const row = await env.DB.prepare(
      `INSERT INTO downloads (order_id, file, count, last_at) VALUES (?1, ?2, 1, ?3)
       ON CONFLICT(order_id, file) DO UPDATE SET count = count + 1, last_at = ?3 RETURNING count`,
    ).bind(id, key, iso()).first();
    if (row.count > site.max_downloads) throw new HttpError(429, `This file has been downloaded ${site.max_downloads} times. Email ${site.email} with your order number if you need it again.`);
  }
  const obj = request.method === "HEAD" ? await env.FILES.head(key) : await env.FILES.get(key);
  if (!obj) throw new HttpError(404, "This file is no longer available.");
  const name = fileName(key);
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  if (!headers.get("content-type")) headers.set("content-type", contentType(name));
  headers.set("content-disposition", `attachment; filename="${name.replace(/[^\x20-\x7e]|"/g, "_")}"; filename*=UTF-8''${encodeURIComponent(name)}`);
  headers.set("content-length", String(obj.size));
  headers.set("cache-control", "private, no-store");
  headers.set("x-robots-tag", "noindex");
  headers.set("x-content-type-options", "nosniff");
  return new Response(request.method === "HEAD" ? null : obj.body, { headers });
}

function contentType(name) {
  const ext = name.split(".").pop().toLowerCase();
  return { pdf: "application/pdf", epub: "application/epub+zip", zip: "application/zip", ttf: "font/ttf", otf: "font/otf", woff: "font/woff", woff2: "font/woff2", mobi: "application/x-mobipocket-ebook", txt: "text/plain; charset=utf-8" }[ext] || "application/octet-stream";
}

function page(status, message) {
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Download – ${site.wordmark}</title>
<body style="font:16px/1.6 system-ui,sans-serif;max-width:560px;margin:15vh auto;padding:0 16px;color:#1c1420"><h1 style="font-size:1.4rem">${message.replace(/</g, "&lt;")}</h1>
<p>Get fresh links for everything you've bought at <a href="/downloads">My downloads</a>, or email <a href="mailto:${site.email}">${site.email}</a>.</p></body>`;
  return new Response(html, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });
}

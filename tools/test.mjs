// End-to-end test: runs the real Worker in `wrangler dev` (local D1 + R2) against fake Tap and Resend servers.
//   npm test        (builds public/ first)
import { spawn, execFileSync } from "node:child_process";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const STATE = path.join(root, ".test/state");
const PORT = 8790 + Math.floor(Math.random() * 100);
const MOCK = PORT + 200;
const BASE = `http://127.0.0.1:${PORT}`;
const wrangler = path.join(root, "node_modules/.bin/wrangler");

// ---------- fake Tap + Resend ----------
const charges = new Map();
const emails = [];
let failNextCharge = false;
const mock = http.createServer(async (req, res) => {
  let body = "";
  for await (const c of req) body += c;
  const send = (code, obj) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(obj)); };
  if (req.url === "/emails" && req.method === "POST") {
    assert.equal(req.headers.authorization, "Bearer re_test");
    emails.push(JSON.parse(body));
    return send(200, { id: `em_${emails.length}` });
  }
  if (req.url === "/v2/charges" && req.method === "POST") {
    assert.equal(req.headers.authorization, "Bearer sk_test_x");
    if (failNextCharge) { failNextCharge = false; return send(400, { errors: [{ code: "1", description: "test failure" }] }); }
    const c = JSON.parse(body);
    const id = `chg_TS${charges.size + 1}`;
    const charge = { ...c, id, status: "INITIATED", transaction: { url: `http://127.0.0.1:${MOCK}/pay/${id}` } };
    charges.set(id, charge);
    return send(200, charge);
  }
  const m = req.url.match(/^\/v2\/charges\/(chg_\w+)$/);
  if (m && req.method === "GET") return charges.has(m[1]) ? send(200, charges.get(m[1])) : send(404, { errors: [{ description: "not found" }] });
  send(404, {});
});
await new Promise((r) => mock.listen(MOCK, "127.0.0.1", r));

// ---------- local state: schema + private files ----------
fs.rmSync(path.join(root, ".test"), { recursive: true, force: true });
fs.mkdirSync(path.join(root, ".test/files"), { recursive: true });
const run = (args) => execFileSync(wrangler, args, { cwd: root, stdio: "pipe", env: { ...process.env, WRANGLER_SEND_METRICS: "false" } });
run(["d1", "migrations", "apply", "store", "--local", "--persist-to", STATE]);
const put = (key, content) => {
  const f = path.join(root, ".test/files", key.replace(/\//g, "_"));
  fs.writeFileSync(f, content);
  run(["r2", "object", "put", `sala-ebooks/${key}`, "--local", "--persist-to", STATE, "--file", f]);
};
put("ebooks/the-nadia-upgrade/The Nadia Upgrade.pdf", "%PDF-nadia");
put("ebooks/fun-kuwait/FunKuwait.ttf", "font-bytes");
put("ebooks/the-ai-powered-productivity-handbook/Productivity.pdf", "%PDF-prod");
put("ebooks/art-in-the-age-of-ai/Art.pdf", "%PDF-art");
put("ebooks/super-coder/SuperCoder.pdf", "%PDF-coder");

// ---------- start the Worker ----------
const vars = { SITE_URL: BASE, TAP_API: `http://127.0.0.1:${MOCK}/v2`, RESEND_API: `http://127.0.0.1:${MOCK}`, TAP_SECRET_KEY: "sk_test_x", RESEND_API_KEY: "re_test", SIGNING_SECRET: "test-secret-1234567890", OWNER_EMAIL: "owner@example.com" };
const dev = spawn(wrangler, ["dev", "--local", "--port", String(PORT), "--ip", "127.0.0.1", "--persist-to", STATE, "--show-interactive-dev-session=false", ...Object.entries(vars).flatMap(([k, v]) => ["--var", `${k}:${v}`])], { cwd: root, env: { ...process.env, WRANGLER_SEND_METRICS: "false" } });
let devLog = "";
dev.stdout.on("data", (d) => (devLog += d));
dev.stderr.on("data", (d) => (devLog += d));
const stop = () => { try { dev.kill("SIGTERM"); } catch {} mock.close(); };
process.on("exit", stop);
for (let i = 0; ; i++) {
  try { if ((await fetch(BASE + "/")).ok) break; } catch {}
  if (i > 120) { console.error(devLog); throw new Error("wrangler dev did not start"); }
  await new Promise((r) => setTimeout(r, 500));
}

// ---------- helpers ----------
let passed = 0;
const test = async (name, fn) => {
  try { await fn(); passed++; console.log(`ok  ${name}`); }
  catch (err) { console.error(`FAIL ${name}\n`, err); console.error(devLog.slice(-3000)); stop(); process.exit(1); }
};
const post = async (p, body, headers = {}) => {
  const r = await fetch(BASE + p, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
const get = async (p) => { const r = await fetch(BASE + p, { redirect: "manual" }); return { status: r.status, body: await r.json().catch(() => ({})) }; };
const lastCode = (to) => { const e = [...emails].reverse().find((m) => m.to[0] === to && /code/.test(m.subject)); return e && e.subject.match(/^(\d{6})/)[1]; };
const verify = async (email) => {
  const s = await post("/api/verify/start", { email });
  assert.equal(s.status, 200, JSON.stringify(s.body));
  const v = await post("/api/verify/check", { email, code: lastCode(email.toLowerCase()) });
  assert.equal(v.status, 200, JSON.stringify(v.body));
  return v.body.token;
};

// ---------- storefront ----------
await test("pages render with Ministry of Commerce details", async () => {
  for (const p of ["/", "/collections/all", "/products/the-nadia-upgrade", "/blogs/news/welcome-to-sala-company", "/policies/refund-policy", "/checkout", "/downloads"]) {
    const r = await fetch(BASE + p);
    assert.equal(r.status, 200, p);
    const h = await r.text();
    assert.match(h, /502625/, `${p} shows license`);
    assert.match(h, /SALA CO FOR COMPUTER CONSULTING/, `${p} shows trade name`);
  }
  assert.match(await (await fetch(BASE + "/policies/refund-policy")).text(), /سياسة الإرجاع والاسترداد/);
});
await test("unknown page is a 404 page, old Shopify paths redirect", async () => {
  assert.equal((await fetch(BASE + "/nope")).status, 404);
  const r = await fetch(BASE + "/collections/business/products/stock-market-for-the-young", { redirect: "manual" });
  assert.equal(r.status, 301);
  assert.match(r.headers.get("location"), /\/products\/stock-market-for-the-young$/);
});
await test("stock lists only products whose files are uploaded (bundle needs all parts)", async () => {
  const { body } = await get("/api/stock");
  assert.ok(body.available.includes("the-nadia-upgrade"));
  assert.ok(body.available.includes("ai-revolution-collection-from-art-to-code"));
  assert.ok(!body.available.includes("reddington-the-fox"));
});
await test("ebook files are not reachable as static files", async () => {
  assert.equal((await fetch(BASE + "/ebooks/the-nadia-upgrade/The%20Nadia%20Upgrade.pdf")).status, 404);
});

// ---------- verification ----------
await test("bad email rejected; wrong code rejected; 6th wrong attempt locked", async () => {
  assert.equal((await post("/api/verify/start", { email: "not-an-email" })).status, 400);
  await post("/api/verify/start", { email: "lock@example.com" });
  for (let i = 0; i < 5; i++) assert.equal((await post("/api/verify/check", { email: "lock@example.com", code: "000000" === lastCode("lock@example.com") ? "111111" : "000000" })).status, 400);
  assert.equal((await post("/api/verify/check", { email: "lock@example.com", code: lastCode("lock@example.com") })).status, 429);
});
await test("verify/start is rate limited per email", async () => {
  const codes = [];
  for (let i = 0; i < 6; i++) codes.push((await post("/api/verify/start", { email: "spam@example.com" })).status);
  assert.deepEqual(codes, [200, 200, 200, 200, 200, 429]);
});
await test("cross-site POST refused", async () => {
  assert.equal((await post("/api/verify/start", { email: "x@example.com" }, { origin: "https://evil.example" })).status, 403);
});

// ---------- paid order ----------
let paid;
await test("checkout requires a verified email, terms and known items", async () => {
  assert.equal((await post("/api/checkout", { token: "bad.token", name: "A", items: ["the-nadia-upgrade"], terms: true })).status, 401);
  const token = await verify("buyer@example.com");
  assert.equal((await post("/api/checkout", { token, name: "A", items: ["the-nadia-upgrade"], terms: false })).status, 400);
  assert.equal((await post("/api/checkout", { token, name: "A", items: ["nope"], terms: true })).status, 400);
  const missing = await post("/api/checkout", { token, name: "A", items: ["reddington-the-fox"], terms: true });
  assert.equal(missing.status, 409);
  assert.match(missing.body.error, /Reddington/);
});
await test("paid checkout creates a Tap charge with server-side price and no address", async () => {
  const token = await verify("Buyer@Example.com");
  const r = await post("/api/checkout", { token, name: "Jamal Almutawa", items: ["the-nadia-upgrade"], terms: true, price_fils: 1 });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.match(r.body.redirect, /\/pay\/chg_/);
  const charge = [...charges.values()].at(-1);
  assert.equal(charge.amount, 4);
  assert.equal(charge.currency, "KWD");
  assert.equal(charge.customer.email, "buyer@example.com");
  assert.equal(charge.customer.first_name, "Jamal");
  assert.equal(charge.metadata.order_id, r.body.order_id);
  assert.ok(!JSON.stringify(charge).match(/address/i));
  paid = { ...r.body, charge: charge.id };
});
await test("order stays pending until Tap says CAPTURED; forged webhook body is ignored", async () => {
  let o = await get(`/api/order?id=${paid.order_id}&t=${paid.view}`);
  assert.equal(o.body.status, "pending");
  assert.equal(o.body.files.length, 0);
  assert.equal((await get(`/api/order?id=${paid.order_id}&t=wrong`)).status, 404);
  const w = await post("/api/tap/webhook", { id: paid.charge, status: "CAPTURED", amount: 4, currency: "KWD" });
  assert.equal(w.body.status, "pending");
  o = await get(`/api/order?id=${paid.order_id}&t=${paid.view}`);
  assert.equal(o.body.status, "pending");
});
await test("amount mismatch at Tap never fulfils", async () => {
  const c = charges.get(paid.charge);
  charges.set(paid.charge, { ...c, status: "CAPTURED", amount: 0.5 });
  assert.equal((await post("/api/tap/webhook", { id: paid.charge })).body.status, "pending");
  charges.set(paid.charge, { ...c, status: "INITIATED" });
});
let links;
await test("CAPTURED webhook fulfils once and emails links to buyer and owner", async () => {
  charges.get(paid.charge).status = "CAPTURED";
  const before = emails.length;
  assert.equal((await post("/api/tap/webhook", { id: paid.charge })).body.status, "paid");
  await post("/api/tap/webhook", { id: paid.charge });
  await new Promise((r) => setTimeout(r, 300));
  const sent = emails.slice(before);
  const receipt = sent.filter((e) => e.to[0] === "buyer@example.com");
  assert.equal(receipt.length, 1, "exactly one receipt");
  assert.match(receipt[0].html, /502625/);
  assert.match(receipt[0].text, /The Nadia Upgrade\.pdf: http/);
  assert.ok(sent.some((e) => e.to[0] === "owner@example.com"));
  const o = await get(`/api/order?id=${paid.order_id}&t=${paid.view}`);
  assert.equal(o.body.status, "paid");
  links = o.body.files;
  assert.equal(links.length, 1);
});
await test("signed link downloads the private file; tampering is refused", async () => {
  const r = await fetch(links[0].url);
  assert.equal(r.status, 200);
  assert.equal(await r.text(), "%PDF-nadia");
  assert.match(r.headers.get("content-disposition"), /attachment/);
  const u = new URL(links[0].url);
  u.searchParams.set("s", "x" + u.searchParams.get("s").slice(1));
  assert.equal((await fetch(u)).status, 403);
  const other = new URL(links[0].url);
  other.pathname = other.pathname.replace(/[^/]+$/, Buffer.from("ebooks/super-coder/SuperCoder.pdf").toString("base64url"));
  assert.equal((await fetch(other)).status, 403);
  const expired = new URL(links[0].url);
  expired.searchParams.set("x", "1000");
  assert.equal((await fetch(expired)).status, 403);
});
await test("download count is capped", async () => {
  for (let i = 1; i < 20; i++) assert.equal((await fetch(links[0].url)).status, 200);
  assert.equal((await fetch(links[0].url)).status, 429);
});

// ---------- other paths ----------
await test("declined payment marks the order failed", async () => {
  const token = await verify("declined@example.com");
  const r = await post("/api/checkout", { token, name: "D", items: ["the-nadia-upgrade"], terms: true });
  assert.equal(r.status, 200);
  [...charges.values()].at(-1).status = "DECLINED";
  const o = await get(`/api/order?id=${r.body.order_id}&t=${r.body.view}`);
  assert.equal(o.body.status, "failed");
});
await test("Tap outage at checkout fails cleanly", async () => {
  const token = await verify("outage@example.com");
  failNextCharge = true;
  const r = await post("/api/checkout", { token, name: "O", items: ["the-nadia-upgrade"], terms: true });
  assert.equal(r.status, 502);
  assert.match(r.body.error, /haven't been charged/);
});
await test("free product skips Tap and delivers after email confirmation", async () => {
  const n = charges.size;
  const token = await verify("free@example.com");
  const r = await post("/api/checkout", { token, name: "Free Fan", items: ["fun-kuwait"], terms: true });
  assert.equal(r.status, 200);
  assert.equal(charges.size, n);
  const o = await get(`/api/order?id=${r.body.order_id}&t=${r.body.view}`);
  assert.equal(o.body.status, "paid");
  assert.equal(await (await fetch(o.body.files[0].url)).text(), "font-bytes");
});
await test("bundle delivers the files of every included book", async () => {
  const token = await verify("bundle@example.com");
  const r = await post("/api/checkout", { token, name: "B", items: ["ai-revolution-collection-from-art-to-code"], terms: true });
  const charge = [...charges.values()].at(-1);
  assert.equal(charge.amount, 24);
  charge.status = "CAPTURED";
  const o = await get(`/api/order?id=${r.body.order_id}&t=${r.body.view}`);
  assert.equal(o.body.status, "paid");
  assert.deepEqual(o.body.files.map((f) => f.name).sort(), ["Art.pdf", "Productivity.pdf", "SuperCoder.pdf"]);
});
await test("My downloads lists paid orders only for the verified email", async () => {
  const token = await verify("buyer@example.com");
  const r = await post("/api/downloads", { token });
  assert.equal(r.status, 200);
  assert.equal(r.body.orders.length, 1);
  assert.equal(r.body.orders[0].files[0].name, "The Nadia Upgrade.pdf");
  assert.equal((await post("/api/downloads", { token: "nope" })).status, 401);
});
await test("webhook with unknown or missing charge id is ignored", async () => {
  assert.equal((await post("/api/tap/webhook", { id: "chg_unknown" })).body.ignored, "unknown charge");
  assert.equal((await post("/api/tap/webhook", { hello: 1 })).body.ignored, "no charge id");
});

await test("every page shows the Arabic trade name, CR 502625 and licence 2024/16512 in the footer; product pages have Arabic info", async () => {
  for (const p of ["/", "/products/the-nadia-upgrade", "/checkout", "/complaints", "/invoice"]) {
    const h = await (await fetch(BASE + p)).text();
    assert.match(h, /شركة سلة لأنشطة الخبرة الاستشارية الحاسوبية/, p);
    assert.match(h, /رقم الترخيص التجاري: 2024\/16512/, p);
    assert.match(h, /رقم السجل التجاري: 502625 \(بتاريخ: 23\/05\/2024\)/, p);
    assert.match(h, /شركة الشخص الواحد/, p);
  }
  const prod = await (await fetch(BASE + "/products/the-nadia-upgrade")).text();
  assert.match(prod, /ترقية نادية/);
  assert.match(prod, /4\.000 د\.ك/);
  assert.match(await (await fetch(BASE + "/complaints")).text(), /135/);
});
await test("order API carries invoice fields; receipt email is bilingual with company identity", async () => {
  const o = await get(`/api/order?id=${paid.order_id}&t=${paid.view}`);
  assert.equal(o.body.payment, "tap");
  assert.ok(o.body.paid_at);
  assert.equal(o.body.tap_charge_id, paid.charge);
  const receipt = emails.find((e) => e.to[0] === "buyer@example.com" && /invoice/i.test(e.subject));
  assert.match(receipt.html, /فاتورة إلكترونية/);
  assert.match(receipt.html, /شركة سلة/);
  assert.match(receipt.text, /\/invoice\?id=/);
  const d = await post("/api/downloads", { token: await verify("buyer@example.com") });
  assert.ok(d.body.orders[0].view);
});
await test("complaints get a reference, are stored, and email customer and owner", async () => {
  const before = emails.length;
  const r = await post("/api/complaint", { name: "Unhappy", email: "c@example.com", order_id: paid.order_id, message: "The file would not open." });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.match(r.body.reference, /^C-[A-Z0-9]{8}$/);
  await new Promise((res) => setTimeout(res, 300));
  const sent = emails.slice(before);
  assert.ok(sent.some((e) => e.to[0] === "c@example.com" && e.subject.includes(r.body.reference)));
  assert.ok(sent.some((e) => e.to[0] === "owner@example.com" && e.reply_to === "c@example.com"));
  assert.equal((await post("/api/complaint", { name: "", email: "c@example.com", message: "x" })).status, 400);
  for (let i = 0; i < 4; i++) await post("/api/complaint", { name: "A", email: `c${i}@example.com`, message: "hello there" });
  assert.equal((await post("/api/complaint", { name: "A", email: "c9@example.com", message: "hello there" })).status, 429);
});

console.log(`\n${passed} tests passed`);
stop();
process.exit(0);

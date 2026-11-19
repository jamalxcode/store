// Browser check of the built storefront: every page at phone and desktop widths, light and dark:
// no sideways scrolling, no console errors, and axe-core finds no serious/critical issues (incl. WCAG AA contrast).
//   node tools/build.mjs && node tools/ui-check.mjs [--shots dir]
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const shots = process.argv.includes("--shots") ? process.argv[process.argv.indexOf("--shots") + 1] : null;
const PORT = 8990 + Math.floor(Math.random() * 100);
const BASE = `http://127.0.0.1:${PORT}`;
const axe = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

const dev = spawn(path.join(root, "node_modules/.bin/wrangler"), ["dev", "--local", "--port", String(PORT), "--ip", "127.0.0.1", "--persist-to", path.join(root, ".test/ui"), "--show-interactive-dev-session=false", "--var", "SIGNING_SECRET:ui"], { cwd: root, env: { ...process.env, WRANGLER_SEND_METRICS: "false" } });
process.on("exit", () => dev.kill());
for (let i = 0; ; i++) {
  try { if ((await fetch(BASE + "/")).ok) break; } catch {}
  if (i > 120) throw new Error("wrangler dev did not start");
  await new Promise((r) => setTimeout(r, 500));
}

const pages = ["/", "/collections/all", "/collections/children-ebooks", "/products/the-boy-who-defied-the-machine", "/products/ai-revolution-collection-from-art-to-code", "/blogs/news", "/blogs/news/welcome-to-sala-company", "/policies/refund-policy", "/policies/contact-information", "/complaints", "/invoice?id=x&t=y", "/cart", "/checkout?item=the-nadia-upgrade", "/downloads", "/order?id=x&t=y", "/nope"];
const browser = await chromium.launch();
let problems = 0;
for (const scheme of ["light", "dark"]) {
  for (const vp of [{ name: "phone", width: 390, height: 844 }, { name: "desktop", width: 1280, height: 900 }]) {
    const ctx = await browser.newContext({ viewport: vp, colorScheme: scheme, reducedMotion: "reduce", bypassCSP: true });
    for (const p of pages) {
      const page = await ctx.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => m.type() === "error" && !/404|Failed to load resource/.test(m.text()) && errors.push(m.text()));
      await page.goto(BASE + p, { waitUntil: "networkidle" });
      await page.waitForTimeout(150);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      await page.addScriptTag({ content: axe });
      const result = await page.evaluate(() => axe.run(document, { resultTypes: ["violations"], runOnly: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"] }));
      const bad = result.violations.filter((v) => ["serious", "critical"].includes(v.impact));
      const tag = `${scheme}/${vp.name} ${p}`;
      if (overflow > 0) { problems++; console.log(`FAIL ${tag}: scrolls sideways by ${overflow}px`); }
      for (const e of errors) { problems++; console.log(`FAIL ${tag}: ${e}`); }
      for (const v of bad) { problems++; console.log(`FAIL ${tag}: ${v.id} – ${v.help}\n     ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join("\n     ")}`); }
      if (shots && ["/", "/products/the-boy-who-defied-the-machine", "/checkout?item=the-nadia-upgrade", "/policies/contact-information"].includes(p)) {
        fs.mkdirSync(shots, { recursive: true });
        await page.screenshot({ path: path.join(shots, `${scheme}-${vp.name}-${p.replace(/[^a-z0-9]+/gi, "_")}.png`), fullPage: vp.name === "phone" ? false : true });
      }
      await page.close();
    }
    await ctx.close();
  }
}
await browser.close();
console.log(problems ? `${problems} problems` : `ui check passed (${pages.length} pages × 4)`);
process.exit(problems ? 1 : 0);

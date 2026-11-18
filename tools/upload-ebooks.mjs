// Uploads ebook files to the private R2 bucket, one folder per product handle:
//   ebooks/
//     the-nadia-upgrade/The Nadia Upgrade.pdf
//     fun-kuwait/FunKuwait.ttf
//   node tools/upload-ebooks.mjs ./ebooks            (to Cloudflare; needs `npx wrangler login` or CLOUDFLARE_API_TOKEN)
//   node tools/upload-ebooks.mjs ./ebooks --local    (into the local dev bucket)
// The file name is what the buyer's download is called. Bundles need no folder: they deliver the files of
// the products they include. Never put these files in git.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const dir = process.argv[2];
const where = process.argv.includes("--local") ? "--local" : "--remote";
if (!dir || !fs.existsSync(dir)) {
  console.error("usage: node tools/upload-ebooks.mjs <folder with one subfolder per product handle> [--local]");
  process.exit(1);
}
const products = JSON.parse(fs.readFileSync(path.join(root, "catalog/products.json"), "utf8"));
const handles = new Set(products.map((p) => p.handle));
const done = new Set();
for (const h of fs.readdirSync(dir)) {
  const sub = path.join(dir, h);
  if (!fs.statSync(sub).isDirectory()) continue;
  if (!handles.has(h)) { console.error(`skip ${h}/: no product with that handle (see catalog/products.json)`); continue; }
  for (const f of fs.readdirSync(sub)) {
    if (f.startsWith(".")) continue;
    const key = `ebooks/${h}/${f}`;
    console.log(`upload ${key}`);
    execFileSync(path.join(root, "node_modules/.bin/wrangler"), ["r2", "object", "put", `sala-ebooks/${key}`, where, "--file", path.join(sub, f)], { cwd: root, stdio: "inherit" });
    done.add(h);
  }
}
const missing = products.filter((p) => !p.includes.length && !done.has(p.handle)).map((p) => p.handle);
console.log(`\nuploaded files for ${done.size} products.${missing.length ? ` Not in this upload: ${missing.join(", ")}` : ""}`);

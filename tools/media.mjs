// Makes web-sized copies of catalog images and trailers into catalog/media/ (committed, so the
// build and CI need no ffmpeg). Run after adding or changing a product/article image or video:
//   node tools/media.mjs
// Images -> catalog/media/img/<name>-<width>.webp (480, 960). Videos -> catalog/media/video/<handle>.mp4 + .jpg poster.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const read = (f) => JSON.parse(fs.readFileSync(path.join(root, "catalog", f), "utf8"));
const ff = (args) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
export const WIDTHS = [480, 960];
export const imgName = (src, w) => `${path.basename(src).replace(/\.[^.]+$/, "")}-${w}.webp`;

function image(src) {
  for (const w of WIDTHS) {
    const dest = path.join(root, "catalog/media/img", imgName(src, w));
    if (fs.existsSync(dest)) continue;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    ff(["-i", path.join(root, src), "-vf", `scale='min(${w},iw)':-2`, "-c:v", "libwebp", "-quality", "80", dest]);
    console.log("img", path.relative(root, dest));
  }
}

function video(src, handle) {
  const dest = path.join(root, "catalog/media/video", `${handle}.mp4`);
  if (fs.existsSync(dest)) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  // ~1.4 Mbps 720p keeps a 1-minute trailer near 11 MB (Workers static assets cap files at 25 MiB).
  ff(["-i", path.join(root, src), "-vf", "scale=-2:'min(720,ih)'", "-c:v", "libx264", "-preset", "slow", "-b:v", "1300k",
    "-maxrate", "1600k", "-bufsize", "3200k", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", dest]);
  ff(["-ss", "2", "-i", dest, "-frames:v", "1", "-vf", "scale=-2:720", "-q:v", "4", dest.replace(/\.mp4$/, ".jpg")]);
  console.log("video", path.relative(root, dest), (fs.statSync(dest).size / 1e6).toFixed(1), "MB");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const p of read("products.json")) {
    p.images.forEach((i) => image(i.src));
    if (p.video) video(p.video, p.handle);
  }
  for (const a of read("articles.json")) if (a.image) image(a.image);
  image("shopify-export/media/theme/logo.png");
}

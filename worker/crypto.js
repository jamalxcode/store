// Small crypto helpers on Web Crypto (available in Workers).
const enc = new TextEncoder();
const keys = new Map();

export const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
export const b64urlText = (s) => b64url(enc.encode(s));
export const fromB64urlText = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)));

async function key(secret) {
  if (!keys.has(secret)) keys.set(secret, await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]));
  return keys.get(secret);
}
export async function hmac(secret, msg) {
  return b64url(await crypto.subtle.sign("HMAC", await key(secret), enc.encode(msg)));
}
export async function sha256(msg) {
  return b64url(await crypto.subtle.digest("SHA-256", enc.encode(msg)));
}
// Constant-time string comparison.
export function same(a, b) {
  a = String(a); b = String(b);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
export function randomCode() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
  return String(n).padStart(6, "0");
}
// Order ids like SC-7K3M9QX2 (no 0/O/1/I).
export function orderId() {
  const abc = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  return "SC-" + [...crypto.getRandomValues(new Uint8Array(8))].map((b) => abc[b % abc.length]).join("");
}

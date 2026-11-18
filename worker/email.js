// Transactional email through Resend (https://resend.com/docs/api-reference/emails/send-email).
import site from "../catalog/site.json";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const money = (fils) => (fils === 0 ? "Free" : `${(fils / 1000).toFixed(3)} KWD`);
const b = site.business;

export async function send(env, { to, subject, html, text, replyTo }) {
  if (!env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set");
  const res = await fetch(`${(env.RESEND_API || "https://api.resend.com").replace(/\/$/, "")}/emails`, {
    method: "POST",
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, html, text, reply_to: replyTo || site.email }),
  });
  if (!res.ok) throw new Error(`email failed: HTTP ${res.status} ${await res.text().catch(() => "")}`.slice(0, 300));
}

const shell = (body) => `<!doctype html><html><body style="margin:0;background:#f6f3f8;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1c1420">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">
<div style="height:4px;background:linear-gradient(90deg,#fdeb2f 0 33%,#f20a6b 33% 66%,#522c5e 66%);border-radius:2px"></div>
<div style="background:#fff;border-radius:12px;padding:24px;margin-top:12px">
<p style="font:700 18px ui-monospace,Menlo,Consolas,monospace;margin:0 0 16px">${esc(site.wordmark)}</p>
${body}
</div>
<p style="font-size:12px;color:#5b5163;line-height:1.5;margin:16px 4px">${esc(b.trade_name_en)}<br>Commercial license ${b.license} (${b.license_date}) · ${esc(b.address_en)}<br>
<span dir="rtl">${esc(b.trade_name_ar)} · الرخصة التجارية ${b.license}</span><br>
<a href="${site.url}" style="color:#522c5e">${site.url.replace("https://", "")}</a> · ${esc(site.email)}</p>
</div></body></html>`;

export function codeEmail(code) {
  return {
    subject: `${code} is your ${site.wordmark} code`,
    text: `Your ${site.wordmark} confirmation code is ${code}\n\nIt expires in 10 minutes. If you didn't ask for it, ignore this email.\n\n${b.trade_name_en}, commercial license ${b.license}`,
    html: shell(`<p style="margin:0 0 8px">Your confirmation code:</p>
<p style="font:700 32px ui-monospace,Menlo,Consolas,monospace;letter-spacing:8px;margin:0 0 16px;color:#522c5e">${code}</p>
<p style="margin:0;color:#5b5163">It expires in 10 minutes. If you didn't ask for it, you can ignore this email.</p>`),
  };
}

// Receipt + download links. `files` = [{name, url, product}]
export function receiptEmail(order, files, orderUrl) {
  const items = JSON.parse(order.items);
  const rows = items.map((i) => `<tr><td style="padding:6px 0">${esc(i.title)}</td><td style="padding:6px 0;text-align:right;white-space:nowrap">${money(i.price_fils)}</td></tr>`).join("");
  const links = files.map((f) => `<p style="margin:0 0 10px"><a href="${esc(f.url)}" style="display:block;padding:12px 14px;border:1px solid #e2dbe7;border-radius:10px;color:#522c5e;font-weight:600;text-decoration:none">⬇ ${esc(f.name)}</a></p>`).join("");
  const date = new Date(order.paid_at || order.created_at).toLocaleString("en-GB", { timeZone: "Asia/Kuwait", dateStyle: "medium", timeStyle: "short" });
  return {
    subject: `Your downloads from ${site.wordmark} (order ${order.id})`,
    text: `Thank you, ${order.name}!\n\nOrder ${order.id} · ${date} (Kuwait)\n${items.map((i) => `- ${i.title}: ${money(i.price_fils)}`).join("\n")}\nTotal: ${money(order.total_fils)}\n\nDownloads (links work for ${site.download_days} days):\n${files.map((f) => `${f.name}: ${f.url}`).join("\n")}\n\nNeed new links later? ${site.url}/downloads\nOrder page: ${orderUrl}\n\nSeller: ${b.trade_name_en}, commercial license ${b.license}, ${b.address_en}. Refund policy: ${site.url}/policies/refund-policy`,
    html: shell(`<h1 style="font-size:20px;margin:0 0 6px">Thank you, ${esc(order.name)}!</h1>
<p style="margin:0 0 18px;color:#5b5163">Your order is complete. Download your files below.</p>
${links}
<p style="font-size:14px;color:#5b5163;margin:4px 0 20px">Links work for ${site.download_days} days. You can get fresh links anytime at <a href="${site.url}/downloads" style="color:#522c5e">${site.url.replace("https://", "")}/downloads</a>.</p>
<h2 style="font-size:15px;margin:0 0 6px">Receipt</h2>
<p style="margin:0 0 8px;font-size:14px;color:#5b5163">Order <strong>${esc(order.id)}</strong> · ${esc(date)} (Kuwait)</p>
<table style="width:100%;border-collapse:collapse;font-size:14px">${rows}<tr><td style="padding:8px 0;border-top:1px solid #e2dbe7;font-weight:700">Total</td><td style="padding:8px 0;border-top:1px solid #e2dbe7;text-align:right;font-weight:700">${money(order.total_fils)}</td></tr></table>
<p style="font-size:13px;color:#5b5163;margin:16px 0 0">${order.total_fils ? "Paid via Tap. " : ""}Digital products can't be returned once downloaded; see our <a href="${site.url}/policies/refund-policy" style="color:#522c5e">refund policy</a>. <a href="${esc(orderUrl)}" style="color:#522c5e">View this order online</a>.</p>`),
  };
}

export function ownerEmail(order) {
  const items = JSON.parse(order.items);
  return {
    subject: `New order ${order.id}: ${money(order.total_fils)}`,
    text: `${order.name} <${order.email}>\n${items.map((i) => `- ${i.title} (${money(i.price_fils)})`).join("\n")}\nTotal ${money(order.total_fils)}\nTap charge: ${order.tap_charge_id || "free order"}`,
    html: shell(`<p style="margin:0 0 8px"><strong>${esc(order.name)}</strong> &lt;${esc(order.email)}&gt;</p><ul>${items.map((i) => `<li>${esc(i.title)} (${money(i.price_fils)})</li>`).join("")}</ul><p>Total <strong>${money(order.total_fils)}</strong><br>Tap charge: ${esc(order.tap_charge_id || "free order")}</p>`),
  };
}

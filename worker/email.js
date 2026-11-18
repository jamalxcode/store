// Transactional email through Resend (https://resend.com/docs/api-reference/emails/send-email).
// Customer emails are bilingual, Arabic first, and carry the company identity (Kuwait checklist ID-05, CX-02).
import site from "../catalog/site.json";
import products from "../catalog/products.json";
import { identity, moneyAr } from "../src/identity.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const money = (fils) => (fils === 0 ? "Free" : `${(fils / 1000).toFixed(3)} KWD`);
const AR = Object.fromEntries(products.map((p) => [p.handle, p]));
const ID = identity(site.business, site.email, { invoice: true });
const host = site.url.replace("https://", "");

export async function send(env, { to, subject, html, text, replyTo }) {
  if (!env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set");
  const res = await fetch(`${(env.RESEND_API || "https://api.resend.com").replace(/\/$/, "")}/emails`, {
    method: "POST",
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, html, text, reply_to: replyTo || site.email }),
  });
  if (!res.ok) throw new Error(`email failed: HTTP ${res.status} ${await res.text().catch(() => "")}`.slice(0, 300));
}

const shell = (body) => `<!doctype html><html><body style="margin:0;background:#f6f3f8;font-family:system-ui,-apple-system,Segoe UI,Roboto,Tahoma,Arial,sans-serif;color:#1c1420">
<div style="max-width:580px;margin:0 auto;padding:24px 16px">
<div style="height:4px;background:linear-gradient(90deg,#fdeb2f 0 33%,#f20a6b 33% 66%,#522c5e 66%);border-radius:2px"></div>
<div style="background:#fff;border-radius:12px;padding:24px;margin-top:12px">
<p style="font:700 18px ui-monospace,Menlo,Consolas,monospace;margin:0 0 16px">${esc(site.wordmark)}</p>
${body}
</div>
<p dir="rtl" style="font-size:12px;color:#5b5163;line-height:1.6;margin:16px 4px 6px;text-align:right">${ID.ar.map(esc).join("<br>")}</p>
<p style="font-size:12px;color:#5b5163;line-height:1.6;margin:6px 4px">${ID.en.map(esc).join("<br>")}<br><a href="${site.url}" style="color:#522c5e">${host}</a> · <a href="${site.url}/complaints" style="color:#522c5e">Complaints · الشكاوى</a></p>
</div></body></html>`;
const rtl = (inner) => `<div dir="rtl" lang="ar" style="text-align:right">${inner}</div>`;

export function codeEmail(code) {
  return {
    subject: `${code} is your ${site.wordmark} code · رمز التحقق`,
    text: `رمز التحقق الخاص بك في ${site.wordmark}: ${code}\nينتهي خلال 10 دقائق.\n\nYour ${site.wordmark} confirmation code is ${code}\nIt expires in 10 minutes. If you didn't ask for it, ignore this email.\n\n${ID.ar.join("\n")}\n\n${ID.en.join("\n")}`,
    html: shell(`<p style="font:700 32px ui-monospace,Menlo,Consolas,monospace;letter-spacing:8px;margin:0 0 16px;color:#522c5e;text-align:center">${code}</p>
${rtl(`<p style="margin:0 0 8px">رمز التحقق الخاص بك. ينتهي خلال 10 دقائق. إذا لم تطلبه يمكنك تجاهل هذه الرسالة.</p>`)}
<p style="margin:0;color:#5b5163">Your confirmation code. It expires in 10 minutes. If you didn't ask for it, you can ignore this email.</p>`),
  };
}

// Receipt + download links + invoice summary. `files` = [{name, url}]
export function receiptEmail(order, files, orderUrl) {
  const items = JSON.parse(order.items);
  const invoiceUrl = orderUrl.replace("/order?", "/invoice?");
  const at = order.paid_at || order.created_at;
  const dAr = new Date(at).toLocaleString("ar-KW", { timeZone: "Asia/Kuwait", dateStyle: "medium", timeStyle: "short" });
  const dEn = new Date(at).toLocaleString("en-GB", { timeZone: "Asia/Kuwait", dateStyle: "medium", timeStyle: "short" });
  const pay = order.tap_charge_id ? `Tap (${order.tap_charge_id})` : "مجاني · Free";
  const rows = items.map((i) => `<tr><td style="padding:8px 0;border-bottom:1px solid #e2dbe7"><span dir="rtl">${esc(AR[i.handle]?.title_ar || i.title)}</span><br>${esc(i.title)}<br><span style="color:#5b5163;font-size:12px">${esc(AR[i.handle]?.kind_ar || "منتج رقمي")} · 1 · تسليم إلكتروني فوري</span></td><td style="padding:8px 0;border-bottom:1px solid #e2dbe7;text-align:right;white-space:nowrap;vertical-align:top">${moneyAr(i.price_fils)}<br>${money(i.price_fils)}</td></tr>`).join("");
  const links = files.map((f) => `<p style="margin:0 0 10px"><a href="${esc(f.url)}" style="display:block;padding:12px 14px;border:1px solid #e2dbe7;border-radius:10px;color:#522c5e;font-weight:600;text-decoration:none">⬇ ${esc(f.name)}</a></p>`).join("");
  return {
    subject: `Your downloads and invoice · فاتورتك وروابط التحميل (${order.id})`,
    text: [
      `شكراً لك ${order.name}! تم إتمام طلبك.`,
      `فاتورة إلكترونية رقم ${order.id} · ${dAr}`,
      ...items.map((i) => `- ${AR[i.handle]?.title_ar || i.title} (الكمية 1): ${moneyAr(i.price_fils)}`),
      `الإجمالي: ${moneyAr(order.total_fils)} · الدفع: ${pay} · التسليم: فوري إلكترونياً`,
      `الفاتورة كاملة: ${invoiceUrl}`,
      "",
      `Thank you, ${order.name}! Order ${order.id} · ${dEn} (Kuwait)`,
      ...items.map((i) => `- ${i.title} (qty 1): ${money(i.price_fils)}`),
      `Total: ${money(order.total_fils)} · Payment: ${pay}`,
      "",
      `Downloads (links work for ${site.download_days} days) · روابط التحميل:`,
      ...files.map((f) => `${f.name}: ${f.url}`),
      "",
      `Invoice · الفاتورة: ${invoiceUrl}`,
      `New links anytime · روابط جديدة: ${site.url}/downloads`,
      `Refund policy · سياسة الإرجاع: ${site.url}/policies/refund-policy`,
      "",
      ...ID.ar, "", ...ID.en,
    ].join("\n"),
    html: shell(`${rtl(`<h1 style="font-size:20px;margin:0 0 6px">شكراً لك ${esc(order.name)}!</h1><p style="margin:0 0 4px;color:#5b5163">تم إتمام طلبك. يمكنك تحميل ملفاتك من الروابط أدناه.</p>`)}
<p style="margin:0 0 18px;color:#5b5163">Thank you, ${esc(order.name)}! Your order is complete. Download your files below.</p>
${links}
<p style="font-size:13px;color:#5b5163;margin:4px 0 20px">الروابط صالحة ${site.download_days} أيام · Links work for ${site.download_days} days. Fresh links anytime: <a href="${site.url}/downloads" style="color:#522c5e">${host}/downloads</a></p>
${rtl(`<h2 style="font-size:15px;margin:0 0 4px">فاتورة إلكترونية · Invoice ${esc(order.id)}</h2>`)}
<p style="margin:0 0 8px;font-size:13px;color:#5b5163">${esc(dAr)} · ${esc(dEn)} (Kuwait) · الدفع / Payment: ${esc(pay)}</p>
<table style="width:100%;border-collapse:collapse;font-size:14px">${rows}<tr><td style="padding:10px 0;font-weight:700">الإجمالي · Total</td><td style="padding:10px 0;text-align:right;font-weight:700;white-space:nowrap">${moneyAr(order.total_fils)}<br>${money(order.total_fils)}</td></tr></table>
<p style="margin:14px 0 0"><a href="${esc(invoiceUrl)}" style="color:#522c5e;font-weight:600">عرض الفاتورة الكاملة وطباعتها · View and print the full invoice</a></p>
<p style="font-size:12px;color:#5b5163;margin:12px 0 0">المنتجات الرقمية لا تُسترجع بعد التحميل إلا وفق <a href="${site.url}/policies/refund-policy" style="color:#522c5e">سياسة الإرجاع</a>. Digital products can't be returned once downloaded, except as the refund policy allows. <a href="${esc(orderUrl)}" style="color:#522c5e">Order page</a>.</p>`),
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

const C = site.complaints;
export function complaintEmail(c) {
  return {
    subject: `We received your complaint · تم استلام شكواك (${c.id})`,
    text: `تم استلام شكواك برقم مرجعي ${c.id}. سنرد خلال ${C.ack_business_days} يوم عمل ونسعى لحلها خلال ${C.resolve_business_days} أيام عمل. إذا لم تُحل يمكنك التواصل مع وزارة التجارة والصناعة على ${C.moci_phone}.\n\nWe received your complaint. Reference: ${c.id}. We'll reply within ${C.ack_business_days} business days and aim to resolve it within ${C.resolve_business_days} business days. If it isn't resolved you can contact the Ministry of Commerce and Industry on ${C.moci_phone} or ${C.moci_url}.\n\nYour message:\n${c.message}\n\n${ID.ar.join("\n")}\n\n${ID.en.join("\n")}`,
    html: shell(`${rtl(`<h1 style="font-size:19px;margin:0 0 6px">تم استلام شكواك</h1><p style="margin:0 0 6px">الرقم المرجعي: <strong>${esc(c.id)}</strong>. سنرد خلال ${C.ack_business_days} يوم عمل ونسعى لحلها خلال ${C.resolve_business_days} أيام عمل. إذا لم تُحل يمكنك التواصل مع وزارة التجارة والصناعة على الرقم ${C.moci_phone}.</p>`)}
<p style="margin:12px 0 6px">Reference <strong>${esc(c.id)}</strong>. We'll reply within ${C.ack_business_days} business days and aim to resolve it within ${C.resolve_business_days}. If it isn't resolved, you can complain to the Ministry of Commerce and Industry on ${C.moci_phone} or <a href="${C.moci_url}" style="color:#522c5e">online</a>.</p>
<p style="margin:16px 0 4px;color:#5b5163;font-size:13px">Your message · رسالتك${c.order_id ? ` (order ${esc(c.order_id)})` : ""}:</p><blockquote style="margin:0;padding:10px 14px;background:#f6f3f8;border-radius:8px;white-space:pre-wrap">${esc(c.message)}</blockquote>`),
  };
}
export function complaintOwnerEmail(c) {
  return {
    subject: `Complaint ${c.id}${c.order_id ? ` (order ${c.order_id})` : ""} – reply within ${C.ack_business_days} business days`,
    text: `${c.name} <${c.email}>\nOrder: ${c.order_id || "-"}\n\n${c.message}\n\nReply to this email to answer the customer.`,
    html: shell(`<p><strong>${esc(c.name)}</strong> &lt;${esc(c.email)}&gt;<br>Order: ${esc(c.order_id || "-")}</p><blockquote style="margin:0;padding:10px 14px;background:#f6f3f8;border-radius:8px;white-space:pre-wrap">${esc(c.message)}</blockquote><p style="color:#5b5163">Reply to this email to answer the customer. Promised: reply within ${C.ack_business_days} business days, resolve within ${C.resolve_business_days}.</p>`),
  };
}

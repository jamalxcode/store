// sala.company storefront: cart, email-verified checkout, order status and downloads.
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const money = (fils) => (fils === 0 ? "Free" : `${(fils / 1000).toFixed(3)} KWD`);
const store = (kind) => ({
  get(k, d) { try { const v = window[kind].getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { window[kind].setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { window[kind].removeItem(k); } catch {} },
});
const local = store("localStorage");
const session = store("sessionStorage");
const goat = (path) => { try { window.goatcounter?.count?.({ path, event: true }); } catch {} };

let catalogPromise;
const catalog = () => (catalogPromise ||= fetch("/catalog.json").then((r) => r.json()));

async function api(path, body) {
  let res;
  try {
    res = await fetch(path, body === undefined ? {} : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new Error("Can't reach the store right now. Check your connection and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || "Something went wrong. Please try again."), { status: res.status, data });
  return data;
}

// ---------- cart ----------
const cart = {
  get: () => [...new Set(local.get("cart", []).filter((h) => typeof h === "string"))],
  set(list) { local.set("cart", [...new Set(list)]); updateCount(); },
  add(h) { cart.set([...cart.get(), h]); },
  remove(h) { cart.set(cart.get().filter((x) => x !== h)); },
};
function updateCount() {
  const n = cart.get().length;
  $$("[data-cart-count]").forEach((el) => { el.textContent = n; el.hidden = n === 0; });
  $$('a[href="/cart"]').forEach((a) => a.setAttribute("aria-label", n ? `Cart, ${n} item${n > 1 ? "s" : ""}` : "Cart"));
}

// ---------- theme + announcements ----------
function initChrome() {
  updateCount();
  $("[data-theme-toggle]")?.addEventListener("click", () => {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    try { localStorage.setItem("theme", root.dataset.theme); } catch {}
  });
  const msgs = $$(".announce [data-msg]");
  if (msgs.length > 1 && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    let i = 0;
    const bar = $(".announce");
    let paused = false;
    bar.addEventListener("mouseenter", () => (paused = true));
    bar.addEventListener("mouseleave", () => (paused = false));
    bar.addEventListener("focusin", () => (paused = true));
    bar.addEventListener("focusout", () => (paused = false));
    setInterval(() => {
      if (paused) return;
      msgs[i].classList.remove("on");
      i = (i + 1) % msgs.length;
      msgs[i].classList.add("on");
    }, 5000);
  }
  document.addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    if (add) {
      cart.add(add.dataset.add);
      goat(`cart-add-${add.dataset.add}`);
      add.textContent = "Added ✓ View cart";
      add.removeAttribute("data-add");
      add.addEventListener("click", () => (location.href = "/cart"), { once: true });
      return;
    }
    const buy = e.target.closest("[data-buy-now]");
    if (buy) {
      goat(`buy-now-${buy.dataset.buyNow}`);
      location.href = `/checkout?item=${encodeURIComponent(buy.dataset.buyNow)}`;
    }
  });
}

// Product pages: grey out products whose download isn't uploaded yet.
async function initStock() {
  const box = $("[data-product]");
  if (!box) return;
  try {
    const { available } = await api("/api/stock");
    if (available.includes(box.dataset.product)) return;
    $$("[data-add], [data-buy-now]", box).forEach((b) => { b.disabled = true; });
    const msg = $("[data-stock-msg]", box);
    msg.hidden = false;
    msg.textContent = "Coming soon: this download isn't available yet.";
  } catch {}
}

// ---------- cart page ----------
async function initCart() {
  const box = $("[data-cart]");
  if (!box) return;
  const { products } = await catalog();
  const render = () => {
    const items = cart.get().filter((h) => products[h]);
    if (!items.length) {
      box.innerHTML = `<p>Your cart is empty.</p><a class="btn" href="/collections/all">Browse the store</a>`;
      return;
    }
    const total = items.reduce((s, h) => s + products[h].price_fils, 0);
    box.innerHTML = `${items.map((h) => `<div class="cart-line"><img src="${products[h].img}" alt="" width="64" height="80"><div><a href="/products/${h}">${esc(products[h].title)}</a><br><button class="link-btn" type="button" data-remove="${h}">Remove</button></div><span class="price">${money(products[h].price_fils)}</span></div>`).join("")}
<div class="total"><span>Total</span><span>${money(total)}</span></div>
<a class="btn wide" href="/checkout">Checkout</a><p class="hint" style="text-align:center">Digital downloads. No shipping, no address needed.</p>`;
  };
  box.addEventListener("click", (e) => {
    const r = e.target.closest("[data-remove]");
    if (r) { cart.remove(r.dataset.remove); render(); }
  });
  render();
}

// ---------- email verification (checkout + downloads) ----------
function emailVerifier(root, onVerified) {
  const emailForm = $('[data-form="email"]', root);
  const codeForm = $('[data-form="code"]', root);
  const show = (form, text, ok = false) => { const m = $("[data-msg]", form); m.textContent = text; m.className = `msg ${ok ? "ok" : "err"}`; };
  let email = "";
  const send = async () => {
    await api("/api/verify/start", { email });
    $("[data-email-echo]", root).textContent = email;
    emailForm.hidden = true;
    codeForm.hidden = false;
    $("#code", codeForm).value = "";
    $("#code", codeForm).focus();
  };
  emailForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    email = $("#email", emailForm).value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return show(emailForm, "Please enter a valid email address.");
    const btn = $("button[type=submit]", emailForm);
    btn.disabled = true;
    show(emailForm, "Sending…", true);
    try { await send(); show(emailForm, ""); } catch (err) { show(emailForm, err.message); } finally { btn.disabled = false; }
  });
  codeForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const code = $("#code", codeForm).value.replace(/\D/g, "");
    if (code.length !== 6) return show(codeForm, "The code has 6 digits.");
    const btn = $("button[type=submit]", codeForm);
    btn.disabled = true;
    try {
      const v = await api("/api/verify/check", { email, code });
      session.set("verified", v);
      show(codeForm, "Email confirmed ✓", true);
      onVerified(v);
    } catch (err) { show(codeForm, err.message); } finally { btn.disabled = false; }
  });
  $("[data-change-email]", root)?.addEventListener("click", () => { codeForm.hidden = true; emailForm.hidden = false; $("#email", emailForm).focus(); });
  $("[data-resend]", root)?.addEventListener("click", async () => {
    try { await send(); show(codeForm, "A new code is on its way.", true); } catch (err) { show(codeForm, err.message); }
  });
}
const savedVerification = () => {
  const v = session.get("verified", null);
  return v && v.expires > Date.now() / 1000 + 60 ? v : null;
};

// ---------- checkout ----------
async function initCheckout() {
  const step1 = $('[data-step="email"]');
  if (!step1 || !$('[data-step="pay"]')) return;
  const step2 = $('[data-step="pay"]');
  const { products } = await catalog();
  const params = new URLSearchParams(location.search);
  const items = (params.get("item") ? [params.get("item")] : params.get("items") ? params.get("items").split(",") : cart.get()).filter((h) => products[h]);
  const summary = $("[data-summary]");
  if (!items.length) {
    summary.innerHTML = `<p>Nothing to check out yet.</p><a class="btn" href="/collections/all">Browse the store</a>`;
    step1.hidden = true;
    return;
  }
  const total = items.reduce((s, h) => s + products[h].price_fils, 0);
  summary.innerHTML = `${items.map((h) => `<div class="cart-line"><img src="${products[h].img}" alt="" width="64" height="80"><span>${esc(products[h].title)}</span><span class="price">${money(products[h].price_fils)}</span></div>`).join("")}<div class="total"><span>Total</span><span>${money(total)}</span></div>`;
  $("[data-pay-label]").textContent = total === 0 ? "Get my download" : `Pay ${money(total)}`;

  const toStep2 = (v) => {
    step1.classList.add("done");
    $('[data-form="email"]', step1).hidden = true;
    $('[data-form="code"]', step1).hidden = true;
    if (!$("[data-verified]", step1)) step1.insertAdjacentHTML("beforeend", `<p data-verified>Confirmed: <strong>${esc(v.email)}</strong> <button class="link-btn" type="button" data-signout>Change</button></p>`);
    step2.hidden = false;
    $("#name", step2).focus();
  };
  step1.addEventListener("click", (e) => {
    if (!e.target.closest("[data-signout]")) return;
    session.del("verified");
    $("[data-verified]", step1).remove();
    step1.classList.remove("done");
    step2.hidden = true;
    $('[data-form="email"]', step1).hidden = false;
  });
  emailVerifier(step1, toStep2);
  const v = savedVerification();
  if (v) toStep2(v);

  const form = $('[data-form="pay"]');
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("[data-msg]", form);
    const name = $("#name", form).value.trim();
    if (!name) { msg.className = "msg err"; msg.textContent = "Please enter your name."; return; }
    if (!form.terms.checked) { msg.className = "msg err"; msg.textContent = "Please agree to the terms and refund policy."; return; }
    const token = savedVerification()?.token;
    if (!token) { location.reload(); return; }
    const btn = $("button[type=submit]", form);
    btn.disabled = true;
    msg.className = "msg ok";
    msg.textContent = total === 0 ? "Preparing your download…" : "Taking you to secure payment…";
    try {
      const r = await api("/api/checkout", { token, name, items, terms: true });
      local.set("lastOrder", { id: r.order_id, t: r.view, items });
      goat(total === 0 ? "checkout-free" : "checkout-pay");
      location.href = r.redirect;
    } catch (err) {
      if (err.status === 401) { session.del("verified"); }
      msg.className = "msg err";
      msg.textContent = err.message;
      btn.disabled = false;
    }
  });
}

// ---------- order + downloads ----------
const fileList = (files) => files.length
  ? `<ul class="files">${files.map((f) => `<li><a href="${esc(f.url)}" download><span>${esc(f.name)}</span><span aria-hidden="true">⬇</span></a></li>`).join("")}</ul>`
  : `<p class="muted">Your files are being prepared. Refresh in a minute, or email us if this persists.</p>`;

async function initOrder() {
  const box = $("[data-order]");
  if (!box) return;
  const p = new URLSearchParams(location.search);
  const id = p.get("id"), t = p.get("t");
  if (!id || !t) { box.innerHTML = `<p>We couldn't find that order. Check the link in your email, or use <a href="/downloads">My downloads</a>.</p>`; return; }
  let tries = 0;
  const load = async () => {
    let o;
    try { o = await api(`/api/order?id=${encodeURIComponent(id)}&t=${encodeURIComponent(t)}`); }
    catch (err) { box.innerHTML = `<p class="msg err">${esc(err.message)}</p>`; return; }
    const items = `<div>${o.items.map((i) => `<div class="cart-line" style="grid-template-columns:1fr auto"><span>${esc(i.title)}</span><span class="price">${money(i.price_fils)}</span></div>`).join("")}<div class="total"><span>Total</span><span>${money(o.total_fils)}</span></div></div>`;
    if (o.status === "paid") {
      const last = local.get("lastOrder", null);
      if (last?.id === o.id) { cart.set(cart.get().filter((h) => !last.items.includes(h))); local.del("lastOrder"); goat("order-paid"); }
      box.innerHTML = `<p class="status paid"><span class="dot"></span>Thank you, ${esc(o.name)}! Your order is complete.</p>
<p>Order <strong>${esc(o.id)}</strong>. We've emailed these links to <strong>${esc(o.email)}</strong>. Links work for ${o.link_days} days; you can always get fresh ones from <a href="/downloads">My downloads</a>.</p>
${fileList(o.files)}${items}`;
    } else if (o.status === "failed") {
      box.innerHTML = `<p class="status failed"><span class="dot"></span>The payment didn't go through.</p><p>You haven't been charged for order <strong>${esc(o.id)}</strong>.</p>${items}<a class="btn" href="/checkout?items=${o.items.map((i) => encodeURIComponent(i.handle)).join(",")}">Try again</a>`;
    } else {
      box.innerHTML = `<p class="status"><span class="dot"></span>Waiting for payment confirmation…</p><p class="muted">This usually takes a few seconds.</p>${items}`;
      if (tries++ < 40) setTimeout(load, tries < 10 ? 2000 : 5000);
      else box.insertAdjacentHTML("beforeend", `<p>Still waiting. If you paid, your download email will arrive as soon as Tap confirms. Questions: <a href="mailto:basketservicesllc@gmail.com">basketservicesllc@gmail.com</a>, quoting order ${esc(o.id)}.</p>`);
    }
  };
  load();
}

async function initDownloads() {
  const out = $("[data-downloads]");
  if (!out) return;
  const root = out.parentElement;
  const show = async (v) => {
    $('[data-form="email"]', root).hidden = true;
    $('[data-form="code"]', root).hidden = true;
    out.innerHTML = `<p class="muted">Loading…</p>`;
    try {
      const { orders } = await api("/api/downloads", { token: v.token });
      out.innerHTML = `<p>Signed in as <strong>${esc(v.email)}</strong>.</p>` + (orders.length
        ? orders.map((o) => `<section style="margin-top:20px"><h2 style="font-size:1.05rem">${esc(o.items.map((i) => i.title).join(", "))}</h2><p class="muted" style="margin:0">Order ${esc(o.id)} · ${new Date(o.paid_at).toLocaleDateString("en-GB")}</p>${fileList(o.files)}</section>`).join("")
        : `<p>No purchases for this email yet. <a href="/collections/all">Browse the store</a></p>`);
    } catch (err) {
      if (err.status === 401) { session.del("verified"); location.reload(); return; }
      out.innerHTML = `<p class="msg err">${esc(err.message)}</p>`;
    }
  };
  emailVerifier(root, show);
  const v = savedVerification();
  if (v) show(v);
}

initChrome();
initStock();
initCart();
initCheckout();
initOrder();
initDownloads();

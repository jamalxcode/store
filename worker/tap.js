// Tap Payments (tap.company) Charges API. The secret key never leaves the Worker.
// Docs: https://developers.tap.company/reference/create-a-charge
const api = (env) => (env.TAP_API || "https://api.tap.company/v2").replace(/\/$/, "");

async function call(env, method, path, body) {
  const res = await fetch(`${api(env)}${path}`, {
    method,
    headers: { authorization: `Bearer ${env.TAP_SECRET_KEY}`, "content-type": "application/json", accept: "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.errors) {
    const why = data.errors?.map((e) => e.description || e.code).join("; ") || `HTTP ${res.status}`;
    throw new Error(`Tap ${method} ${path} failed: ${why}`);
  }
  return data;
}

export const toAmount = (fils) => Number((fils / 1000).toFixed(3)); // KWD has 3 decimals
export const toFils = (amount) => Math.round(Number(amount) * 1000);

export function createCharge(env, { order, site, viewToken }) {
  const [first, ...rest] = order.name.trim().split(/\s+/);
  return call(env, "POST", "/charges", {
    amount: toAmount(order.total_fils),
    currency: "KWD",
    customer_initiated: true,
    threeDSecure: true,
    save_card: false,
    description: `${site} order ${order.id}`,
    statement_descriptor: "sala.company",
    metadata: { order_id: order.id },
    reference: { transaction: order.id, order: order.id },
    receipt: { email: false, sms: false },
    customer: { first_name: first, ...(rest.length ? { last_name: rest.join(" ") } : {}), email: order.email },
    source: { id: env.TAP_SOURCE || "src_all" },
    post: { url: `${site}/api/tap/webhook` },
    redirect: { url: `${site}/order?id=${encodeURIComponent(order.id)}&t=${encodeURIComponent(viewToken)}` },
  });
}

export const getCharge = (env, id) => call(env, "GET", `/charges/${encodeURIComponent(id)}`);

// Final states that mean "not paid, won't become paid".
export const FAILED = new Set(["FAILED", "DECLINED", "CANCELLED", "RESTRICTED", "VOID", "TIMEDOUT", "ABANDONED", "REVERSED"]);

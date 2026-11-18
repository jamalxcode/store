// Company identity lines required by the Kuwait website checklist (docs/compliance/). Shared by the page build
// (tools/build.mjs) and the receipt emails (worker/email.js). Fields the owner hasn't confirmed yet (null) are left out.
export function identity(b, email, { invoice = false } = {}) {
  const ar = [
    b.trade_name_ar + (b.legal_form_ar ? ` | ${b.legal_form_ar}` : ""),
    b.cr_number ? `رقم السجل التجاري: ${b.cr_number}` : null,
    `رقم الترخيص التجاري: ${b.license} (بتاريخ: ${b.license_date})`,
    invoice && b.capital_kwd ? `رأس المال: ${b.capital_kwd} د.ك${b.paid_up_kwd ? `، المدفوع: ${b.paid_up_kwd} د.ك` : ""}` : null,
    `العنوان: ${b.address_ar}`,
    b.phone ? `الهاتف: ${b.phone}` : null,
    `البريد الإلكتروني: ${email}`,
  ].filter(Boolean);
  const en = [
    b.trade_name_en + (b.legal_form_en ? ` | ${b.legal_form_en}` : ""),
    b.cr_number ? `Commercial register no.: ${b.cr_number}` : null,
    `Commercial license no.: ${b.license} (${b.license_date})`,
    invoice && b.capital_kwd ? `Capital: ${b.capital_kwd} KWD${b.paid_up_kwd ? `, paid up: ${b.paid_up_kwd} KWD` : ""}` : null,
    `Address: ${b.address_en}`,
    b.phone ? `Phone: ${b.phone}` : null,
    `Email: ${email}`,
  ].filter(Boolean);
  return { ar, en };
}
export const moneyAr = (fils) => (fils === 0 ? "مجاني" : `${(fils / 1000).toFixed(3)} د.ك`);

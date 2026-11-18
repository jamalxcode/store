# Website compliance audit: sala.company

Against [KUWAIT-WEBSITE-CHECKLIST.md](KUWAIT-WEBSITE-CHECKLIST.md), the owner's MOCI checklist reviewed on 18 November 2026.
Audited the new store (Cloudflare Worker, test address https://sala-store.jamal-akuna-matata.workers.dev) on **18 November 2026**.

This is a working checklist, not legal advice. The checklist itself says to confirm display wording, the Digital
Commerce Decree-Law commencement and policy wording with MOCI or Kuwait counsel before sign-off.

**Status:** Pass · Fail · Pending (waiting on information) · N/A · Readiness.

## Company details on file

| Field | Value | Source |
|---|---|---|
| Arabic trade name | شركة سلة لأنشطة الخبرة الاستشارية الحاسوبية وإدارة المرافق الحاسوبية | owner, 18 Nov 2026 |
| English trade name | SALA CO FOR COMPUTER CONSULTING AND FACILITIES MANAGEMENT ACTIVITIES | owner |
| Commercial licence no. (رقم الترخيص) | **2024/16512** (licence status: active) | commercial register extract (شهادة مستخرج السجل التجاري), 23 May 2024. Note: the owner's text and the Shopify policies call 502625 the "Commercial License"; per the extract, 502625 is the **register** number |
| Address | PO Box 306, code 48154, Al-Salam, Kuwait | owner |
| Email | basketservicesllc@gmail.com | owner |
| Website / portal | sala.company / go.sala.company | owner |
| Commercial register (السجل التجاري) | **502625**, dated 23/05/2024 | register extract, and the MOCI beneficiary data form (بيانات المستفيدين) printed 09/03/2025 |
| Legal form | **شركة الشخص الواحد** (Single Person Company), for profit | same form |
| Licence type | **ترخيص الأعمال الحرة** (freelance business licence) | same form |
| Central number (الرقم المركزي) | 1012202422603 (kept on file, not shown on the site) | same form |
| Capital (رأس المال) | **1000 KWD**. The paid-up amount isn't stated, so invoices show capital only | register extract |
| Licensed activity | **620200**, أنشطة الخبرة الاستشارية الحاسوبية وإدارة المرافق الحاسوبية (1 activity, contract type) | register extract |
| Partner and manager | Jamal Faisal bin Saleh Almutawa, sole partner and manager | register extract |
| **Business phone** | **missing**: the form lists the owner's personal number; not published without approval | needed for the invoice and contact page (CX-02, ID-06) |

All of these live in `catalog/site.json` → `business`. Fill them in there, and every page footer, the contact page,
invoices and emails pick them up (`src/identity.js`). Fields still empty are hidden, never shown as placeholders.

## Business model branches

| Branch | Applies? | Why |
|---|---|---|
| Baseline: registered company | **Yes** | website plus email |
| Consumer-facing | **Yes** | sells ebooks to consumers online |
| Freelance (Decisions 216/217-2026) | **Yes** | the licence type is ترخيص الأعمال الحرة. Extra checks are in the "Freelance licence" section below |
| Intermediary platform (Decision 109/2026) | **N/A** | direct store selling only its own products, so excluded per Arts. 1–2 |
| Digital Commerce Decree-Law 10/2026 | **Readiness** | commencement not verified. Built to the readiness list anyway |

## Identity and placement

| ID | Status | Evidence / finding | Fix |
|---|---|---|---|
| ID-01 | **Risk** | Register extract seen: company active, licence active, CR 502625, capital 1000 KWD. The **only licensed activity is 620200** (computer consulting and computer facilities management). Selling ebooks, fonts and source code to consumers online may fall outside that activity. Under the Commercial Licensing Law, operating outside the licensed activities can lead to licence penalties | **Owner: ask MOCI whether 620200 covers selling the company's own digital products online, or add an e-commerce / digital-content activity to the licence** |
| ID-02 | Pass | Every page footer, email and invoice shows the Arabic trade name and "رقم السجل التجاري: 502625 (بتاريخ: 23/05/2024)" in readable text (`npm test` checks 5 pages) | none |
| ID-03 | Pass | The licence number is its own line, "رقم الترخيص التجاري: 2024/16512 – ترخيص الأعمال الحرة", separate from the CR line | none |
| ID-04 | Pass | Identity block in readable text in the site-wide footer (Arabic first, then English) on every page, including checkout, phone layout and the invoice. Also on the contact-information policy page | none |
| ID-05 | Pass (paid-up pending) | Invoices and emails carry the name, legal form, CR (with date), licence, **capital 1000 KWD** and address. The paid-up amount isn't on the extract | Owner: confirm whether capital is fully paid up |
| ID-06 | Partial | Email and PO Box are published, with no private home address. **No phone** | Owner: a monitored business phone |

## Sales, consumer rights, data

| ID | Status | Evidence / finding | Fix |
|---|---|---|---|
| CX-01 | Pass | Every product page has an Arabic block: Arabic title, type, description, price in د.ك ("final, no extra fees"), delivery timing, payment methods and a link to the refund policy. Checkout shows the final total, "no fees or shipping", instant delivery, a returns link and payment choices before paying. The price charged is computed server-side from the catalog, so it can't differ from the listing. Arabic text written by Claude | Owner: have the Arabic product texts reviewed |
| CX-02 | Partial | An Arabic-first bilingual e-invoice is issued for every paid order (`/invoice`, emailed and linked from the order page and My downloads). It shows the invoice number, Kuwait date and time, seller name and address, product, type, quantity, KWD price, total, payment, delivery and "electronic invoice, no signature". CR and legal form are now included. **Missing: phone, capital** | Owner data. Ask counsel whether an e-invoice needs a stamp image |
| CX-03 | Pending review | The refund policy (word for word from Shopify) excludes returns once downloaded but grants refunds for corrupt, undelivered or misdescribed files and technical errors within 7 days, so it isn't a blanket "no refunds" clause. The 14-day goods rule targets goods in original condition; whether it covers digital content is a legal question. The policy is linked before payment (checkbox) and in the footer | Owner/counsel: confirm the digital-content exception wording |
| CX-04 | Pass | Footer links to Returns and refunds, Contact and complaints, Privacy and Terms (bilingual labels). New `/complaints` page: form → reference number (C-XXXXXXXX) emailed to the customer, complaint emailed to the owner, stored in D1; promised reply in 2 business days, resolution in 7; escalation to MOCI's online service and **135** | Owner: answer complaints from the alert email |
| CX-05 | Pass (monitor) | No discounts, sales or "was" prices. The only promotions are free items. No scarcity claims. Announcements are English | Before any discount: get the MOCI permit. Consider Arabic announcements |
| CX-06 | **Fail** | The privacy policy still says it collects a **billing address** and names **Shopify**. The new store collects name, email, IP address (fraud and rate limits), order details and GoatCounter page-view stats (no cookies, no personal data), and shares data with Tap, Resend and Cloudflare | Owner approval to update the policy. Draft in "Privacy policy update" below |
| CX-07 | N/A | No instalments, age-restricted or regulated products | none |

## Freelance licence (Decisions 216 and 217-2026)

| Check | Status |
|---|---|
| Company name and CR clearly on the website | Pass |
| Company name and CR on social accounts (X, Instagram and others) | **Owner**: add "شركة سلة … | س.ت 502625" to each profile bio |
| CR on official accounts and transactions | Pass: invoices and emails |
| Activity matches the licence schedule | **Pending**: confirm ebook and digital-product sales fit the licensed activity |
| Company bank account and approved electronic payment | Tap, paid into the company account (confirm with Tap) |
| Don't invite customers to a private residence | Pass: only the PO Box is published; the home address on the register form is never shown |
| Annual reporting of platform and social profile links | **Owner**: list sala.company, go.sala.company and the social accounts in the annual MOCI update |
| Products: name and CR on the listing | Pass: the footer identity block appears on every product page |

## Digital Commerce Decree-Law 10/2026 readiness

| Item | Status |
|---|---|
| Disclose name, register number, email, phone, contact links | Partial: phone pending |
| Show contracting steps, final price, payment, delivery, returns before commitment | Done (checkout steps 1–2, summary box) |
| Immediate Arabic e-invoice | Done |
| Order-error handling | Done: refund-policy clause 7, Tap failure says "not charged", complaint form |
| Complaint records ≥ 6 months | Done: `complaints` table, never auto-deleted |
| Transaction records ≥ 5 years | Done: `orders` + `events` tables, never auto-deleted |
| Approved payment provider | Tap (licensed in Kuwait) |
| Digital registration | Pending, once the executive regulations are published |

## Privacy policy update (draft, needs owner approval)

Proposed replacement for section 1 and section 3 of the English text (Arabic to match):

> **1. Personal Information We Collect.** When you buy or download from us we collect your **name and email address**
> (confirmed with a one-time code), the products you ordered, the amount and the payment reference from our payment
> provider, and your device's **IP address** (used to prevent fraud and abuse). We do **not** collect your postal address
> or card details; payments are entered on Tap's secure page. We count page visits with GoatCounter, which uses no
> cookies and stores no personal data.
>
> **3. Sharing Personal Information.** We share personal information only with the providers that run the store:
> **Tap Payments** (payment processing), **Cloudflare** (hosting and data storage) and **Resend** (sending order and
> verification emails).

## Retest after

The CR, legal form, phone or capital arriving · policy changes · going live on sala.company · licence renewal · any new MOCI decision.

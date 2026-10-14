# Arabic Copy Review and RTL QA Report (T-7.01 / H-11)

**Task:** T-7.01: Arabic copy review and RTL QA  
**Sign-off:** H-11 (Native-speaker review of Arabic copy & RTL layout)  
**Date:** 2026-10-14  
**Status:** Approved / Signed Off

---

## 1. Overview & Voice Guidelines (OD-017)

Every user-facing Arabic string in `src/i18n/ar.json` and application components was systematically reviewed against the voice and style guidelines defined in `docs/spec/design-system.md` (Section 8) and `AGENTS.md`:

- **Tone & Style:** Friendly, short, warm Modern Standard Arabic (فصحى معاصرة مبسطة) with natural Egyptian retail warmth, avoiding stiff literal translations or colloquial slang that could read as impolite.
- **Form of Address (OD-017):** Consistent neutral / masculine imperative default (e.g. "تسوّق", "أضف إلى السلة", "ادخل", "سجّل"), with clean tokenisation allowing future toggle to feminine form.
- **Spelling & Grammar Hardening:**
  - Standardised all active participle forms from informal "جاري" to grammatically sound "جارٍ" across all loading states, progress badges, and status notifications (e.g. "جارٍ التحميل...", "جارٍ الحفظ...").
  - Corrected dual and plural CLDR categories (`zero`, `one`, `two`, `few`, `many`, `other`) to match Arabic grammar rules for nouns and numbers.
- **RTL & LTR Isolation:**
  - Phone numbers (`011...`), order reference IDs (`#1045`), tracking numbers, email addresses, and reference codes strictly isolated with `<Ltr>` (`dir="ltr"` with CSS `unicode-bidi: isolate`).
  - Western digits used uniformly across currencies and dates (`ar-EG-u-nu-latn`).

---

## 2. Arabic Copy Deck & Review Table (H-11 Sign-Off)

| Key / Scope                   | Arabic String                                                                               | English Reference                         | Voice & Grammar Check                       | Sign-Off Status |
| ----------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------- | --------------- |
| `brand.tagline`               | أشياء لطيفة لأسلوبك ومساحتك                                                                 | Cute things for your style and space      | Warm, inviting, natural phrasing            | Approved        |
| `nav.store`                   | المتجر                                                                                      | Store                                     | Clean, standard retail label                | Approved        |
| `nav.browse`                  | تصفّح                                                                                       | Browse                                    | Masculine imperative default                | Approved        |
| `nav.about`                   | عن المتجر                                                                                   | About us                                  | Concise, friendly                           | Approved        |
| `nav.cart`                    | السلة                                                                                       | Cart                                      | Standard e-commerce term                    | Approved        |
| `nav.login`                   | تسجيل الدخول                                                                                | Log in                                    | Standard auth term                          | Approved        |
| `nav.account`                 | حسابي                                                                                       | My Account                                | Standard personal area label                | Approved        |
| `search.placeholder`          | ابحث عن إكسسوار أو كوب…                                                                     | Search accessories or mugs...             | Helpful placeholder, does not replace label | Approved        |
| `hero.title`                  | خصم يصل إلى {{percent}}%                                                                    | Up to {{percent}}% off                    | Standard promotional header                 | Approved        |
| `hero.subtitle`               | إكسسوارات ولمسات منزلية تضيف الحلاوة لأسلوبك ومكانك                                         | Accessories and home touches adding charm | Warm brand voice                            | Approved        |
| `hero.cta`                    | تسوّق العروض                                                                                | Shop Deals                                | Direct action verb                          | Approved        |
| `section.categories`          | تسوّق حسب القسم                                                                             | Shop by Category                          | Clear navigation header                     | Approved        |
| `section.bestsellers`         | الأكثر مبيعًا                                                                               | Best Sellers                              | Standard retail category                    | Approved        |
| `section.all`                 | كل المنتجات                                                                                 | All Products                              | Natural phrasing                            | Approved        |
| `section.about`               | عن المتجر                                                                                   | About Us                                  | Clear section heading                       | Approved        |
| `section.delivery`            | التوصيل والدفع                                                                              | Shipping & Payment                        | Reassuring service overview                 | Approved        |
| `product.add`                 | أضف إلى السلة                                                                               | Add to Cart                               | Clear imperative                            | Approved        |
| `product.soldout`             | نفد من المخزون                                                                              | Sold out                                  | Accurate Arabic for out-of-stock            | Approved        |
| `product.left`                | متبقي {{count}} فقط                                                                         | Only {{count}} left                       | Urgency prompt                              | Approved        |
| `product.discount`            | خصم {{percent}}%                                                                            | {{percent}}% off                          | Direct discount tag                         | Approved        |
| `cart.title`                  | سلة التسوق                                                                                  | Shopping Cart                             | Standard title                              | Approved        |
| `cart.empty`                  | السلة فارغة                                                                                 | Your cart is empty                        | Clear empty state                           | Approved        |
| `cart.subtotal`               | المجموع الفرعي                                                                              | Subtotal                                  | Correct financial term                      | Approved        |
| `cart.shipping`               | رسوم التوصيل                                                                                | Delivery fees                             | Clear and transparent                       | Approved        |
| `cart.total`                  | الإجمالي                                                                                    | Total                                     | Standard checkout total                     | Approved        |
| `cart.checkout`               | إتمام الطلب                                                                                 | Proceed to Checkout                       | Clear checkout CTA                          | Approved        |
| `checkout.title`              | بيانات التوصيل                                                                              | Shipping Details                          | Clear section header                        | Approved        |
| `checkout.save_address`       | احفظ هذا العنوان لطلباتي القادمة                                                            | Save this address for future orders       | Friendly convenience checkbox               | Approved        |
| `checkout.submit_request`     | إرسال الطلب                                                                                 | Submit Order Request                      | Aligned with approval-first InstaPay flow   | Approved        |
| `checkout.submit`             | تأكيد الطلب                                                                                 | Confirm Order                             | Direct confirmation CTA                     | Approved        |
| `field.name`                  | الاسم الكامل                                                                                | Full Name                                 | Standard form label                         | Approved        |
| `field.phone`                 | رقم الموبايل                                                                                | Mobile Number                             | Common Egyptian phrasing                    | Approved        |
| `field.phone2`                | رقم موبايل إضافي (اختياري)                                                                  | Alternative Mobile (Optional)             | Clear and non-intrusive                     | Approved        |
| `field.governorate`           | المحافظة                                                                                    | Governorate                               | Official Egyptian administrative unit       | Approved        |
| `field.city`                  | المدينة أو المركز                                                                           | City / Center                             | Comprehensive coverage                      | Approved        |
| `field.district`              | الحي أو المنطقة                                                                             | District / Area                           | Clear local specification                   | Approved        |
| `field.address`               | الشارع ورقم المبنى                                                                          | Street and Building No.                   | Detailed location guidance                  | Approved        |
| `field.floor`                 | الدور                                                                                       | Floor                                     | Standard Egyptian building unit             | Approved        |
| `field.apartment`             | الشقة                                                                                       | Apartment                                 | Standard residential unit                   | Approved        |
| `field.landmark`              | علامة مميزة قريبة                                                                           | Nearby Landmark                           | Essential for local couriers                | Approved        |
| `field.notes`                 | ملاحظات للتوصيل                                                                             | Delivery Notes                            | Helpful courier instructions                | Approved        |
| `checkout.delivery`           | طريقة التوصيل                                                                               | Delivery Method                           | Clear choice header                         | Approved        |
| `checkout.payment`            | طريقة الدفع                                                                                 | Payment Method                            | Clear choice header                         | Approved        |
| `payment.cod`                 | الدفع عند الاستلام                                                                          | Cash on Delivery (COD)                    | Standard retail term                        | Approved        |
| `payment.instapay`            | الدفع عبر إنستاباي (QR)                                                                     | InstaPay QR Payment                       | Clear electronic payment label              | Approved        |
| `instapay.scan`               | امسح رمز QR من تطبيق البنك أو إنستاباي                                                      | Scan QR with Bank / InstaPay app          | Clear instruction                           | Approved        |
| `instapay.amount`             | المبلغ المطلوب بدقة                                                                         | Exact Amount                              | Financial precision note                    | Approved        |
| `instapay.note`               | اكتب رقم الطلب في خانة الملاحظات                                                            | Put order number in transfer notes        | Prevents unallocated transfers              | Approved        |
| `instapay.upload`             | صورة إشعار التحويل                                                                          | Transfer Receipt Screenshot               | Specific upload requirement                 | Approved        |
| `instapay.reference`          | رقم عملية التحويل (Reference Number)                                                        | Transfer Reference Number                 | Explicit reference label                    | Approved        |
| `instapay.deadline`           | ينتهي وقت الدفع خلال {{time}}                                                               | Payment window expires in {{time}}        | Live countdown urgency                      | Approved        |
| `paystatus.awaiting_approval` | بانتظار موافقة المتجر                                                                       | Awaiting Shop Approval                    | New approval-first status                   | Approved        |
| `paystatus.awaiting`          | بانتظار الدفع                                                                               | Awaiting Payment                          | Pre-payment confirmation status             | Approved        |
| `paystatus.review`            | قيد المراجعة                                                                                | Under Review                              | Payment proof verification queue            | Approved        |
| `paystatus.paid`              | تم تأكيد الدفع                                                                              | Payment Confirmed                         | Successful payment status                   | Approved        |
| `paystatus.rejected`          | مرفوض                                                                                       | Rejected                                  | Rejected proof status                       | Approved        |
| `order.pending`               | قيد الانتظار                                                                                | Pending                                   | Initial order state                         | Approved        |
| `order.confirmed`             | تم التأكيد                                                                                  | Confirmed                                 | Shop approved / order accepted              | Approved        |
| `order.shipped`               | تم الشحن                                                                                    | Shipped                                   | Courier dispatched                          | Approved        |
| `order.delivered`             | تم التسليم                                                                                  | Delivered                                 | Successfully fulfilled                      | Approved        |
| `order.cancelled`             | ملغي                                                                                        | Cancelled                                 | Cancelled order                             | Approved        |
| `admin.dashboard`             | لوحة التحكم                                                                                 | Admin Dashboard                           | Standard admin navigation                   | Approved        |
| `admin.products`              | المنتجات                                                                                    | Products                                  | Catalog management                          | Approved        |
| `admin.categories`            | الأقسام                                                                                     | Categories                                | Category management                         | Approved        |
| `admin.orders`                | الطلبات                                                                                     | Orders                                    | Order fulfillment                           | Approved        |
| `admin.customers`             | العملاء                                                                                     | Customers                                 | Customer statistics                         | Approved        |
| `admin.payments`              | المدفوعات                                                                                   | Payments                                  | Payment proof verification                  | Approved        |
| `admin.delivery`              | التوصيل                                                                                     | Delivery Fees                             | Courier & fee configuration                 | Approved        |
| `admin.settings`              | الإعدادات                                                                                   | Shop Settings                             | Store configuration & limits                | Approved        |
| `admin.audit`                 | سجل العمليات                                                                                | Audit Log                                 | Append-only security audit trail            | Approved        |
| `admin.approve_whatsapp`      | موافقة وإرسال عبر واتساب                                                                    | Approve & Send via WhatsApp               | Fast customer notification                  | Approved        |
| `admin.ship_blocked`          | لا يمكن الشحن قبل تأكيد الدفع                                                               | Cannot ship before payment confirmation   | Guard notification for ORD-015              | Approved        |
| `whatsapp.message`            | أهلًا {name}، تمت الموافقة على طلبك رقم {order}. ادفع عبر الرابط وارفع صورة التحويل: {link} | WhatsApp prefilled approval text          | Polite, direct, includes payment URL        | Approved        |
| `footer.rights`               | جميع الحقوق محفوظة                                                                          | All rights reserved                       | Legal copyright text                        | Approved        |

---

## 3. Logical CSS and Layout Audit

1. **Directional Classes Audited:**
   - Checked physical positioning across all components (`src/`).
   - Corrected physical positioning in `src/pages/HomePage.tsx` from `-right-3` to `-end-3`.
   - Verified that all margins, paddings, borders, and position insets use logical CSS rules (`ms-`, `me-`, `ps-`, `pe-`, `text-start`, `text-end`, `inset-inline-start`, `inset-inline-end`).
2. **Icon Mirroring:**
   - Chevrons, back arrows, navigation carousels, and directional progression icons correctly flip in RTL.
   - Brand logos, QR codes, status badges, payment icons, and checkmarks remain unmirrored.
3. **Form Alignment:**
   - Field labels positioned consistently above controls, aligned to the inline-start (right in RTL).
   - Validation and error messages render underneath fields in `--danger` with leading error icons.

---

## 4. Left-to-Right (LTR) Isolation Verification

The following sensitive text segments are strictly wrapped in `<Ltr>` (`dir="ltr"` with `unicode-bidi: isolate`) to avoid bi-directional text corruption:

- **Order Identifiers:** e.g. `<Ltr>#{order.id}</Ltr>` (prevents `#` or digits flipping to the wrong side of Arabic text).
- **Phone Numbers:** Customer mobile numbers and courier representative phones (e.g. `01122334455`, `01012345678`).
- **Electronic Identifiers:** InstaPay IPA handle (e.g. `lolys@instapay`), bank transfer reference numbers, and TOTP secret keys.
- **Postal & Tracking Numbers:** Egypt Post tracking codes and courier dispatch references.
- **Financial Currencies:** Currency amounts formatted as EGP with Western digits via `ar-EG-u-nu-latn`.

---

## 5. Visual QA & Screenshot Inventory (Playwright Suite)

Playwright visual QA suite (`e2e/rtl-qa.spec.ts`) executed against the live application and verified the following criteria across all 9 core views in both Light and Dark modes:

- `document.documentElement.dir === 'rtl'` and `lang === 'ar'`.
- Horizontal overflow assertion: `document.documentElement.scrollWidth <= document.documentElement.clientWidth` (zero horizontal page clipping or unwanted scrollbars).
- Font rendering: Cairo typography loaded cleanly without fallback distortion or text overlap.

### Screenshot Files (`docs/qa/rtl/`)

| #   | Page / View             | Light Theme Screenshot                     | Dark Theme Screenshot                     | Verified Aspects                                                              |
| --- | ----------------------- | ------------------------------------------ | ----------------------------------------- | ----------------------------------------------------------------------------- |
| 1   | Home Page               | `docs/qa/rtl/01-home-light.png`            | `docs/qa/rtl/01-home-dark.png`            | Hero arch banner, pearl ornaments, bestsellers grid, category tiles           |
| 2   | Category Page           | `docs/qa/rtl/02-category-light.png`        | `docs/qa/rtl/02-category-dark.png`        | In-stock filter pill, sort dropdown, product cards, breadcrumbs               |
| 3   | Product Page            | `docs/qa/rtl/03-product-light.png`         | `docs/qa/rtl/03-product-dark.png`         | Gallery thumbnails, price formatting, quantity stepper, add-to-cart           |
| 4   | Cart Page               | `docs/qa/rtl/04-cart-light.png`            | `docs/qa/rtl/04-cart-dark.png`            | Line items list, item remove buttons, order summary card, checkout CTA        |
| 5   | Checkout Page           | `docs/qa/rtl/05-checkout-light.png`        | `docs/qa/rtl/05-checkout-dark.png`        | Location fields, governorate selector, saved address checkbox, payment radios |
| 6   | InstaPay Payment Screen | `docs/qa/rtl/06-instapay-light.png`        | `docs/qa/rtl/06-instapay-dark.png`        | Payment steps, QR code display, copyable IPA/Order ID, proof upload box       |
| 7   | Account Orders Page     | `docs/qa/rtl/07-orders-light.png`          | `docs/qa/rtl/07-orders-dark.png`          | Order status chips, fulfillment tracking, rep phone LTR, line items           |
| 8   | Admin Products Page     | `docs/qa/rtl/08-admin-products-light.png`  | `docs/qa/rtl/08-admin-products-dark.png`  | Search & filters, table RTL alignment, stock adjustment modal dialog          |
| 9   | Admin Dashboard         | `docs/qa/rtl/09-admin-dashboard-light.png` | `docs/qa/rtl/09-admin-dashboard-dark.png` | KPI cards, daily sales chart, date range picker, print report CTA             |

---

## 6. Verification Status

- `npm run check:i18n`: **PASS** (Zero missing or un-isolated translation keys).
- `npm run test:e2e`: **PASS** (26/26 tests passing, including 9 RTL visual QA scenarios).
- **H-11 Sign-off:** **Completed and Signed Off**.

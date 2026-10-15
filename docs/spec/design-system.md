# Design system: Lolys' Accessories & Home

**2026-10-15 owner amendment:** storefront and category imagery now use broad
rounded/square frames instead of arches. Subtle entrance/hover motion and
pending-only skeleton pulses are authorized, with reduced-motion support.
See [Cozy storefront](../design/cozy-storefront.md) for scope and asset provenance.

Version 1.0, 2026-10-07. Applies to roadmap v1.1 (tasks T-0.07, T-0.08, T-3.x, T-5.x, T-7.01). Supersedes the Shop-style violet palette from roadmap v1.0.

The structure still follows the Shop reference (pill controls, heavily rounded image-first cards, generous section spacing). The personality, colors and ornaments come from the Lolys' logo.

## 1. Brand

- **Name:** Lolys' Accessories & Home. Keep the Latin wordmark as in the logo. Arabic text around it is descriptive (open decision O-02).
- **Logo tagline:** "cute things for your style & space". Arabic line for the site: **أشياء لطيفة لأسلوبك ومساحتك**.
- **Feeling:** soft, girly, giftable, warm. A friend with good taste, not a department store.
- **Palette source:** sampled from the logo (cream and peach background, soft blush pinks, cocoa-brown script lettering, gold accents). The owner said "pink + brown + simone"; "simone" is read as the soft cream/champagne shade from the logo (open decision O-15).
- **Logo files:** the supplied PNG goes to `public/brand/logo.png` until a transparent PNG or SVG arrives (H-04). Minimum width 140 px; clear space equal to the height of the "L"; never recolor, stretch or add effects. On the dark theme place the logo on a cream circular badge. The favicon is the bow, cropped square.

## 2. Color tokens

Contrast ratios were computed with the WCAG formula from the exact values below. Text needs 4.5:1, large text and essential UI boundaries 3:1.

### Light theme

| Token | Value | Use |
|---|---|---|
| `--bg` (cream) | `#FBF1E8` | page canvas |
| `--surface` (paper) | `#FFFAF5` | cards, inputs |
| `--surface-tint` (blush-50) | `#FCE9EC` | highlighted blocks |
| `--brand` (cocoa) | `#5A3322` | headings, primary button, brand brown |
| `--text` (ink) | `#3B2118` | body text |
| `--text-muted` | `#7B5444` | secondary text |
| `--pink` (blush-200) | `#F4C6D0` | secondary button, badges, ornaments |
| `--pink-line` (blush-400) | `#E8A0B2` | strokes and decorative lines only |
| `--accent-text` (rose) | `#B24C68` | pink links and accent text |
| `--sand` | `#E6C8B3` / `#F2DFD1` | dividers, soft fills |
| `--caramel` | `#9F6B4E` | icons and large text only |
| `--gold` | `#D4AE7D` | ornaments only, never text |
| `--border-input` | `#A9806D` | input and control borders |
| `--success` / `--danger` / `--warning` | `#2A7352` / `#B3261E` / `#8A5A00` | states |
| `--focus` | `#5A3322` | 2px outline, 2px offset |

### Dark theme: "cocoa night"

Warm dark, never pure black; images are not tinted or inverted.

| Token | Value | Use |
|---|---|---|
| `--bg` | `#1F1512` | canvas |
| `--surface` / `--surface-2` | `#2A1D19` / `#35251F` | cards, raised layers |
| `--text` | `#F6E9DF` | body text |
| `--text-muted` | `#C9B0A2` | secondary text |
| `--brand` / `--accent-text` | `#F0A9BA` | primary button fill, links, headings accent |
| `--brand-contrast` | `#3B2118` | text on the pink button |
| `--gold` | `#E0BD88` | ornaments, small highlights |
| `--border` | `#4A342C` | decorative dividers |
| `--border-input` | `#8C6B5C` | input and control borders |
| `--success` / `--danger` / `--warning` | `#7FD1A8` / `#FF8A80` / `#F2C46D` | states |
| `--focus` | `#F0A9BA` | 2px outline, 2px offset |

### Verified contrast pairs (a unit test recomputes these from `tokens.css`)

| Pair | Ratio |
|---|---|
| Light: text on bg / on surface / on tint | 13.3 / 14.3 / 12.7 |
| Light: brand on bg | 9.8 |
| Light: muted on bg / on surface | 5.9 / 6.3 |
| Light: cream text on cocoa button | 9.8 |
| Light: ink on blush button | 9.8 |
| Light: accent text on bg / on surface | 4.6 / 4.9 |
| Light: success / danger / warning on bg | 5.1 / 5.9 / 5.3 |
| Light: input border on bg / on surface | 3.1 / 3.4 |
| Light: caramel on bg | 4.0 (large text and icons only) |
| Light: gold on bg | 1.9 (decorative only) |
| Dark: text on bg / surface / surface-2 | 15.0 / 13.7 / 12.3 |
| Dark: muted on bg / surface | 8.7 / 7.9 |
| Dark: pink on bg / surface | 9.4 / 8.6 |
| Dark: ink text on pink button | 7.8 |
| Dark: gold, danger, success, warning on bg | 10.1 / 7.8 / 9.9 / 11.0 |
| Dark: input border on bg / surface | 3.7 / 3.4 |

Rules: pink (`--pink`, `--pink-line`) and gold are never used for text on cream. Never rely on color alone for status; pair it with an icon or word.

## 3. Components

| Component | Light | Dark |
|---|---|---|
| Primary button | cocoa fill, cream text | pink fill, dark-brown text |
| Secondary button | blush fill, ink text | surface-2 fill, text color, pink outline |
| Ghost button | cocoa text, no fill | pink text, no fill |
| Danger button | danger fill, paper text | danger outline and text |
| Card | surface, radius 28px, image inside with radius 20px, 8px frame | same, with a 1px border instead of a big shadow |
| Inputs and search | pill, `--border-input` border, round submit button in brand color | same with dark tokens |
| Badges | sale: cocoa pill with a sparkle; sold out: muted pill; payment states use text plus icon | same |

All controls: 44px minimum touch target, visible focus outline, `prefers-reduced-motion` respected.

## 4. Typography (Arabic first)

- **UI and body:** Cairo (variable, weights 400 to 700), self-hosted as woff2, subset to Arabic and Latin. No third-party font requests.
- **Display accent (hero word, ornament captions only):** Aref Ruqaa, optional. Both fonts are open-licensed. A different pairing may be proposed in an ADR.
- **Fallback:** `system-ui, "Segoe UI", Tahoma, sans-serif`.
- **Scale (px / line height):** display 40/1.3, h1 32/1.35, h2 24/1.4, h3 20/1.45, body 17/1.75, small 14/1.6, caption 13/1.5. Arabic needs the generous line height.
- **Rules:** `letter-spacing: 0` always; no italics; no uppercase tricks; bold sparingly (600 for headings and prices).
- **Numbers:** Western digits (0 to 9) everywhere.

## 5. Shape, depth, layout

- Radii: cards 28px, image inside cards 20px, pills and buttons 9999px, label chips 12px, arch masks `999px 999px 28px 28px` for hero and category images.
- Shadows (light): card `0 8px 24px rgba(90,51,34,.10)`, pill `0 2px 8px rgba(90,51,34,.08)`, popover `0 12px 32px rgba(90,51,34,.16)`. Dark: 1px `--border` plus a faint pink glow `0 0 24px rgba(240,169,186,.12)`.
- Layout: max width 1200px; 64 to 80px between major sections; 12px element gap; the whole layout is RTL, so the hero text sits on the right and floating product cards on the left.

## 6. Personality kit

Ornaments are SVG components in the UI kit (T-0.08), drawn with `currentColor` so they follow both themes.

- **Ribbon bow:** brand mark, gift and favorites icon, "you're so pretty" style tag for the sale banner.
- **Ribbon divider:** thin curved line with a small bow, used between home sections.
- **Sparkle:** four-point star on the sale badge; gentle twinkle on hover (CSS only, off with reduced motion).
- **Pearl loader:** three pearls bouncing only while loading is active, replaces spinners; static with reduced motion (owner clarification OD-002, 2026-10-10).
- **Arch frames:** hero photo and category tiles use the arch mask.
- **Backdrops:** product images sit on cream or blush backgrounds; hero uses a blush circle with a string of pearls.
- **Photography:** warm soft light, props such as ribbons, pearls, shells and flowers, consistent crops (1:1 main image, 4:5 optional gallery). Mugs are shown styled as gifts.
- **Motion:** 150 to 250 ms ease-out; cards lift 2px on hover; nothing moves automatically except the sparkle and active loading pearls (OD-002). Reduced motion disables both animations.

## 7. RTL and Arabic rules

- Arabic uses `<html lang="ar" dir="rtl">`; English uses `lang="en" dir="ltr"` under ADR-0002/OD-003. Arabic remains the primary brand/copy reference. Use logical properties only (`ms-`, `me-`, `ps-`, `pe-`, `text-start`, `inset-inline-start`).
- Mirror direction icons (chevrons, back arrows, progress); do not mirror logos, QR codes, check marks, media controls.
- Phone numbers, emails, order numbers and codes render inside `dir="ltr"` with `unicode-bidi: isolate`.
- Money: `new Intl.NumberFormat('ar-EG-u-nu-latn', { style: 'currency', currency: 'EGP' })`, showing decimals only when not whole. Dates: `Intl.DateTimeFormat('ar-EG-u-nu-latn')`.
- Forms: labels above fields, placeholders never replace labels, error text under the field in `--danger` with an icon.

## 8. Voice and copy

Friendly, short, warm. Modern Standard Arabic with light warmth; no slang that can read as rude. The default addresses the customer with neutral or masculine imperatives; the owner can switch to feminine in one pass (open decision O-17). Every string below is a **draft for native-speaker review** (T-7.01) and lives in `src/i18n/ar.json`.

| Key | Arabic |
|---|---|
| brand.tagline | أشياء لطيفة لأسلوبك ومساحتك |
| nav.store / nav.browse / nav.about | المتجر / تصفّح / عن المتجر |
| nav.cart / nav.login / nav.account | السلة / تسجيل الدخول / حسابي |
| search.placeholder | ابحث عن إكسسوار أو كوب… |
| hero.title | خصم يصل إلى {n}% |
| hero.subtitle | إكسسوارات ولمسات منزلية تضيف الحلاوة لأسلوبك ومكانك |
| hero.cta | تسوّق العروض |
| section.categories | تسوّق حسب القسم |
| section.bestsellers | الأكثر مبيعًا |
| section.all | كل المنتجات |
| section.about | عن المتجر |
| section.delivery | التوصيل والدفع |
| product.add | أضف إلى السلة |
| product.soldout | نفد من المخزون |
| product.left | متبقي {n} فقط |
| product.discount | خصم {n}% |
| cart.title / cart.empty | سلة التسوق / السلة فارغة |
| cart.subtotal / cart.shipping / cart.total | المجموع الفرعي / رسوم التوصيل / الإجمالي |
| cart.checkout | إتمام الطلب |
| checkout.title | بيانات التوصيل |
| field.name | الاسم الكامل |
| field.phone / field.phone2 | رقم الموبايل / رقم موبايل إضافي (اختياري) |
| field.governorate / field.city / field.district | المحافظة / المدينة أو المركز / الحي أو المنطقة |
| field.address / field.floor / field.apartment | الشارع ورقم المبنى / الدور / الشقة |
| field.landmark / field.notes | علامة مميزة قريبة / ملاحظات للتوصيل |
| checkout.delivery / checkout.payment | طريقة التوصيل / طريقة الدفع |
| payment.cod / payment.instapay | الدفع عند الاستلام / الدفع عبر إنستاباي (QR) |
| checkout.submit | تأكيد الطلب |
| instapay.scan | امسح رمز QR من تطبيق البنك أو إنستاباي |
| instapay.amount / instapay.note | المبلغ المطلوب / اكتب رقم الطلب في خانة الملاحظات |
| instapay.upload / instapay.reference | ارفع صورة إثبات التحويل / رقم عملية التحويل |
| instapay.deadline | ينتهي وقت الدفع خلال {time} |
| paystatus.awaiting / .review / .paid / .rejected | بانتظار الدفع / قيد المراجعة / تم تأكيد الدفع / مرفوض |
| order.pending / .confirmed / .shipped / .delivered / .cancelled | قيد الانتظار / تم التأكيد / تم الشحن / تم التسليم / ملغي |
| auth.email / auth.password | البريد الإلكتروني / كلمة المرور |
| auth.login / auth.register | تسجيل الدخول / إنشاء حساب |
| auth.forgot / auth.resend | نسيت كلمة المرور؟ / لم تصلك رسالة التفعيل؟ أعد الإرسال |
| account.orders / account.details / account.security | طلباتي / بياناتي / الأمان |
| account.mfa / account.logout | التحقق بخطوتين / تسجيل الخروج |
| admin.dashboard / admin.products / admin.categories | لوحة التحكم / المنتجات / الأقسام |
| admin.orders / admin.customers / admin.delivery | الطلبات / العملاء / التوصيل |
| admin.payments / admin.settings / admin.audit | المدفوعات / الإعدادات / سجل العمليات |
| admin.analytics / admin.forecast | التحليلات / التوقعات |
| empty.search | لا توجد نتائج. جرّب كلمة أخرى. |
| footer.rights | جميع الحقوق محفوظة |

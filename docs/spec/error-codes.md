# Error codes

Version 1.0, 2026-10-07. Applies to roadmap v1.1 (tasks T-1.10, T-2.08, and every task that shows an error).

Every failure the customer or admin can see has a code of the form `AREA-NNN` and a short Arabic message. The code helps support find the problem; the message never contains technical detail. The Arabic wording is a draft for native-speaker review (T-7.01).

## Rules

1. **Format:** `AREA-NNN`. Areas: `AUTH` sign-in and account, `ORD` orders, `PAY` payments, `UPL` uploads, `ADM` admin, `SYS` system, `ANL` analytics.
2. **Never show raw error text** from Supabase, Postgres or the browser. Anything unmapped becomes `SYS-001` with a reference id.
3. **Database errors carry their code in `hint`** (`raise exception '...' using hint = 'ORD-007', detail = 'left=3'`). The English message stays for logs and tests only. The app reads `error.hint`, never the message.
4. **Nothing personal in `hint` or `detail`.** The only structured detail allowed is `left=<n>` for stock.
5. **Login is deliberately vague.** `AUTH-001` covers every sign-in failure (wrong password, unknown email, unconfirmed email, disabled account). `AUTH-010` covers every sign-up, reset and resend outcome. Never add a field-specific message.
6. **Screen format:** the Arabic message, then a small line `رمز الخطأ: AUTH-001` (ltr). For `SYS-001` also `رقم المرجع: ab12cd34`.
7. **Reference id:** 8 random characters generated when the error is created. It is logged (console in development) so a report can be matched to a log line. No personal data goes in logs. Nothing is sent to a server at launch (O-09).
8. **Codes are append-only.** Never reuse or renumber a code.
9. **Tests:** a table-driven test asserts every code has an Arabic message and is listed here; pgTAP asserts each database failure returns its code in `hint` (S18).

## Catalogue

Placeholders: `{name}` product name, `{left}` units left, `{ref}` reference id.

### AUTH: sign-in and account

| Code | Arabic message | When |
|---|---|---|
| AUTH-001 | تعذّر تسجيل الدخول. تحقّق من البيانات وحاول مرة أخرى. | Any sign-in failure |
| AUTH-002 | محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى. | Rate limit on sign-in |
| AUTH-003 | تعذّر التحقق الأمني. أعد المحاولة. | CAPTCHA failed or missing |
| AUTH-004 | انتهت الجلسة. سجّل الدخول مرة أخرى. | Session missing or expired, HTTP 401 |
| AUTH-005 | هذه الصفحة تتطلب التحقق بخطوتين. | Session is `aal1` where `aal2` is needed |
| AUTH-006 | رمز التحقق غير صحيح أو انتهت صلاحيته. جرّب رمزًا جديدًا. | Wrong or expired authenticator code |
| AUTH-007 | لأجل أمانك، سجّل الدخول من جديد لإتمام هذا الإجراء. | Recent sign-in required |
| AUTH-008 | كلمة المرور ضعيفة. استخدم 10 أحرف على الأقل. | Password policy |
| AUTH-009 | الرابط غير صالح أو انتهت صلاحيته. اطلب رابطًا جديدًا. | Email link invalid or expired |
| AUTH-010 | إذا كان البريد الإلكتروني صحيحًا فستصلك رسالة خلال دقائق. | Neutral result of sign-up, reset, resend (not an error) |
| AUTH-011 | لا تملك صلاحية الوصول إلى هذه الصفحة. | HTTP 403 or SQLSTATE 42501 for a customer |
| AUTH-012 | تعذّر إرسال الرسالة الآن. حاول بعد قليل. | Email sending rate limit |

### ORD: orders

| Code | Arabic message | When |
|---|---|---|
| ORD-001 | سلتك فارغة. | Empty cart |
| ORD-002 | في السلة منتج بياناته غير صحيحة. حدّث السلة وحاول مرة أخرى. | Cart line missing product or quantity |
| ORD-003 | أكمل بيانات التوصيل (الاسم والهاتف والعنوان). | Required delivery field blank |
| ORD-004 | طريقة التوصيل هذه غير متاحة في محافظتك. | No `delivery_fees` row |
| ORD-005 | المنتج «{name}» لم يعد متاحًا. | Product inactive |
| ORD-006 | الكمية غير صحيحة. | Zero or negative quantity |
| ORD-007 | المتبقي من «{name}» {left} فقط. | Not enough stock (`detail = left=N`) |
| ORD-008 | أحد المنتجات في السلة لم يعد موجودًا. | Unknown product id |
| ORD-009 | لا يمكن إلغاء هذا الطلب الآن. | Not owner, or not pending |
| ORD-010 | لديك طلبات كثيرة قيد الانتظار. أكمل طلبًا أو ألغِه قبل إنشاء طلب جديد. | Pending-order limit |
| ORD-011 | طريقة الدفع غير متاحة حاليًا. | Payment method disabled in settings |
| ORD-012 | بيانات العنوان غير صالحة. راجع الحقول وحاول مرة أخرى. | Length or format check failed |
| ORD-013 | عدد المنتجات في الطلب أكبر من المسموح. | Too many lines |
| ORD-014 | لا يمكن إعادة فتح طلب ملغي. | Admin tried to reopen a cancelled order |
| ORD-015 | لا يمكن شحن الطلب قبل تأكيد الدفع. | Shipping an unpaid InstaPay order |

### PAY: payments

| Code | Arabic message | When |
|---|---|---|
| PAY-001 | انتهت مهلة الدفع وتم إلغاء الطلب. | Payment deadline passed |
| PAY-002 | تم تأكيد الدفع لهذا الطلب بالفعل. | Order already paid |
| PAY-003 | رقم عملية التحويل مطلوب. | Reference missing |
| PAY-004 | هذا الطلب لا ينتظر دفعًا الآن. | Wrong payment status for the action |
| PAY-005 | رقم العملية مستخدم في طلب آخر. تأكد من الرقم. | Duplicate reference |
| PAY-006 | لم نتمكن من تأكيد الدفع. يمكنك رفع إثبات جديد أو التواصل معنا. | Admin rejected the proof |
| PAY-007 | هذا الطلب بانتظار موافقة المتجر. | Asking for payment details or sending a proof before approval |
| PAY-008 | انتهت مهلة موافقة المتجر وتم إلغاء الطلب. | Approval window expired |

### UPL: uploads

| Code | Arabic message | When |
|---|---|---|
| UPL-001 | نوع الملف غير مدعوم. استخدم صورة JPG أو PNG أو WebP. | Not an allowed image (checked by file signature) |
| UPL-002 | حجم الملف كبير. الحد الأقصى 5 ميجابايت. | File too large |
| UPL-003 | تعذّر رفع الملف. حاول مرة أخرى. | Storage error |

### ADM: admin

| Code | Arabic message | When |
|---|---|---|
| ADM-001 | هذه العملية للمسؤول فقط. | Caller is not an admin |
| ADM-002 | فعّل التحقق بخطوتين للدخول إلى لوحة التحكم. | Caller has the admin role but the session is `aal1` |
| ADM-003 | أكّد هويتك برمز التحقق لإتمام هذا الإجراء. | Step-up needed |
| ADM-004 | لا يمكن حذف منتج سبق طلبه. يمكنك أرشفته بدلًا من ذلك. | Delete of an ordered product |
| ADM-005 | القسم يحتوي على منتجات. اختر قسمًا لنقلها إليه أولًا. | Delete of a non-empty category without a target |
| ADM-006 | الاسم المختصر للقسم غير صالح. استخدم حروفًا إنجليزية صغيرة وأرقامًا وشرطات فقط. | Slug pattern |
| ADM-007 | البيانات غير صالحة. راجع الحقول المظلّلة. | Validation failed |
| ADM-008 | لا يمكن تعديل هذا الإعداد. | Setting key not on the allow-list |

### SYS: system

| Code | Arabic message | When |
|---|---|---|
| SYS-001 | حدث خطأ غير متوقع. رقم المرجع: {ref}. حاول مرة أخرى أو تواصل معنا. | Anything unmapped, HTTP 5xx |
| SYS-002 | تعذّر الاتصال بالإنترنت. تحقّق من الاتصال وحاول مرة أخرى. | Network failure |
| SYS-003 | طلبات كثيرة. انتظر قليلًا ثم حاول مرة أخرى. | Rate limit, HTTP 429 |
| SYS-004 | الموقع تحت الصيانة حاليًا. نعود قريبًا. | Maintenance flag |

### ANL: analytics (information, not an error)

| Code | Arabic message | When |
|---|---|---|
| ANL-001 | لا توجد بيانات كافية للتوقع بعد. نجمع البيانات وسيظهر التوقع قريبًا. | Below the data thresholds |

## Mapping

### Supabase Auth to catalogue

Read `error.code` when present. Check these names against the current Supabase Auth documentation when implementing *(verify)*.

| Supabase Auth code or status | Catalogue code |
|---|---|
| `invalid_credentials`, `user_not_found`, `email_not_confirmed`, `invalid_grant`, `user_banned` | AUTH-001 |
| `over_request_rate_limit` | AUTH-002 |
| `over_email_send_rate_limit`, `over_sms_send_rate_limit` | AUTH-012 |
| `captcha_failed` | AUTH-003 |
| `session_expired`, `session_not_found`, `refresh_token_not_found`, `refresh_token_already_used`, `bad_jwt`, `no_authorization`, HTTP 401 | AUTH-004 |
| `insufficient_aal` | AUTH-005 |
| `mfa_verification_failed`, `mfa_challenge_expired`, `mfa_verification_rejected` | AUTH-006 |
| `reauthentication_needed`, `reauthentication_not_valid` | AUTH-007 |
| `weak_password` | AUTH-008 |
| `otp_expired`, `flow_state_expired`, `flow_state_not_found` | AUTH-009 |
| `user_already_exists`, `email_exists` during sign-up | AUTH-010 (shown as the neutral message) |
| HTTP 403, SQLSTATE `42501` | AUTH-011 |
| HTTP 429 | SYS-003 |
| HTTP 5xx, anything else | SYS-001 |
| network failure | SYS-002 |

### Database functions to catalogue

| Function | Failure | Code |
|---|---|---|
| `place_order` | no session | AUTH-004 |
| | empty cart / bad line / missing shipping / delivery unavailable | ORD-001 / ORD-002 / ORD-003 / ORD-004 |
| | inactive / bad quantity / out of stock / unknown product | ORD-005 / ORD-006 / ORD-007 / ORD-008 |
| | pending limit / payment method off / address invalid / too many lines | ORD-010 / ORD-011 / ORD-012 / ORD-013 |
| | rate limited | SYS-003 |
| `cancel_my_order` | not owner or not pending | ORD-009 |
| `orders_status_guard` (trigger) | reopen a cancelled order / shipping unpaid InstaPay order | ORD-014 / ORD-015 |
| `submit_payment_proof` | wrong status / expired / missing reference / duplicate reference / order awaiting approval | PAY-004 / PAY-001 / PAY-003 / PAY-005 / PAY-007 |
| `get_payment_instructions` | not owner / awaiting approval | ORD-009 / PAY-007 |
| `admin_approve_order` / `admin_reject_order` | not admin / not `aal2` / not awaiting approval | ADM-001 / ADM-002 / PAY-004 |
| `admin_review_payment` | not admin / not `aal2` / already paid / wrong status | ADM-001 / ADM-002 / PAY-002 / PAY-004 |
| `admin_delete_product` | ordered product | ADM-004 |
| `admin_delete_category` | has products, no target | ADM-005 |
| `admin_update_setting` | key not allowed / invalid value | ADM-008 / ADM-007 |
| `admin_dashboard` and every admin function | not admin / not `aal2` | ADM-001 / ADM-002 |

`require_admin()` (created in T-1.15) raises ADM-002 when the caller has the admin role but the session is not `aal2`, and ADM-001 otherwise.

# Change request: approve-first InstaPay flow and saved address

Version 1.0, 2026-10-12. Amends `database-contract.md`, `error-codes.md`, the copy deck in `design-system.md`, and roadmap tasks T-4.02, T-4.03, T-4.06, T-5.05, T-5.08 and T-5.09. Decided by the owner: the shop approves an order **before** the customer is asked to pay.

Migrations already merged (including T-1.18) stay untouched. Everything below is a new, append-only migration plus UI changes.

## 1. The flow (InstaPay orders, when `require_order_approval` is on)

| Step | Who | What happens | Order state |
|---|---|---|---|
| 1 | Customer | Fills the location form once, chooses InstaPay, presses "إرسال الطلب" | `pending`, `payment_status = awaiting_approval`; stock is held; no QR is shown |
| 2 | Owner | Sees the request under Orders, filter "بانتظار الموافقة". Approves, or rejects with a reason | reject: `cancelled`, stock returns |
| 3 | Owner | Approve sets the payment deadline. "موافقة وإرسال عبر واتساب" opens WhatsApp with a prefilled message and the pay link | `confirmed`, `payment_status = awaiting_proof`, deadline = now + window |
| 4 | Customer | Opens the pay page: the QR, the exact amount, the deadline. Pays in the banking app, uploads a screenshot and the transfer reference | `under_review` |
| 5 | Owner | Checks the **real** InstaPay or bank notification (a screenshot alone can be faked), then confirms or rejects the payment | `paid`, or `rejected` (customer may resubmit before the deadline) |
| 6 | Owner | Marks the order shipped, then delivered. The database refuses `shipped` for an InstaPay order that is not `paid` | `shipped`, `delivered` |

Timers: `awaiting_approval` for longer than `approval_window_hours` (default 24) is cancelled and restocked. `awaiting_proof` past the payment deadline is cancelled and restocked (existing behaviour).

If the setting is off, step 2 is skipped and the QR appears right after checkout (the behaviour already specified). Cash on delivery is unchanged; the owner still confirms it.

**How the customer finds out about approval:** the order page shows "بانتظار موافقة المتجر" until approval, then the QR. To tell them, the owner uses the WhatsApp button (a `wa.me` link built in the browser from the customer's mobile; Egyptian numbers become `20` + the number without the leading 0). It needs no email service and no API. Email can be added later. The pay link needs a login, so the link alone leaks nothing.

## 2. Saved address

- The profile keeps one default address (the columns already exist). The checkout form is prefilled from it.
- After a successful order, the address is saved to the profile when the profile has none, or when the box **"احفظ هذا العنوان لطلباتي القادمة"** is ticked (ticked by default). Using another address for one order does not overwrite the saved one unless the box is ticked.
- The customer can edit it on the account page. Each order keeps its own copy, so old orders never change.
- It is stored in the cloud database (Supabase Postgres) once the cloud project exists. Row-level security lets only the customer and an admin at `aal2` read it. Deletion and anonymisation follow `docs/runbooks/data-requests.md`.

## 3. Database changes (new migration, task T-1.23)

- Add `awaiting_approval` to `payment_status`.
- Settings allow-list: `require_order_approval` (boolean, default true), `approval_window_hours` (integer 1 to 72, default 24, private). The InstaPay keys `instapay_qr_path` and `instapay_handle` become **private**; customers get them only through the function below.
- `place_order`: for `instapay_qr` with approval required, set `payment_status = awaiting_approval` and no deadline; otherwise as before.
- `admin_approve_order(p_order_id, p_note default null)`: admin at `aal2`, audited. Requires `awaiting_approval`. Sets `status = confirmed`, `payment_status = awaiting_proof`, `payment_deadline = now() + payment window`.
- `admin_reject_order(p_order_id, p_reason)`: admin at `aal2`, audited. Requires `awaiting_approval`. Cancels (stock returns through the existing trigger) and stores the reason.
- `get_payment_instructions(p_order_id)`: the order's owner only, and only while `payment_status` is `awaiting_proof`, `rejected` or `under_review`. Returns QR path, InstaPay address, amount and deadline. Returns nothing (PAY-007) before approval.
- `submit_payment_proof`: refused before approval (PAY-007).
- `orders_status_guard`: an `instapay_qr` order cannot become `shipped` or `delivered` unless `payment_status = paid` (ORD-015).
- `expire_unpaid_orders()` also cancels `awaiting_approval` orders older than `approval_window_hours`.

## 4. Screens and copy

| Place | Change |
|---|---|
| Checkout (T-4.02) | Save-address checkbox. For InstaPay with approval on: note "سنراجع طلبك أولًا، ثم نرسل لك رابط الدفع." and the button reads "إرسال الطلب" |
| Order pages (T-4.03) | Timeline: بانتظار موافقة المتجر، بانتظار الدفع، قيد المراجعة، تم تأكيد الدفع، تم الشحن، تم التسليم |
| Pay page (T-4.06) | Shows the waiting message until approved; the QR and amount come only from `get_payment_instructions` |
| Orders admin (T-5.05) | Filter "بانتظار الموافقة"; buttons موافقة, رفض, موافقة وإرسال عبر واتساب; shipping disabled until paid, with the reason shown |
| Payment review (T-5.08) | "تأكيد الدفع" and "رفض"; the "shipped" action stays disabled until `paid` |
| Settings (T-5.09) | Toggle `require_order_approval` and `approval_window_hours` (step-up confirmation) |

Arabic strings (drafts for native review):

| Key | Arabic |
|---|---|
| paystatus.awaiting_approval | بانتظار موافقة المتجر |
| order.approval_wait | وصل طلبك للمتجر. سنراجعه ونرسل لك رابط الدفع قريبًا. |
| checkout.submit_request | إرسال الطلب |
| checkout.save_address | احفظ هذا العنوان لطلباتي القادمة |
| admin.approve / admin.reject | موافقة / رفض |
| admin.approve_whatsapp | موافقة وإرسال عبر واتساب |
| admin.confirm_payment | تأكيد الدفع |
| admin.ship_blocked | لا يمكن الشحن قبل تأكيد الدفع |
| whatsapp.message | أهلًا {name}، تمت الموافقة على طلبك رقم {order}. ادفع عبر الرابط وارفع صورة التحويل: {link} |

## 5. New error codes (append to `error-codes.md`)

| Code | Arabic message | When |
|---|---|---|
| ORD-015 | لا يمكن شحن الطلب قبل تأكيد الدفع. | Shipping an unpaid InstaPay order |
| PAY-007 | هذا الطلب بانتظار موافقة المتجر. | Asking for payment details or sending a proof before approval |
| PAY-008 | انتهت مهلة موافقة المتجر وتم إلغاء الطلب. | Approval window expired |

## 6. Tests

| ID | Scenario |
|---|---|
| S32 | Approve moves the order to `confirmed` and `awaiting_proof` with a deadline; the customer then gets instructions |
| S33 | Reject cancels the order and restocks; the reason is stored |
| S34 | `shipped` and `delivered` are refused for an unpaid InstaPay order (ORD-015) and allowed after `paid` |
| S35 | Before approval, `get_payment_instructions` and `submit_payment_proof` are refused (PAY-007) |
| S36 | Expiry cancels unapproved orders after the approval window and restocks |
| S37 | Only the order's owner can call `get_payment_instructions`; admins use the admin screens |
| E1 | First order saves the address; the second checkout is prefilled; "another address" does not overwrite it when unticked |
| E2 | The WhatsApp link opens with the right number and the pay URL |

## 7. Task changes

| Task | Change |
|---|---|
| **T-1.23 (new, Phase 1, lane A)** | The migration and pgTAP tests above. Do it before T-4.06 and T-5.08 |
| T-4.02 | Save-address behaviour and the InstaPay approval note |
| T-4.03 | Timeline with the new status |
| T-4.06 | Waiting state, instructions only through `get_payment_instructions` |
| T-5.05, T-5.08, T-5.09 | Approve and reject, WhatsApp button, shipping guard, settings toggles |
| T-4.07, T-5.12 | End-to-end scenarios E1, E2 and the approval path |
| T-7.08 | Security tests: no QR or instructions before approval; no proof before approval; no shipping of unpaid InstaPay orders |
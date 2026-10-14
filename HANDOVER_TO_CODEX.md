# Handover to Codex / Owner

## Objective

Completed change request **"approve-first InstaPay flow and saved address"** (v1.0, 2026-10-12) across:
1. **Database Migration (`T-1.23`)** on branch `agent/T-1.23-order-approval-migration` (commit `7ee2766`).
2. **Full UI Flow (`T-4.02`, `T-4.03`, `T-4.06`, `T-5.05`)** on branch `agent/T-4.02-order-approval-ui` (commit `24314b0`).

Both branches have been pushed to remote `origin`.

---

## Completed Architecture & Implementation

### 1. Database (T-1.23)
- **Migration:** `supabase/migrations/20261014023000_order_approval_and_saved_address.sql`.
- **Enum:** Added `'awaiting_approval'` to `payment_status`.
- **Settings:** Allow-listed `require_order_approval` (boolean, default true) and `approval_window_hours` (integer 1..72, default 24). Privacy hardened `instapay_qr_path` and `instapay_handle` to private.
- **RPC `place_order`:**
  - For `instapay_qr` with approval required: sets `payment_status = 'awaiting_approval'` with no deadline.
  - Added `p_save_address boolean default true`: updates profile default address if true or if profile address was empty.
- **RPC `admin_approve_order(p_order_id bigint, p_note text default null)`:**
  - Requires admin at `aal2` (audited). Sets `status = 'confirmed'`, `payment_status = 'awaiting_proof'`, and computes `payment_deadline = now() + payment_window`.
- **RPC `admin_reject_order(p_order_id bigint, p_reason text)`:**
  - Requires admin at `aal2` (audited). Sets `status = 'cancelled'`, logs reason in `audit_log`, and automatically restocks held inventory via trigger.
- **RPC `get_payment_instructions(p_order_id bigint)`:**
  - Order owner only. Returns QR path, InstaPay handle, amount, and deadline only when order is in `awaiting_proof`, `under_review`, or `rejected`. Raises `PAY-007` before approval.
- **RPC `submit_payment_proof`:** Refuses submissions while in `awaiting_approval` (`PAY-007`).
- **Trigger `orders_status_guard`:** Enforces `ORD-015`: an `instapay_qr` order cannot transition to `shipped` or `delivered` unless `payment_status = 'paid'`.
- **Automated Restock:** Overdue `awaiting_approval` orders (older than `approval_window_hours`) are automatically cancelled and restocked by `expire_unpaid_orders()`.
- **pgTAP Test Suite:** `supabase/tests/database/15_order_approval.test.sql` (36/36 assertions passing).

### 2. Checkout UI (T-4.02)
- Added "احفظ هذا العنوان لطلباتي القادمة" checkbox (default checked).
- When `require_order_approval` is active, displays notice: *"سنراجع طلبك أولًا، ثم نرسل لك رابط الدفع."* and primary CTA *"إرسال الطلب"*.
- Passes `p_save_address` to `place_order`.

### 3. Order Details & History UI (T-4.03)
- `OrderStatusTimeline`: renders notice *"وصل طلبك للمتجر. سنراجعه ونرسل لك رابط الدفع قريبًا."* when `payment_status === 'awaiting_approval'`.
- `AccountOrdersPage`: shows badge for "بانتظار موافقة المتجر"; restricts direct payment link while awaiting approval.

### 4. Pay Order Page UI (T-4.06)
- Integrates `usePaymentInstructions` polling with dynamic amount and deadline.
- When `awaiting_approval`: hides QR code, handle, countdown, and proof upload dropzone; renders friendly review notice *"طلبك قيد المراجعة والموافقة"*.

### 5. Orders Administration UI (T-5.05)
- `OrdersPage`: added tab and dropdown filter for "بانتظار الموافقة" (`awaiting_approval`).
- Actions: orders awaiting approval show primary CTA *"مراجعة وموافقة"*.
- `OrderDetailModal`:
  - Approval actions:
    - *"موافقة وإرسال عبر واتساب"*: approves order via `admin_approve_order` and opens prefilled WhatsApp link (`https://wa.me/20<phone>?text=<msg>`).
    - *"موافقة فقط"*: approves order via `admin_approve_order`.
    - *"رفض الطلب"*: launches rejection dialog.
  - `OrderRejectDialog`: requires a mandatory rejection reason; calls `admin_reject_order`; warns about irreversible stock return.
  - Enforces `ORD-015`: hides *"شحن الطلب"* and displays warning banner for unpaid InstaPay orders.

---

## Verification Evidence

- `npm run verify` passed cleanly:
  - `check:migrations`: Existing migrations unchanged.
  - `check:sql`: All migrations passed SQL guard rules.
  - `check:tokens`: Documented colors, radii, and shadows validated.
  - `check:i18n`: All translation keys valid and synchronized.
  - `lint`: 0 errors.
  - `format:check`: Prettier passed.
  - `typecheck`: TypeScript passed with 0 errors.
  - `test:unit`: **620 application tests + 143 tooling tests (763 total) passed**.
  - `build`: Production build succeeded.
  - `check:secrets`: Zero secrets leaked.
  - `check:bundle`: **199,785 / 200,000 gzip bytes** in 4 initial chunks.

---

## Next Task (per Roadmap)

- **T-5.11: CSV export** (`/admin/export` or export buttons across tables):
  - Export products, orders, customers, and audit log.
  - UTF-8 with BOM for Arabic Excel support.
  - Formula injection defense: prefix `=`, `+`, `-`, `@`, tab, or `\r` with single quote `'`.
  - Step-up confirmation for exporting customer data.

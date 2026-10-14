# Data subject requests and retention runbook

- Status: active
- Task: T-7.11
- Reference: Egyptian Personal Data Protection Law No. 151 of 2020, `docs/spec/security-model.md` SEC-21, O-14
- Applies to: Production and staging customer data

This runbook defines the operational procedures for fulfilling Data Subject Requests (DSR) — including data access/export and the right to erasure/anonymization — and enforces the statutory data retention schedule for Lolys' Accessories & Home.

---

## 1. Statutory data retention schedule (O-14)

Under Egyptian Law No. 151 of 2020 and commercial accounting best practices, data is retained strictly for the duration necessary to satisfy its operational, legal, and tax purposes:

| Data category                                               | Retention period                          | Storage location                                                       | Removal / Anonymization mechanism                                                                       |
| ----------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Payment Proofs** (InstaPay transfer screenshots)          | **90 days** post-delivery                 | Private Supabase Storage bucket `payment-proofs/{user_id}/{order_id}/` | Automated purge via `PurgeProofsDialog` or scheduled cleanup script                                     |
| **Audit Log Entries**                                       | **2 years**                               | Append-only database table `public.audit_log`                          | Statutory compliance window; automated partition drop or archival                                       |
| **Order Financial Records** (Subtotal, total, items, dates) | **5 years** (Commercial Code requirement) | `public.orders`, `public.order_items`                                  | Retained indefinitely for tax/financial reporting; personal identity fields stripped on erasure request |
| **Customer Contact & Delivery Data**                        | Until account closure or erasure request  | `public.profiles`, `public.orders` (shipping fields)                   | Anonymized via `admin_anonymize_customer(p_user_id)`                                                    |
| **Browser Local Storage**                                   | Until customer clears cache               | Browser `localStorage` (`theme`, `cart:v1`, auth token)                | Zero tracking cookies; clearable by user at any time                                                    |

---

## 2. Customer rights under Egyptian Law No. 151 of 2020

Customers have the following statutory rights regarding their personal data:

1. **Right to Access / Export (حق الاطلاع والحصول على البيانات):** The right to receive a copy of all personal data held about them in a readable electronic format.
2. **Right to Rectification (حق التصحيح والتعديل):** Self-service via the storefront at `/account` (full name, phone numbers, detailed shipping address).
3. **Right to Erasure / Anonymization (حق المحو والنسيان):** The right to have personal data erased or permanently anonymized when no longer required for active order fulfillment.

**Response Timeline:** All requests must be acknowledged within **48 hours** and fulfilled within **6 working days** (well within statutory limits).

---

## 3. Procedure: Customer data export (Right of Access)

When a verified customer requests an export of their personal data:

### Step 3.1: Identity verification

1. Confirm the request originates from the customer's registered email address or verified Egyptian mobile number on WhatsApp.
2. Retrieve the customer's `user_id` from the admin customer panel at `/admin/customers` or via SQL:
   ```sql
   SELECT id, full_name, phone, role, created_at
   FROM public.profiles
   WHERE phone = '01xxxxxxxxx' OR id = '<user-uuid>';
   ```

### Step 3.2: Extract customer data bundle

Execute the following read-only query to produce a complete JSON data package:

```sql
SELECT jsonb_build_object(
  'exported_at', now(),
  'profile', (
    SELECT row_to_json(p) FROM (
      SELECT id, full_name, phone, alt_phone, city, district, address, floor, apartment, landmark, created_at
      FROM public.profiles WHERE id = '<customer-user-uuid>'
    ) p
  ),
  'favorites', (
    SELECT jsonb_agg(row_to_json(f)) FROM (
      SELECT fav.created_at, pr.name AS product_name, pr.name_ar AS product_name_ar, pr.price
      FROM public.favorites fav
      JOIN public.products pr ON pr.id = fav.product_id
      WHERE fav.user_id = '<customer-user-uuid>'
    ) f
  ),
  'orders', (
    SELECT jsonb_agg(row_to_json(o)) FROM (
      SELECT
        ord.id AS order_id,
        ord.created_at,
        ord.status,
        ord.payment_status,
        ord.payment_method,
        ord.delivery_method,
        ord.total,
        ord.subtotal,
        ord.shipping_fee,
        ord.ship_name,
        ord.ship_phone,
        ord.ship_governorate,
        ord.ship_city,
        ord.ship_address,
        (
          SELECT jsonb_agg(row_to_json(item)) FROM (
            SELECT product_name, quantity, unit_price
            FROM public.order_items
            WHERE order_id = ord.id
          ) item
        ) AS items
      FROM public.orders ord
      WHERE ord.user_id = '<customer-user-uuid>'
      ORDER BY ord.created_at DESC
    ) o
  )
) AS customer_data_export;
```

### Step 3.3: Deliver export securely

1. Save the JSON package as `lolys-data-export-<date>.json`.
2. Transmit the file directly to the customer's verified email address with password-protected archive (or encrypted attachment).

---

## 4. Procedure: Customer anonymization (Right to Erasure)

When a customer requests account deletion and erasure:

### Step 4.1: Pre-flight operational checks

Before executing erasure, verify that the customer has **no active orders in flight**:

```sql
SELECT id, status, payment_status, total, created_at
FROM public.orders
WHERE user_id = '<customer-user-uuid>'
  AND status IN ('pending', 'confirmed', 'shipped');
```

> [!WARNING]
> If any active orders exist, inform the customer that their request will be completed immediately once all in-flight shipments are delivered or formally cancelled.

### Step 4.2: Execute atomic database anonymization

Connect with an admin session authenticated at `AAL2` (two-factor authenticated) and invoke the hardened stored procedure:

```sql
SELECT public.admin_anonymize_customer('<customer-user-uuid>');
```

**What this function accomplishes atomically:**

1. Verifies that the actor is an administrator at `AAL2` (raises `ADM-001` or `ADM-002` otherwise).
2. Clears all personal fields in `public.profiles`:
   - `full_name` is reset to `'عميل مجهول'`.
   - `phone`, `alt_phone`, `governorate_id`, `city`, `district`, `address`, `floor`, `apartment`, `landmark` are set to `NULL`.
3. Clears all personal shipping and contact fields across all the customer's orders in `public.orders`:
   - `ship_name` is reset to `'عميل مجهول'`.
   - `ship_phone` is reset to `'00000000000'`.
   - `ship_address` is reset to `'[محذوف]'`.
   - `ship_alt_phone`, `ship_city`, `ship_district`, `ship_floor`, `ship_apartment`, `ship_landmark`, `notes`, `payment_reference`, `payment_proof_path` are set to `NULL`.
4. **Preserves accounting integrity:** Order numbers, product line items, unit prices, subtotals, delivery fees, and order totals are kept intact for financial and tax auditing.
5. Deletes customer favorites from `public.favorites`.
6. Logs a `CUSTOMER_ANONYMIZE` event in `public.audit_log` recording the action without storing the erased personal data.

### Step 4.3: Storage proof deletion

Check and delete any payment proof image files belonging to the customer in Supabase Storage:

1. In Supabase Dashboard -> **Storage** -> `payment-proofs`.
2. Locate the folder with the customer's `<customer-user-uuid>` and delete all files inside.

### Step 4.4: Disable authentication account

Prevent future logins using the credentials:

1. **Option A (Via Supabase Dashboard):**
   - Go to **Authentication** -> **Users**.
   - Search for the customer's email or UUID.
   - Click the user's action menu -> **Delete user** (or **Ban user**).
2. **Option B (Via SQL):**
   ```sql
   UPDATE auth.users
   SET banned_until = '2099-01-01 00:00:00+00'
   WHERE id = '<customer-user-uuid>';
   ```

---

## 5. Verification checklist

After completing an anonymization request, verify the results:

| Verification step          | Command / SQL check                                                                                                  | Expected outcome                             |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Profile PII cleared        | `SELECT full_name, phone, address FROM public.profiles WHERE id = '<uuid>';`                                         | `'عميل مجهول'`, `NULL`, `NULL`               |
| Order PII cleared          | `SELECT ship_name, ship_phone, ship_address FROM public.orders WHERE user_id = '<uuid>';`                            | `'عميل مجهول'`, `'00000000000'`, `'[محذوف]'` |
| Financial totals preserved | `SELECT total, subtotal, shipping_fee FROM public.orders WHERE user_id = '<uuid>';`                                  | Exact original numerical totals              |
| Order items preserved      | `SELECT count(*) FROM public.order_items WHERE order_id IN (SELECT id FROM public.orders WHERE user_id = '<uuid>');` | Matches original item counts                 |
| Favorites deleted          | `SELECT count(*) FROM public.favorites WHERE user_id = '<uuid>';`                                                    | `0`                                          |
| Audit logged               | `SELECT * FROM public.audit_log WHERE action = 'CUSTOMER_ANONYMIZE' AND entity_id = '<uuid>';`                       | Exactly 1 record with admin actor            |
| Auth blocked               | Attempt sign-in with user email / password                                                                           | Login refused                                |

---

## 6. Communication templates

### Arabic (Primary):

> **الموضوع: تأكيد إتمام طلب حذف وتجهيل البيانات الشخصية**
>
> عميلنا العزيز،
>
> تحية طيبة من متجر لوليز للإكسسوارات والمنزل،
>
> نود إفادتكم بأنه بناءً على طلبكم ووفقًا لأحكام قانون حماية البيانات الشخصية المصري رقم 151 لسنة 2020، قد تم بنجاح حذف وتجهيل كافة بياناتكم الشخصية المسجلة لدينا بشكل نهائي ولا رجعة فيه.
>
> **ملخص الإجراءات المنفذة:**
>
> 1. إزالة وتجهيل الاسم ورقم الهاتف وعناوين التوصيل المرتبطة بحسابكم وبكافة طلباتكم السابقة.
> 2. حذف كافة إثباتات التحويل والصور المرفوعة من خوادمنا.
> 3. إلغاء تفعيل حساب الدخول الخاص بكم.
>
> يُرجى ملاحظة أن السجلات المحاسبية والمالية الإجمالية للطلبات تظل محفوظة وفقًا للمتطلبات الضريبية والقانونية مع تجريدها التام من أي بيانات تعريفية شخصية.
>
> شكرًا لثقتكم بنا، ونتمنى لكم دائمًا كل التوفيق.
>
> **فريق خدمة عملاء متجر لوليز**

### English:

> **Subject: Confirmation of personal data erasure request completion**
>
> Dear Customer,
>
> Greetings from Lolys' Accessories & Home,
>
> We confirm that in accordance with your request and pursuant to Egyptian Personal Data Protection Law No. 151 of 2020, all personal data associated with your account has been permanently and irreversibly anonymized across our systems.
>
> **Actions taken:**
>
> 1. Anonymized and purged your name, telephone numbers, and delivery addresses from your profile and order history.
> 2. Purged all uploaded payment verification documents from secure storage.
> 3. Deactivated and revoked your platform authentication credentials.
>
> Aggregate financial records are retained in an anonymous format strictly to comply with commercial tax and accounting obligations.
>
> Thank you for your past patronage.
>
> **Lolys Customer Care Team**

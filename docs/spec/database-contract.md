# Database contract

Version 1.1, 2026-10-07. Applies to roadmap v1.1. The six tested SQL files in `docs/db/initial-sql/` are the starting point (they become migrations in T-1.02). Everything marked **new** is added by a later migration task. If this file and a migration disagree, fix whichever is wrong and log it in the work log.

## 1. Migration order

| Task | Migration |
|---|---|
| T-1.02 | Initial schema, security, functions, view, governorates, storage (from the tested SQL) |
| T-1.10 | Error codes in `hint` (see `error-codes.md`) |
| T-1.15 | Admin hardening: `aal2` in `is_admin()`, `require_admin()`, drop `admin_set_role`, role guard trigger, length checks, clamp sign-up metadata |
| T-1.16 | `audit_log` and triggers |
| T-1.17 | `shop_settings`, `admin_update_setting`, bucket limits |
| T-1.18 | Orders v2: structured address, payment method and status, InstaPay functions, `payment-proofs` bucket, expiry |
| T-1.19 | Catalog admin support: category and product flags, safe delete functions, image path checks |
| T-1.20 | Abuse controls: `rate_limits`, `check_rate_limit`, order caps |
| T-1.21 | `stock_movements` ledger |
| T-1.23 | Order approval, saved address, private InstaPay settings, S32-S37 |
| T-9.01 | `analytics` schema and roles |

## 2. Enums

`user_role` (customer, admin) | `order_status` (pending, confirmed, shipped, delivered, cancelled) | `delivery_method` (egypt_post, representative) | `payment_method` (cod, instapay_qr) | `payment_status` (unpaid, awaiting_approval, awaiting_proof, under_review, paid, rejected) | `stock_reason` (order, cancel, admin_adjust, restock, correction)

## 3. Tables (public), final shape

- `profiles` (id, full_name, phone, alt_phone, governorate_id, city, district, address, floor, apartment, landmark, role, created_at). `address` is the street and building line.
- `categories` (id, name, name_ar, slug, image_url, sort_order, **is_active**, **show_on_home**, created_at)
- `products` (id, category_id, name, name_ar, description, description_ar, price, discount_percent, **final_price\***, stock_quantity, **in_stock\***, sold_count, is_active, **is_featured**, image_url, extra_images, created_at, updated_at). \*generated, never write.
- `orders` (id, user_id, status, delivery_method, payment_method, **payment_status**, subtotal, shipping_fee, total, ship_name, ship_phone, **ship_alt_phone**, ship_governorate, ship_city, **ship_district**, ship_address, **ship_floor**, **ship_apartment**, **ship_landmark**, notes, tracking_number, rep_name, rep_phone, **payment_reference** (unique when set), **payment_proof_path**, **payment_deadline**, **payment_submitted_at**, **paid_at**, **payment_reviewed_by**, **payment_review_note**, created_at, updated_at)
- `order_items` (id, order_id, product_id, product_name, quantity, unit_price)
- `favorites` (user_id, product_id, created_at)
- `governorates` (id, name_en, name_ar); `delivery_fees` (governorate_id, method, fee)
- **new** `shop_settings` (key, value jsonb, is_public, updated_at, updated_by)
- **new** `audit_log` (id, at, actor, actor_role, action, entity, entity_id, old, new). Append-only: no API role can write, update or delete; a trigger blocks update and delete for everyone.
- **new** `stock_movements` (id, product_id, delta, new_quantity, reason, order_id, actor, at). Filled by a trigger on `products.stock_quantity`; functions set the reason through `set_config('app.stock_reason', ...)`; an unexplained admin edit is `admin_adjust`.
- **new** `rate_limits` (key, window_start, count). Internal; no API grants.

Length limits (check constraints): names 100, phone 20, address parts 150, landmark 150, notes 500, setting values per key.

**Image columns store storage paths, not URLs**, matching `^(products|categories|settings)/[A-Za-z0-9/_-]+\.(webp|jpg|jpeg|png)$`. The app builds the public URL.

## 4. Payment status rules

| Payment | Start | Moves to |
|---|---|---|
| `cod` | `unpaid` | `paid` automatically when the order becomes `delivered` |
| `instapay_qr` (approval on) | `awaiting_approval` (no deadline, stock held) | `confirmed` and `awaiting_proof` with deadline set upon `admin_approve_order`; `cancelled` upon `admin_reject_order`; `under_review` when customer submits proof; `paid` or `rejected` when admin reviews; orders past approval window or payment deadline are cancelled and restocked by `expire_unpaid_orders()`. `shipped` and `delivered` are refused until `paid` (ORD-015). |
| `instapay_qr` (approval off) | `awaiting_proof` (with `payment_deadline` = created + window, default 24 h) | `under_review` when customer submits proof; `paid` or `rejected` when admin reviews; unpaid orders past deadline are cancelled and restocked by `expire_unpaid_orders()`. `shipped` and `delivered` are refused until `paid` (ORD-015). |

Revenue stays "orders that are `delivered`". The dashboard also shows `awaiting_review` count and `paid_total`.

## 5. Functions

All admin functions start with `require_admin()` (ADM-001 or ADM-002). All write to `audit_log`. No function builds SQL by joining strings.

| Function | Who | Does |
|---|---|---|
| `is_admin()` | all roles | true only if the role is `admin` **and** the JWT `aal` claim is `aal2` |
| `require_admin()` | internal | raises ADM-002 if admin role at `aal1`, else ADM-001 |
| `place_order(p_items jsonb, p_delivery_method, p_payment_method, p_ship jsonb) → bigint` | authenticated | Validates, rate-limits, enforces pending limit and caps, takes prices from the database, locks stock rows, writes order and items, sets `payment_status` (`awaiting_approval` if `require_order_approval` is on and payment is `instapay_qr`, else `awaiting_proof` or `unpaid`). Saves address to `profiles` if missing or if `p_ship ->> 'save_address'` is true. |
| `cancel_my_order(p_order_id)` | authenticated | Own pending orders only; restocks |
| `admin_approve_order(p_order_id, p_note default null)` | admin | Requires `awaiting_approval`; sets status `confirmed`, `payment_status = awaiting_proof`, `payment_deadline = now() + payment window` |
| `admin_reject_order(p_order_id, p_reason)` | admin | Requires `awaiting_approval`; cancels order (restocks through trigger) and stores reason |
| `get_payment_instructions(p_order_id) → jsonb` | authenticated | Own order only; returns `{qr_path, instapay_handle, amount, deadline}` only while `awaiting_proof`, `under_review`, or `rejected`. Raises PAY-007 before approval. |
| `submit_payment_proof(p_order_id, p_reference, p_proof_path)` | authenticated | Own `instapay_qr` order awaiting proof or rejected, before the deadline; refuses if awaiting approval (PAY-007); `p_proof_path` must start with `<uid>/<order_id>/`; sets `under_review` |
| `admin_review_payment(p_order_id, p_approve, p_note)` | admin | `under_review` to `paid` or `rejected`; records reviewer and time |
| `expire_unpaid_orders()` | cron / owner only | Cancels overdue unpaid `instapay_qr` orders and unapproved orders past `approval_window_hours` (restock through the existing trigger); scheduled with `pg_cron` every 30 minutes |
| `admin_delete_product(p_id)` | admin | Deletes only if never in an order, else ADM-004 |
| `admin_delete_category(p_id, p_move_to)` | admin | If products exist, moves them to `p_move_to` first (else ADM-005) |
| `admin_update_setting(p_key, p_value)` | admin | Allow-listed keys only (below), typed validation |
| `admin_dashboard(p_from, p_to)` | admin | JSON for the dashboard (shape in the tested SQL, plus `awaiting_review` and `paid_total` in `kpis`) |
| `check_rate_limit(p_action, p_limit, p_window)` | internal | Counts by user id; raises SYS-003 |

`admin_dashboard` result: `range{from,to}`, `kpis{orders,pending,booked_total,delivered_total,avg_order,awaiting_review,paid_total}`, `daily[{day,orders,booked_total,delivered_total}]`, `by_status{status:n}`, `by_method[{method,orders,total}]`, `by_governorate[{governorate,orders,total}]`, `top_products[{product_id,name,units,sales}]`, `top_customers[{user_id,name,orders,total}]`, `low_stock[{product_id,name,stock}]`.

**Removed:** `admin_set_role`. Admins are created only by owner SQL (`docs/runbooks/first-admin.md`). A trigger blocks any change to `profiles.role` unless the session user is the database owner.

## 6. Settings allow-list

| Key | Type | Public | Default |
|---|---|---|---|
| `shop_name_ar`, `shop_name_en` | text, 60 | yes | "Lolys' Accessories & Home" |
| `tagline_ar` | text, 120 | yes | empty |
| `phone`, `whatsapp` | phone, 20 | yes | empty |
| `instagram` | https URL, 100 | yes | empty |
| `announcement_ar` | text, 200 | yes | empty |
| `hero_title_ar`, `hero_subtitle_ar` | text, 120 / 240 | yes | from copy deck |
| `sale_percent` | integer 0 to 90 | yes | 50 |
| `payment_methods_enabled` | array of `cod`, `instapay_qr` | yes | both |
| `instapay_qr_path` | storage path | no | placeholder |
| `instapay_handle` | text, 60 | no | empty |
| `returns_text_ar` | text, 2000 | yes | placeholder |
| `payment_window_hours` | integer 1 to 72 | no | 24 |
| `pending_order_limit` | integer 1 to 10 | no | 3 |
| `require_order_approval` | boolean | yes | true |
| `approval_window_hours` | integer 1 to 72 | no | 24 |

## 7. Storage

| Bucket | Access | Limits |
|---|---|---|
| `product-images` | public read; admin write, replace, delete | 3 MB; JPEG, PNG, WebP; folders `products/`, `categories/`, `settings/` |
| `payment-proofs` | private; customer may upload to and read their own folder `<uid>/<order_id>/`; admin reads all (short-lived signed links) and may delete (retention purge) | 5 MB; JPEG, PNG, WebP |

## 8. What each role may do through the API

- **anon:** read categories (active), products (active), governorates, delivery fees, public settings.
- **authenticated:** the above, plus own profile (update `full_name, phone, alt_phone, governorate_id, city, district, address, floor, apartment, landmark`), own orders and items (read), favorites (read, add, delete), `customer_stats` (own row), `place_order`, `cancel_my_order`, `submit_payment_proof`.
- **admin at `aal2`:** write categories, products, delivery fees, governorates; update orders (`status, tracking_number, rep_name, rep_phone` only); read everything including `audit_log` and `stock_movements`; call the admin functions. At `aal1` an admin has customer rights only.

## 9. Analytics schema (T-9.01)

- `analytics.sales_daily` (day, product_id, category_id, units, revenue, orders, avg_discount_pct) from non-cancelled orders with confirmed payment; no personal data.
- `analytics.stock_daily` (day, product_id, closing_stock, stockout_flag) rebuilt from `stock_movements`.
- `analytics.calendar` (day, ramadan, eid_fitr, eid_adha, mothers_day, valentines, black_friday, back_to_school, weekday).
- `analytics.forecast_runs`, `analytics.sales_forecasts`, `analytics.forecast_metrics`, view `analytics.forecast_accuracy`, and the aggregate insight tables `analytics.basket_pairs` and `analytics.cohort_retention` (written by the job; no personal data).
- Roles: `analytics_reader` (select on `analytics` views only; no access to `public` tables) and `analytics_writer` (insert on forecast tables only). Neither can read personal data.

## 10. Test scenarios

Scenarios S1 to S18 were run once by hand on PostgreSQL 16 with stand-ins for Supabase auth and storage (all passed). Re-implement every scenario as pgTAP on the real local stack.

| ID | Scenario | Task |
|---|---|---|
| S1 | Sign-up creates a profile; a role sent in sign-up metadata is ignored | T-1.05 |
| S2 | Visitors read active products only; cannot read orders or profiles, nor call `place_order` | T-1.05 |
| S3 | A customer edits their own profile but cannot change `role` | T-1.05 |
| S4 | `place_order` uses database prices, adds the fee, updates `stock_quantity` and `sold_count` | T-1.06 |
| S5 | Rejected with nothing written: oversell, out of stock, unknown product, empty or invalid cart, zero or negative quantity, missing address, unavailable method | T-1.06 |
| S6 | Duplicate cart lines for one product are merged | T-1.06 |
| S7 | Two buyers racing for the last units: the second waits, then gets the stock error | T-1.08 |
| S8 | Customers cannot insert or update orders or products directly | T-1.05 |
| S9 | Customers see only their own orders, items and statistics; the admin sees all | T-1.05 |
| S10 | Admin updates only status, tracking and representative fields; cancelling restocks; reopening is blocked | T-1.06 |
| S11 | A customer cancels their own pending order; shipped orders and other people's are refused | T-1.06 |
| S12 | `admin_dashboard` works for the admin and refuses customers | T-1.07 |
| S13 | `admin_set_role`: self-demotion blocked; customers refused (superseded by S20 once T-1.15 drops the function) | T-1.07 |
| S14 | Admin creates categories and products; generated columns protected; invalid slug rejected | T-1.07 |
| S15 | Favorites are private to each user | T-1.05 |
| S16 | Anonymous role has read-only access to the public tables and nothing else | T-1.07 |
| S17 | RLS is enabled on every `public` table | T-1.04 |
| S18 | Every failure path returns its code in `hint` | T-1.10 |
| S19 | An admin at `aal1` reads zero admin rows and gets ADM-002 from admin functions; at `aal2` it works | T-1.15 |
| S20 | `admin_set_role` no longer exists; a trigger blocks `profiles.role` changes from API roles; owner SQL can still promote | T-1.15 |
| S21 | Audit log records admin changes; it is unreadable by customers; update and delete are blocked | T-1.16 |
| S22 | Settings: unknown keys and bad values rejected; public keys readable by anon, private keys not; changes audited | T-1.17 |
| S23 | Orders v2: structured address validated; disabled payment method refused; InstaPay order gets a deadline; COD becomes `paid` on delivery | T-1.18 |
| S24 | Payment proof: only the owner submits; path must match user and order; duplicate reference refused; admin approve and reject; resubmission after reject | T-1.18 |
| S25 | Overdue unpaid InstaPay orders are cancelled and restocked by `expire_unpaid_orders()` | T-1.18 |
| S26 | Catalog: delete category needs a move target; delete product only if never ordered; bad image paths rejected | T-1.19 |
| S27 | Pending-order limit, line cap and quantity cap enforced | T-1.20 |
| S28 | Rate limit throttles repeated calls and resets after the window | T-1.20 |
| S29 | Every stock change is in `stock_movements` with delta, reason and actor | T-1.21 |
| S30 | Length checks reject oversize text | T-1.15 |
| S31 | `analytics_reader` reads analytics views only; `analytics_writer` inserts forecasts only; neither reads `public` tables | T-9.01 |

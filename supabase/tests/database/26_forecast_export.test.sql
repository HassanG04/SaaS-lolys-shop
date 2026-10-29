BEGIN;
SELECT plan(17);
SET LOCAL timezone = 'UTC';
SELECT tests.create_supabase_user('export_admin');
SELECT tests.create_supabase_user('export_customer');
UPDATE public.profiles SET role = 'admin' WHERE id = tests.get_supabase_uid('export_admin');
SELECT ok(NOT has_function_privilege('anon', 'public.admin_get_forecast_export(boolean)', 'EXECUTE'), 'Anonymous execute revoked');
SELECT tests.clear_authentication();
SELECT throws_ok($$select public.admin_get_forecast_export(true)$$, '42501', NULL, 'Anonymous export denied');
SELECT tests.authenticate_as('export_customer', 'aal2');
SELECT throws_ok($$select public.admin_get_forecast_export(true)$$, '42501', NULL, 'Customer with MFA denied');
SELECT tests.authenticate_as('export_admin', 'aal1');
SELECT throws_ok($$select public.admin_get_forecast_export(true)$$, '42501', NULL, 'Admin without MFA denied');
SELECT tests.authenticate_as('export_admin', 'aal2');
SELECT is(public.admin_get_forecast_export(true)->>'ready', 'false', 'Empty sales cannot export');
RESET ROLE;
INSERT INTO public.categories(name,slug) VALUES ('Export test','export-test') RETURNING id AS cat \gset
INSERT INTO public.products(category_id,name,price,stock_quantity,created_at)
VALUES (:cat, '=formula', 200, 50, current_date - 56) RETURNING id AS prod \gset
INSERT INTO public.orders(user_id,status,delivery_method,payment_method,payment_status,subtotal,shipping_fee,total,
 ship_name,ship_phone,ship_governorate,ship_address,ship_postal_code,created_at)
SELECT tests.get_supabase_uid('export_customer'), 'confirmed','representative','cod','unpaid',100,0,100,
 'PRIVATE NAME','01012345678','Cairo','PRIVATE ADDRESS','11511',current_date - 55
FROM generate_series(1,30);
INSERT INTO public.order_items(order_id,product_id,product_name,quantity,unit_price)
SELECT id,:prod,'old product name',1,100 FROM public.orders WHERE user_id = tests.get_supabase_uid('export_customer');
SELECT tests.authenticate_as('export_admin', 'aal2');
SELECT is(public.admin_get_forecast_export(true)->>'ready', 'false', 'Thirty orders cannot bypass 56 days');
RESET ROLE;
UPDATE public.orders SET created_at = current_date - 56 WHERE user_id = tests.get_supabase_uid('export_customer');
UPDATE public.orders SET status = 'cancelled' WHERE id = (SELECT max(id) FROM public.orders WHERE user_id = tests.get_supabase_uid('export_customer'));
SELECT tests.authenticate_as('export_admin', 'aal2');
SELECT is(public.admin_get_forecast_export(true)->>'valid_orders', '29', 'Cancelled order excluded');
SELECT is(public.admin_get_forecast_export(true)->'rows', '[]'::jsonb, 'No rows below order gate');
RESET ROLE;
INSERT INTO public.orders(user_id,status,delivery_method,payment_method,payment_status,subtotal,shipping_fee,total,
 ship_name,ship_phone,ship_governorate,ship_address,ship_postal_code,created_at)
VALUES (tests.get_supabase_uid('export_customer'),'confirmed','representative','instapay_qr','paid',600,0,600,
 'PRIVATE NAME','01012345678','Cairo','PRIVATE ADDRESS','11511',current_date - 56) RETURNING id AS paid \gset
INSERT INTO public.order_items(order_id,product_id,product_name,quantity,unit_price)
VALUES (:paid,:prod,'renamed product',3,200);
INSERT INTO public.favorites(user_id,product_id) VALUES(tests.get_supabase_uid('export_customer'),:prod);
SELECT tests.authenticate_as('export_admin', 'aal2');
SELECT is(public.admin_get_forecast_export(false)->>'ready', 'true', 'Exactly 56 days and 30 sales unlock export');
SELECT is(public.admin_get_forecast_export(false)->'rows', '[]'::jsonb, 'Readiness request contains no dataset');
CREATE TEMP TABLE export_result AS SELECT public.admin_get_forecast_export(true) AS result;
SELECT is((SELECT count(*)::integer FROM export_result,jsonb_array_elements(result->'rows') r WHERE (r->>'product_id')::bigint = :prod),56,'One row per day including zero-sales days despite product rename');
SELECT is((SELECT r->>'units_sold' FROM export_result,jsonb_array_elements(result->'rows') r WHERE (r->>'product_id')::bigint = :prod AND r->>'sale_date' = (current_date - 56)::text),'32','Paid and eligible COD units aggregate correctly');
SELECT is((SELECT (r->>'average_paid_unit_price')::numeric FROM export_result,jsonb_array_elements(result->'rows') r WHERE (r->>'product_id')::bigint = :prod AND r->>'sale_date' = (current_date - 56)::text),109.38::numeric,'Paid unit price is quantity weighted');
SELECT is((SELECT r->>'units_sold' FROM export_result,jsonb_array_elements(result->'rows') r WHERE (r->>'product_id')::bigint = :prod AND r->>'sale_date' = (current_date - 1)::text),'0','No sales recorded as zero');
SELECT ok((SELECT bool_and(r->>'average_paid_unit_price' is null) FROM export_result,jsonb_array_elements(result->'rows') r WHERE r->>'units_sold' = '0'),'No-sale unit price stays unknown');
SELECT is((SELECT r->>'wishlists_at_export' FROM export_result,jsonb_array_elements(result->'rows') r WHERE (r->>'product_id')::bigint = :prod LIMIT 1),'1','Wishlist counts contain no identities');
SELECT ok((SELECT result::text NOT LIKE '%PRIVATE%' AND result::text NOT LIKE '%user_id%' AND result::text NOT LIKE '%order_id%' FROM export_result),'No customer or order identifiers in file');
SELECT * FROM finish();
ROLLBACK;

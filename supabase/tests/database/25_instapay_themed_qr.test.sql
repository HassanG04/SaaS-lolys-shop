BEGIN;
SELECT plan(16);

SELECT tests.create_supabase_user('qr_admin');
SELECT tests.create_supabase_user('qr_cust_1');
SELECT tests.create_supabase_user('qr_cust_2');

UPDATE public.profiles SET role = 'admin' WHERE id = tests.get_supabase_uid('qr_admin');

-- Set up test product and governorate
INSERT INTO public.categories (name, name_ar, slug) VALUES ('Test Cat QR', 'تصنيف تجريبي QR', 'test-cat-qr');
INSERT INTO public.products (category_id, name, name_ar, price, stock_quantity, is_active)
VALUES (
    (SELECT id FROM public.categories WHERE slug = 'test-cat-qr'),
    'Test Item QR',
    'منتج تجريبي QR',
    150.00,
    30,
    true
) RETURNING id AS test_qr_prod_id \gset

INSERT INTO public.delivery_fees (governorate_id, method, fee)
VALUES (1, 'representative', 35.00)
ON CONFLICT (governorate_id, method) DO NOTHING;

-- ============================================================================
-- 1. Privacy of instapay_link setting
-- ============================================================================
SELECT tests.authenticate_as_service_role();

-- 1. instapay_link exists and is private
SELECT is(
    (SELECT count(*)::int FROM public.shop_settings WHERE key = 'instapay_link' AND is_public = false),
    1,
    'instapay_link is present in shop_settings and is_public is false'
);

-- 2. Anonymous cannot read instapay_link
SELECT tests.clear_authentication();
SELECT is(
    (SELECT count(*)::int FROM public.shop_settings WHERE key = 'instapay_link'),
    0,
    'Anonymous cannot read instapay_link directly from shop_settings'
);

-- 3. Customer cannot read instapay_link
SELECT tests.authenticate_as('qr_cust_1');
SELECT is(
    (SELECT count(*)::int FROM public.shop_settings WHERE key = 'instapay_link'),
    0,
    'Customer cannot read instapay_link directly from shop_settings'
);

-- 4. Admin at aal1 cannot read instapay_link
SELECT tests.authenticate_as('qr_admin', 'aal1');
SELECT is(
    (SELECT count(*)::int FROM public.shop_settings WHERE key = 'instapay_link'),
    0,
    'Admin at aal1 cannot read private instapay_link'
);

-- 5. Admin at aal2 CAN read instapay_link
SELECT tests.authenticate_as('qr_admin', 'aal2');
SELECT is(
    (SELECT count(*)::int FROM public.shop_settings WHERE key = 'instapay_link'),
    1,
    'Admin at aal2 can read private instapay_link'
);

-- ============================================================================
-- 2. Access control on admin_update_setting for instapay_link
-- ============================================================================

-- 6. Customer calling admin_update_setting for instapay_link raises ADM-001
SELECT tests.authenticate_as('qr_cust_1');
SELECT throws_ok(
    $$SELECT public.admin_update_setting('instapay_link', '"https://ipn.eg/S/test"'::jsonb)$$,
    '42501',
    'Admins only',
    'Customer calling admin_update_setting raises ADM-001'
);

-- 7. Admin at aal1 calling admin_update_setting for instapay_link raises ADM-002
SELECT tests.authenticate_as('qr_admin', 'aal1');
SELECT throws_ok(
    $$SELECT public.admin_update_setting('instapay_link', '"https://ipn.eg/S/test"'::jsonb)$$,
    '42501',
    'Two-factor authentication required for admin actions',
    'Admin at aal1 calling admin_update_setting raises ADM-002'
);

-- 8. Admin at aal2: invalid domain or protocol is rejected with ADM-007
SELECT tests.authenticate_as('qr_admin', 'aal2');
SELECT throws_ok(
    $$SELECT public.admin_update_setting('instapay_link', '"http://ipn.eg/S/unencrypted"'::jsonb)$$,
    '22023',
    'Invalid setting value',
    'Non-HTTPS instapay_link is rejected with ADM-007'
);

SELECT throws_ok(
    $$SELECT public.admin_update_setting('instapay_link', '"https://evil-ipn.eg/S/attacker"'::jsonb)$$,
    '22023',
    'Invalid setting value',
    'Non-ipn.eg host in instapay_link is rejected with ADM-007'
);

-- 9. Admin at aal2: valid update succeeds and audits
SELECT lives_ok(
    $$SELECT public.admin_update_setting('instapay_link', '"https://ipn.eg/S/alaa.ahm9624/1a2b3c4d"'::jsonb)$$,
    'Admin at aal2 can update instapay_link to valid official ipn.eg URL'
);

-- 10. instapay_link updated and audited
SELECT is(
    (SELECT value #>> '{}' FROM public.shop_settings WHERE key = 'instapay_link'),
    'https://ipn.eg/S/alaa.ahm9624/1a2b3c4d',
    'instapay_link is updated in shop_settings'
);

SELECT ok(
    EXISTS (
        SELECT 1 FROM public.audit_log
         WHERE entity = 'shop_settings'
           AND entity_id = 'instapay_link'
           AND action = 'UPDATE'
    ),
    'instapay_link update is recorded in audit_log'
);

-- ============================================================================
-- 3. get_payment_instructions returns link only for approved order to owner
-- ============================================================================

-- Customer 1 places order
SELECT tests.authenticate_as('qr_cust_1');
SELECT public.place_order(
    jsonb_build_array(jsonb_build_object('product_id', :'test_qr_prod_id', 'quantity', 1)),
    'representative',
    'instapay_qr',
    jsonb_build_object('postal_code', '11511', 'name', 'Nour', 'phone', '01099887766', 'governorate_id', 1, 'address', 'Zamalek St 12')
) AS test_qr_order_id \gset

-- 11. Customer 1 calling get_payment_instructions while awaiting_approval throws PAY-007
SELECT throws_ok(
    format($$SELECT public.get_payment_instructions(%s)$$, :'test_qr_order_id'),
    '22023',
    'Order is awaiting store approval',
    'get_payment_instructions throws PAY-007 before admin approval'
);

-- Admin approves order to awaiting_proof
SELECT tests.authenticate_as('qr_admin', 'aal2');
SELECT public.admin_approve_order(:'test_qr_order_id');

-- 12. Customer 1 calling get_payment_instructions receives link property
SELECT tests.authenticate_as('qr_cust_1');
SELECT is(
    (SELECT (public.get_payment_instructions(:'test_qr_order_id') ->> 'link')),
    'https://ipn.eg/S/alaa.ahm9624/1a2b3c4d',
    'get_payment_instructions returns official link for approved order to owner'
);

-- 13. Customer 2 calling get_payment_instructions on Customer 1 order throws ORD-009
SELECT tests.authenticate_as('qr_cust_2');
SELECT throws_ok(
    format($$SELECT public.get_payment_instructions(%s)$$, :'test_qr_order_id'),
    '42501',
    'Not owner of order',
    'Other customer cannot call get_payment_instructions'
);

-- 14. Clearing instapay_link to empty string succeeds
SELECT tests.authenticate_as('qr_admin', 'aal2');
SELECT lives_ok(
    $$SELECT public.admin_update_setting('instapay_link', '""'::jsonb)$$,
    'Admin at aal2 can clear instapay_link to empty string'
);

SELECT * FROM finish();
ROLLBACK;

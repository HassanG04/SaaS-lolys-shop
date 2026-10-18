BEGIN;
SELECT plan(14);

SELECT tests.create_supabase_user('instapay_admin');
SELECT tests.create_supabase_user('instapay_cust_1');
SELECT tests.create_supabase_user('instapay_cust_2');

UPDATE public.profiles SET role = 'admin' WHERE id = tests.get_supabase_uid('instapay_admin');

-- Set up test product and governorate
INSERT INTO public.categories (name, name_ar, slug) VALUES ('Test Cat', 'تصنيف تجريبي', 'test-cat-ip');
INSERT INTO public.products (category_id, name, name_ar, price, stock_quantity, is_active)
VALUES (
    (SELECT id FROM public.categories WHERE slug = 'test-cat-ip'),
    'Test Item IP',
    'منتج تجريبي IP',
    100.00,
    50,
    true
) RETURNING id AS test_ip_prod_id \gset

INSERT INTO public.delivery_fees (governorate_id, method, fee)
VALUES (1, 'representative', 35.00)
ON CONFLICT (governorate_id, method) DO NOTHING;

-- ============================================================================
-- 1. Privacy of shop_settings for instapay_handle and instapay_qr_path
-- ============================================================================
SELECT tests.authenticate_as_service_role();

SELECT is(
    (SELECT count(*)::int FROM public.shop_settings WHERE key IN ('instapay_handle', 'instapay_qr_path') AND is_public = false),
    2,
    'Both instapay_handle and instapay_qr_path have is_public = false'
);

SELECT tests.clear_authentication();

SELECT is(
    (SELECT count(*)::int FROM public.shop_settings WHERE key IN ('instapay_handle', 'instapay_qr_path')),
    0,
    'Anonymous cannot read private InstaPay keys directly from shop_settings'
);

-- ============================================================================
-- 2. Customer 1 places an instapay_qr order (starts in awaiting_approval)
-- ============================================================================
SELECT tests.authenticate_as('instapay_cust_1');

SELECT public.place_order(
    jsonb_build_array(jsonb_build_object('product_id', :'test_ip_prod_id', 'quantity', 1)),
    'representative',
    'instapay_qr',
    jsonb_build_object('postal_code', '11511', 'name', 'Salma', 'phone', '01012345678', 'governorate_id', 1, 'address', 'Maadi Road 9')
) AS test_ip_order_id \gset

-- 3. Anonymous calling get_payment_instructions raises AUTH-004 (42501)
SELECT tests.clear_authentication();
SELECT throws_ok(
    format($$SELECT public.get_payment_instructions(%s)$$, :'test_ip_order_id'),
    '42501',
    NULL,
    'Anonymous calling get_payment_instructions raises AUTH-004'
);

-- 4. Customer 2 (not order owner) calling get_payment_instructions raises ORD-009 (42501)
SELECT tests.authenticate_as('instapay_cust_2');
SELECT throws_ok(
    format($$SELECT public.get_payment_instructions(%s)$$, :'test_ip_order_id'),
    '42501',
    'Not owner of order',
    'Non-owner calling get_payment_instructions raises ORD-009'
);

-- 5. Customer 1 calling get_payment_instructions BEFORE approval raises PAY-007 (22023)
SELECT tests.authenticate_as('instapay_cust_1');
SELECT throws_ok(
    format($$SELECT public.get_payment_instructions(%s)$$, :'test_ip_order_id'),
    '22023',
    'Order is awaiting store approval',
    'Calling get_payment_instructions before approval raises PAY-007'
);

-- ============================================================================
-- 6. Admin approves order
-- ============================================================================
SELECT tests.authenticate_as('instapay_admin', 'aal2');
SELECT lives_ok(
    format($$SELECT public.admin_approve_order(%s, 'Approved for payment')$$, :'test_ip_order_id'),
    'Admin at aal2 approves order'
);

-- ============================================================================
-- 7. Customer 1 retrieves instructions: returns qr_path, handle, instapay_handle, amount, deadline
-- ============================================================================
SELECT tests.authenticate_as('instapay_cust_1');
SELECT isnt(
    public.get_payment_instructions(:'test_ip_order_id'),
    NULL,
    'Customer 1 receives instructions payload'
);

SELECT is(
    public.get_payment_instructions(:'test_ip_order_id') ->> 'handle',
    'alaa.ahm9624@instapay',
    'Instructions handle matches verified owner recipient alaa.ahm9624@instapay'
);

SELECT is(
    public.get_payment_instructions(:'test_ip_order_id') ->> 'instapay_handle',
    'alaa.ahm9624@instapay',
    'Instructions instapay_handle matches verified owner recipient alaa.ahm9624@instapay'
);

SELECT isnt(
    public.get_payment_instructions(:'test_ip_order_id') ->> 'qr_path',
    NULL,
    'Instructions qr_path is present'
);

SELECT isnt(
    public.get_payment_instructions(:'test_ip_order_id') ->> 'deadline',
    NULL,
    'Instructions deadline is present'
);

-- ============================================================================
-- 8. Customer 2 STILL cannot read instructions even after order is approved
-- ============================================================================
SELECT tests.authenticate_as('instapay_cust_2');
SELECT throws_ok(
    format($$SELECT public.get_payment_instructions(%s)$$, :'test_ip_order_id'),
    '42501',
    'Not owner of order',
    'Non-owner still cannot read instructions after approval'
);

-- ============================================================================
-- 9. Admin updates handle in shop_settings to custom handle; instructions reflect update
-- ============================================================================
SELECT tests.authenticate_as('instapay_admin', 'aal2');
SELECT lives_ok(
    $$SELECT public.admin_update_setting('instapay_handle', '"custom.merchant@instapay"'::jsonb)$$,
    'Admin updates instapay_handle setting'
);

SELECT tests.authenticate_as('instapay_cust_1');
SELECT is(
    public.get_payment_instructions(:'test_ip_order_id') ->> 'handle',
    'custom.merchant@instapay',
    'Instructions dynamically reflect updated handle from shop_settings'
);

SELECT * FROM finish();
ROLLBACK;

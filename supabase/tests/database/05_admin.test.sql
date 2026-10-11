BEGIN;

SELECT plan(26);

-- ============================================================================
-- Setup for admin tests
-- ============================================================================

INSERT INTO public.delivery_fees (governorate_id, method, fee)
VALUES (1, 'representative', 35.00)
ON CONFLICT (governorate_id, method) DO NOTHING;

SELECT tests.create_supabase_user(
    'admin_s12',
    'admin_s12@example.com',
    '01011110000',
    '{"full_name": "Admin S12"}'::jsonb
);

SELECT tests.create_supabase_user(
    'customer_s12',
    'customer_s12@example.com',
    '01022220000',
    '{"full_name": "Customer S12"}'::jsonb
);

SELECT tests.create_supabase_user(
    'target_s13',
    'target_s13@example.com',
    '01033330000',
    '{"full_name": "Target User S13"}'::jsonb
);

-- Promote admin_s12 to admin role
UPDATE public.profiles
   SET role = 'admin'
 WHERE id = tests.get_supabase_uid('admin_s12');

-- Place a test order as customer so admin_dashboard has populated data
SELECT tests.authenticate_as('customer_s12');

SELECT public.place_order(
    jsonb_build_array(
        jsonb_build_object(
            'product_id', (SELECT id FROM public.products WHERE name = 'Pearl drop earrings'),
            'quantity', 1
        )
    ),
    'representative',
    'Customer S12',
    '01022220000',
    1::smallint,
    'Cairo',
    'Test Address'
);

-- ============================================================================
-- Scenario S12: admin_dashboard works for admin and refuses customers
-- ============================================================================

-- 1. Customer calling admin_dashboard is refused (SQLSTATE 42501)
SELECT throws_ok(
    'SELECT public.admin_dashboard()',
    '42501',
    NULL,
    'S12: Customer cannot call admin_dashboard (refused with 42501)'
);

-- Switch to admin
SELECT tests.authenticate_as('admin_s12');

-- 2. Admin calling admin_dashboard succeeds
SELECT public.admin_dashboard() AS dash \gset

SELECT ok(
    :'dash' IS NOT NULL,
    'S12: Admin can call admin_dashboard successfully'
);

SELECT ok(
    (SELECT :'dash'::jsonb ? 'range'),
    'S12: Dashboard response contains range'
);

SELECT ok(
    (SELECT :'dash'::jsonb ? 'kpis'),
    'S12: Dashboard response contains kpis'
);

SELECT ok(
    (SELECT :'dash'::jsonb ? 'daily'),
    'S12: Dashboard response contains daily'
);

SELECT ok(
    (SELECT :'dash'::jsonb ? 'by_status'),
    'S12: Dashboard response contains by_status'
);

SELECT ok(
    (SELECT :'dash'::jsonb ? 'by_method'),
    'S12: Dashboard response contains by_method'
);

SELECT ok(
    (SELECT :'dash'::jsonb ? 'by_governorate'),
    'S12: Dashboard response contains by_governorate'
);

SELECT ok(
    (SELECT :'dash'::jsonb ? 'top_products'),
    'S12: Dashboard response contains top_products'
);

SELECT ok(
    (SELECT :'dash'::jsonb ? 'top_customers'),
    'S12: Dashboard response contains top_customers'
);

SELECT ok(
    (SELECT :'dash'::jsonb ? 'low_stock'),
    'S12: Dashboard response contains low_stock'
);

-- ============================================================================
-- Scenario S13: admin_set_role: self-demotion blocked; customers refused
-- ============================================================================

-- Switch to customer
SELECT tests.authenticate_as('customer_s12');

-- 1. Customer calling admin_set_role is refused
SELECT throws_ok(
    format('SELECT public.admin_set_role(''%s''::uuid, ''admin''::public.user_role)', tests.get_supabase_uid('customer_s12')),
    '42501',
    NULL,
    'S13: Customer cannot call admin_set_role (refused with 42501)'
);

-- Switch to admin
SELECT tests.authenticate_as('admin_s12');

-- 2. Admin self-demotion is blocked
SELECT throws_ok(
    format('SELECT public.admin_set_role(''%s''::uuid, ''customer''::public.user_role)', tests.get_supabase_uid('admin_s12')),
    'P0001',
    'You cannot remove your own admin role',
    'S13: Admin self-demotion is blocked'
);

SELECT is(
    (SELECT role::text FROM public.profiles WHERE id = tests.get_supabase_uid('admin_s12')),
    'admin',
    'S13: Admin role remains admin after self-demotion attempt'
);

-- 3. Admin promotes another customer
SELECT public.admin_set_role(tests.get_supabase_uid('target_s13'), 'admin');

SELECT is(
    (SELECT role::text FROM public.profiles WHERE id = tests.get_supabase_uid('target_s13')),
    'admin',
    'S13: Admin can promote target user to admin'
);

-- 4. Admin demotes target user back to customer
SELECT public.admin_set_role(tests.get_supabase_uid('target_s13'), 'customer');

SELECT is(
    (SELECT role::text FROM public.profiles WHERE id = tests.get_supabase_uid('target_s13')),
    'customer',
    'S13: Admin can demote target user back to customer'
);

-- ============================================================================
-- Scenario S14: Admin creates categories and products; generated columns protected; invalid slug rejected
-- ============================================================================

-- 1. Admin creates category with valid slug
INSERT INTO public.categories (name, name_ar, slug, sort_order)
VALUES ('Hair Accessories', 'إكسسوارات شعر', 'hair-accessories', 5);

SELECT is(
    (SELECT slug FROM public.categories WHERE slug = 'hair-accessories'),
    'hair-accessories',
    'S14: Admin can create category with valid hyphenated slug'
);

-- 2. Category with invalid slug (uppercase/spaces) rejected by check constraint
SELECT throws_ok(
    $$INSERT INTO public.categories (name, name_ar, slug, sort_order)
      VALUES ('Invalid One', 'غير صالح', 'Hair Accessories', 6)$$,
    '23514',
    NULL,
    'S14: Category with uppercase letters and spaces rejected by slug check constraint'
);

-- 3. Category with consecutive hyphens rejected
SELECT throws_ok(
    $$INSERT INTO public.categories (name, name_ar, slug, sort_order)
      VALUES ('Invalid Two', 'غير صالح', 'hair--accessories', 7)$$,
    '23514',
    NULL,
    'S14: Category with consecutive hyphens rejected by slug check constraint'
);

-- 4. Category with leading hyphen rejected
SELECT throws_ok(
    $$INSERT INTO public.categories (name, name_ar, slug, sort_order)
      VALUES ('Invalid Three', 'غير صالح', '-hair-accessories', 8)$$,
    '23514',
    NULL,
    'S14: Category with leading hyphen rejected by slug check constraint'
);

-- 5. Admin creates product in the category
INSERT INTO public.products (
    category_id, name, name_ar, price, discount_percent, stock_quantity
) VALUES (
    (SELECT id FROM public.categories WHERE slug = 'hair-accessories'),
    'Silk Scrunchie',
    'توكة حرير',
    100.00,
    20,
    15
);

-- 6. Generated final_price computed automatically (100 * (100 - 20) / 100 = 80.00)
SELECT is(
    (SELECT final_price FROM public.products WHERE name = 'Silk Scrunchie'),
    80.00,
    'S14: Stored generated column final_price automatically computed'
);

-- 7. Generated in_stock computed automatically (15 > 0 -> true)
SELECT is(
    (SELECT in_stock FROM public.products WHERE name = 'Silk Scrunchie'),
    true,
    'S14: Stored generated column in_stock automatically computed'
);

-- 8. Generated column final_price cannot be inserted explicitly
SELECT throws_ok(
    $$INSERT INTO public.products (category_id, name, price, final_price)
      VALUES ((SELECT id FROM public.categories WHERE slug = 'hair-accessories'), 'Bad Insert', 100.00, 50.00)$$,
    '428C9',
    NULL,
    'S14: Inserting non-DEFAULT value into generated final_price is rejected'
);

-- 9. Generated column in_stock cannot be inserted explicitly
SELECT throws_ok(
    $$INSERT INTO public.products (category_id, name, price, in_stock)
      VALUES ((SELECT id FROM public.categories WHERE slug = 'hair-accessories'), 'Bad Insert', 100.00, true)$$,
    '428C9',
    NULL,
    'S14: Inserting non-DEFAULT value into generated in_stock is rejected'
);

-- 10. Generated column final_price cannot be updated explicitly
SELECT throws_ok(
    $$UPDATE public.products SET final_price = 50.00 WHERE name = 'Silk Scrunchie'$$,
    '428C9',
    NULL,
    'S14: Updating generated final_price directly is rejected'
);

-- 11. Generated column in_stock cannot be updated explicitly
SELECT throws_ok(
    $$UPDATE public.products SET in_stock = false WHERE name = 'Silk Scrunchie'$$,
    '428C9',
    NULL,
    'S14: Updating generated in_stock directly is rejected'
);

SELECT * FROM finish();
ROLLBACK;

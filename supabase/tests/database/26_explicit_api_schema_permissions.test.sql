BEGIN;
SELECT plan(18);
SELECT ok(NOT has_schema_privilege('anon', 'public', 'CREATE'), 'Visitor cannot create application objects');
SELECT ok(NOT has_schema_privilege('authenticated', 'public', 'CREATE'), 'Signed-in API role cannot create application objects');
SELECT ok(has_schema_privilege('anon', 'public', 'USAGE'), 'Visitor can still resolve the application API');
SELECT ok(has_schema_privilege('authenticated', 'public', 'USAGE'), 'Signed-in API role can still resolve the application API');
SELECT ok(has_table_privilege('authenticated', 'public.admin_occasion_reminders', 'SELECT'), 'Reminder reads do not depend on platform defaults');
SELECT ok(NOT has_table_privilege('authenticated', 'public.admin_occasion_reminders', 'TRUNCATE'), 'API roles cannot truncate reminders outside RLS');
SELECT ok(NOT has_table_privilege('authenticated', 'public.admin_occasion_reminders', 'TRIGGER'), 'API roles cannot install reminder triggers');
SELECT ok(NOT has_function_privilege('anon', 'public.cleanup_old_avatar()', 'EXECUTE'), 'Avatar cleanup is not a visitor API');
SELECT ok(NOT has_function_privilege('authenticated', 'public.notify_on_order_approved()', 'EXECUTE'), 'Order notification trigger is not a browser API');
SELECT tests.create_supabase_user('schema_privileges_admin');
SELECT tests.create_supabase_user('schema_privileges_customer');
UPDATE public.profiles SET role = 'admin' WHERE id = tests.get_supabase_uid('schema_privileges_admin');
INSERT INTO public.orders(user_id, delivery_method, payment_method, payment_status,
  subtotal, shipping_fee, total, ship_name, ship_phone, ship_governorate, ship_address, ship_postal_code)
VALUES (tests.get_supabase_uid('schema_privileges_customer'), 'representative', 'instapay_qr', 'awaiting_proof',
  100, 35, 135, 'Buyer', '01000000000', 'Cairo', 'Street', '11511') RETURNING id AS permission_order \gset
SELECT tests.authenticate_as('schema_privileges_admin', 'aal1');
SELECT throws_ok($$CREATE TABLE public.forbidden_api_table(id integer)$$, '42501', NULL, 'Even an admin password cannot create schema objects');
SELECT throws_ok($$SELECT public.admin_get_occasion_reminders()$$, '42501', 'Two-factor authentication required for admin actions', 'Reminder API still requires MFA');
SELECT throws_ok(format('SELECT public.get_payment_instructions(%s)', :permission_order), '42501', 'Not owner of order', 'Admin at AAL1 cannot bypass payment-instruction ownership');
SELECT tests.authenticate_as('schema_privileges_admin', 'aal2');
SELECT lives_ok($$SELECT public.admin_get_occasion_reminders()$$, 'Verified admin can still read reminders');
SELECT throws_ok(format('SELECT public.get_payment_instructions(%s)', :permission_order), '42501', 'Not owner of order', 'Admin at AAL2 uses admin screens, not the customer payment API');
SELECT tests.authenticate_as('schema_privileges_customer');
SELECT lives_ok(format('SELECT public.get_payment_instructions(%s)', :permission_order), 'Approved order owner still receives payment instructions');
SELECT throws_ok($$UPDATE public.customer_notifications SET title_en = 'Forged'$$, '42501', NULL, 'Customer cannot rewrite notification content');
SELECT lives_ok($$UPDATE public.customer_notifications SET is_read = true$$, 'Customer can mark notifications read under RLS');
SELECT throws_ok($$TRUNCATE public.customer_suggestions$$, '42501', NULL, 'Customer cannot truncate suggestions outside RLS');
SELECT * FROM finish();
ROLLBACK;

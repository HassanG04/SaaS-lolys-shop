BEGIN;

SELECT plan(9);

-- Schema-level assertion: all tables in public must have RLS enabled (scenario S17)
SELECT tests.rls_enabled('public');

-- Explicit table-level assertions for all 8 public tables
SELECT tests.rls_enabled('public', 'categories');
SELECT tests.rls_enabled('public', 'delivery_fees');
SELECT tests.rls_enabled('public', 'favorites');
SELECT tests.rls_enabled('public', 'governorates');
SELECT tests.rls_enabled('public', 'order_items');
SELECT tests.rls_enabled('public', 'orders');
SELECT tests.rls_enabled('public', 'products');
SELECT tests.rls_enabled('public', 'profiles');

SELECT * FROM finish();
ROLLBACK;

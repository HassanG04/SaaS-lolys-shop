-- Read-only diagnosis for T-3.10f. Run in Supabase SQL Editor as postgres.
-- Only schema metadata and the public content row's shape/visibility are read.
-- No customer records, payment settings, content values, or function execution.
begin transaction read only;
select jsonb_build_object(
  'database_role', current_user,
  'content_rows', (select count(*) from public.shop_settings where key = 'storefront_content'),
  'content_public', (select is_public from public.shop_settings where key = 'storefront_content'),
  'content_is_object', (select jsonb_typeof(value) = 'object' from public.shop_settings where key = 'storefront_content'),
  'content_has_revision', (select updated_at is not null from public.shop_settings where key = 'storefront_content'),
  'settings_rls', (select relrowsecurity from pg_class where oid = 'public.shop_settings'::regclass),
  'browser_can_select', has_table_privilege('authenticated', 'public.shop_settings', 'SELECT'),
  'settings_policies', (select coalesce(jsonb_agg(jsonb_build_object(
    'name', policyname, 'roles', roles, 'command', cmd, 'using', qual, 'check', with_check
  ) order by policyname), '[]'::jsonb) from pg_policies where schemaname = 'public' and tablename = 'shop_settings'),
  'functions', (select coalesce(jsonb_agg(jsonb_build_object(
    'name', p.proname,
    'arguments', pg_get_function_identity_arguments(p.oid),
    'security_definer', p.prosecdef,
    'config', p.proconfig,
    'definition_md5', md5(replace(pg_get_functiondef(p.oid), chr(13), '')),
    'authenticated_execute', has_function_privilege('authenticated', p.oid, 'EXECUTE'),
    'anon_execute', has_function_privilege('anon', p.oid, 'EXECUTE')
  ) order by p.proname), '[]'::jsonb)
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('admin_update_storefront_content', 'require_admin', 'is_admin')),
  'product_bucket_exists', exists(select 1 from storage.buckets where id = 'product-images')
) as storefront_editor_check;
rollback;

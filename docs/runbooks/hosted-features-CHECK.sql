-- Read-only. Returns booleans, never customer records or private settings.
select jsonb_build_object(
  'avatar_url', exists(select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'avatar_url'),
  'notifications', to_regclass('public.customer_notifications') is not null,
  'suggestions', to_regclass('public.customer_suggestions') is not null,
  'wishlist_demand', to_regprocedure('public.admin_get_wishlist_demand()') is not null,
  'occasion_reminders', to_regclass('public.admin_occasion_reminders') is not null,
  'order_postal_guard', exists(select 1 from pg_trigger where tgrelid = 'public.orders'::regclass
    and tgname = 'require_order_postal_code' and tgenabled = 'O'),
  'profile_postal_guard', exists(select 1 from pg_trigger where tgrelid = 'public.profiles'::regclass
    and tgname = 'require_profile_postal_code' and tgenabled = 'O'),
  'forecast_csv', to_regprocedure('public.admin_get_forecast_export(boolean)') is not null,
  'rls_enabled', (select count(*) = 7 from pg_class where oid in (
    to_regclass('public.profiles'), to_regclass('public.orders'), to_regclass('public.shop_settings'),
    to_regclass('public.customer_notifications'), to_regclass('public.customer_suggestions'),
    to_regclass('public.admin_occasion_reminders'), to_regclass('storage.objects')) and relrowsecurity),
  'editor_present', to_regprocedure('public.admin_update_storefront_content(jsonb,timestamptz)') is not null,
  'payment_proofs_private', exists(select 1 from storage.buckets where id = 'payment-proofs' and not public)
) as feature_check;

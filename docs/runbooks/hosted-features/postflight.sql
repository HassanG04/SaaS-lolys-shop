do $verify$
begin
  if current_setting('lolys.feature_settings_before') is distinct from
    (select md5(coalesce(jsonb_agg(to_jsonb(s) order by key)::text, '[]'))
      from public.shop_settings s where key <> 'occasion_reminder_advance_days') then
    raise exception 'Existing settings changed. Entire repair rolled back';
  end if;
  if current_setting('lolys.feature_functions_before') is distinct from
    (select md5(jsonb_agg(jsonb_build_object('id', p.oid, 'definition', pg_get_functiondef(p.oid),
      'acl', p.proacl, 'owner', p.proowner) order by p.oid)::text)
    from pg_proc p where p.oid in (
      to_regprocedure('public.place_order(jsonb,public.delivery_method,public.payment_method,jsonb)'),
      to_regprocedure('public.get_payment_instructions(bigint)'),
      to_regprocedure('public.admin_update_storefront_content(jsonb,timestamptz)'),
      to_regprocedure('public.is_admin()'), to_regprocedure('public.require_admin()'))) then
    raise exception 'Checkout, payment, editor or MFA changed. Entire repair rolled back';
  end if;
  if (select count(*) from pg_class where oid in (
    'public.profiles'::regclass, 'public.orders'::regclass, 'public.shop_settings'::regclass,
    'public.customer_notifications'::regclass, 'public.customer_suggestions'::regclass,
    'public.admin_occasion_reminders'::regclass, 'storage.objects'::regclass) and relrowsecurity) <> 7 then
    raise exception 'RLS must stay enabled. Entire repair rolled back';
  end if;
  if has_table_privilege('authenticated', 'public.customer_notifications', 'INSERT,UPDATE,TRUNCATE')
    or not has_column_privilege('authenticated', 'public.customer_notifications', 'is_read', 'UPDATE')
    or has_table_privilege('authenticated', 'public.customer_suggestions', 'INSERT,UPDATE,DELETE,TRUNCATE')
    or has_function_privilege('anon', 'public.admin_get_forecast_export(boolean)', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.admin_get_forecast_export(boolean)', 'EXECUTE') then
    raise exception 'Feature permissions are incorrect. Entire repair rolled back';
  end if;
end;
$verify$;

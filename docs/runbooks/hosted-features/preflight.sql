-- Included in hosted-features-APPLY.sql. Do not run fragments separately.
do $preflight$
begin
  if current_user <> 'postgres' then
    raise exception 'Run the whole repair file as postgres in Supabase SQL Editor';
  end if;
  perform pg_advisory_xact_lock(20261029, 206);
  if md5(replace(pg_get_functiondef(to_regprocedure('public.is_admin()')), chr(13), ''))
      is distinct from '352ec1b537ad23124dd3f01516b05d2e'
    or md5(replace(pg_get_functiondef(to_regprocedure('public.require_admin()')), chr(13), ''))
      is distinct from 'd21b2ddedef282e186c5e95585f231b4' then
    raise exception 'MFA helpers differ from the owner-reviewed setup. Stop; do not remove this check';
  end if;
  if to_regclass('public.customer_notifications') is not null
    or to_regclass('public.customer_suggestions') is not null
    or to_regclass('public.admin_occasion_reminders') is not null
    or exists(select 1 from pg_attribute where attrelid = 'public.profiles'::regclass
      and attname = 'avatar_url' and not attisdropped)
    or exists(select 1 from storage.buckets where id = 'avatars') then
    raise exception 'Features are already or partly installed. Run hosted-features-CHECK.sql; do not replay this repair';
  end if;
  if exists(select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in (
      'guard_order_postal_code', 'guard_profile_postal_code', 'validate_profile_avatar',
      'cleanup_old_avatar', 'cleanup_deleted_profile_avatar', 'notify_on_order_approved',
      'notify_on_wishlist_sale', 'mark_all_notifications_read', 'submit_customer_suggestion',
      'admin_review_suggestion', 'admin_broadcast_sale_notification', 'admin_get_wishlist_demand',
      'admin_get_upcoming_occasions', 'admin_generate_occasion_reminders',
      'admin_get_occasion_reminders', 'admin_dismiss_occasion_reminder', 'admin_get_forecast_export')) then
    raise exception 'A feature function is already installed. Stop and reconcile the partial installation';
  end if;
  if to_regprocedure('public.admin_update_storefront_content(jsonb,timestamptz)') is null
    or not exists(select 1 from public.shop_settings where key = 'storefront_content'
      and is_public and jsonb_typeof(value) = 'object') then
    raise exception 'The confirmed storefront editor is not present. Check the selected Supabase project';
  end if;
  if exists(select 1 from (values ('public.profiles'), ('public.orders'), ('public.order_items'),
      ('public.products'), ('public.categories'), ('public.favorites'), ('public.shop_settings'),
      ('public.audit_log'), ('storage.objects'), ('analytics.calendar')) t(name)
    where not exists(select 1 from pg_class where oid = to_regclass(t.name) and relrowsecurity)) then
    raise exception 'A required table or its RLS is missing. Repair stopped before any changes';
  end if;
  if not exists(select 1 from storage.buckets where id = 'payment-proofs' and not public) then
    raise exception 'Payment proofs must remain in their existing private bucket';
  end if;
  if (select count(*) from public.shop_settings where key in
    ('instapay_handle', 'instapay_qr_path', 'instapay_link') and not is_public) <> 3 then
    raise exception 'The three existing InstaPay settings must be private. Stop and reconcile their permissions';
  end if;
  if exists(select 1 from public.shop_settings
    where key = 'occasion_reminder_advance_days' and (is_public or value not in ('7','14','21','30'))) then
    raise exception 'Existing reminder setting differs from the supported private configuration';
  end if;
end;
$preflight$;

-- Short locks avoid racing checkout/profile/settings writes during the atomic repair.
-- Busy production traffic causes a timeout and rollback rather than a long queue.
lock table public.profiles, public.orders, public.order_items, public.products,
  public.favorites, public.shop_settings in share row exclusive mode;

-- Validate dependencies by parsing zero-row selects; never return customer records.
do $dependencies$
begin
  perform id, role, full_name, email, phone, alt_phone, governorate_id, city, district,
    address, postal_code, floor, apartment, landmark from public.profiles limit 0;
  perform id, user_id, created_at, status, payment_status, payment_method, ship_postal_code,
    ship_name, ship_phone, ship_alt_phone, ship_city, ship_district, ship_address, ship_floor,
    ship_apartment, ship_landmark, notes, payment_reference, payment_proof_path from public.orders limit 0;
  perform order_id, product_id, quantity, unit_price from public.order_items limit 0;
  perform id, name, name_ar, category_id, price, discount_percent, final_price,
    stock_quantity, is_active, image_url, created_at from public.products limit 0;
  perform id, name, name_ar from public.categories limit 0;
  perform user_id, product_id from public.favorites limit 0;
  perform day, product_id, closing_stock, stockout_flag from analytics.stock_daily limit 0;
  perform day, ramadan, eid_fitr, eid_adha, mothers_day, valentines, black_friday,
    back_to_school from analytics.calendar limit 0;
end;
$dependencies$;

-- Hashes stay inside this transaction; no settings values or personal rows are printed.
-- No temporary table is needed, avoiding the earlier SQL Editor temp-table failure.
do $preserve$
begin
  perform set_config('lolys.feature_settings_before',
    (select md5(coalesce(jsonb_agg(to_jsonb(s) order by key)::text, '[]'))
      from public.shop_settings s where key <> 'occasion_reminder_advance_days'), true);
  perform set_config('lolys.feature_functions_before',
    (select md5(jsonb_agg(jsonb_build_object('id', p.oid, 'definition', pg_get_functiondef(p.oid),
      'acl', p.proacl, 'owner', p.proowner) order by p.oid)::text)
    from pg_proc p where p.oid in (
      to_regprocedure('public.place_order(jsonb,public.delivery_method,public.payment_method,jsonb)'),
      to_regprocedure('public.get_payment_instructions(bigint)'),
      to_regprocedure('public.admin_update_storefront_content(jsonb,timestamptz)'),
      to_regprocedure('public.is_admin()'), to_regprocedure('public.require_admin()'))), true);
end;
$preserve$;

-- This fragment is included by build-hosted-repair.mjs; run the generated file.
do $preflight$
begin
  if current_user <> 'postgres' then
    raise exception 'Run the reviewed recovery as the database owner';
  end if;
  if to_regclass('supabase_migrations.schema_migrations') is not null then
    raise exception 'Migration history now exists. Stop and reconcile it before this one-off repair';
  end if;
  if md5(replace(pg_get_functiondef(to_regprocedure('public.is_admin()')), chr(13), ''))
       is distinct from '352ec1b537ad23124dd3f01516b05d2e'
    or md5(replace(pg_get_functiondef(to_regprocedure('public.require_admin()')), chr(13), ''))
       is distinct from 'd21b2ddedef282e186c5e95585f231b4' then
    raise exception 'MFA helpers differ from the reviewed schema. Stop before installing dependent APIs';
  end if;
  if md5(replace(pg_get_functiondef(to_regprocedure(
       'public.get_payment_instructions(bigint)')), chr(13), ''))
       is distinct from 'ee849f9059945806074684741ed46f2c'
    or md5(replace(pg_get_functiondef(to_regprocedure(
       'public.place_order(jsonb,public.delivery_method,public.payment_method,jsonb)')), chr(13), ''))
       is distinct from '6eb349d900bb0b80682957a57b4dfbeb' then
    raise exception 'Checkout/payment definitions differ from the reviewed owner export. Stop; do not remove this check';
  end if;
  if to_regclass('public.customer_notifications') is not null
    or to_regclass('public.customer_suggestions') is not null
    or to_regclass('public.admin_occasion_reminders') is not null
    or to_regprocedure('public.guard_order_postal_code()') is not null
    or to_regprocedure('public.guard_profile_postal_code()') is not null
    or to_regprocedure('public.admin_update_storefront_content(jsonb,timestamptz)') is not null
    or exists (select 1 from pg_attribute
      where attrelid = 'public.profiles'::regclass and attname = 'avatar_url' and not attisdropped)
    or exists (select 1 from public.shop_settings
      where key in ('storefront_content', 'occasion_reminder_advance_days'))
    or exists (select 1 from storage.buckets where id = 'avatars') then
    raise exception 'Some missing features have already been installed. Obtain a new audit instead of replaying recovery';
  end if;
  if (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity) <> 13
    or not exists (select 1 from pg_constraint where conrelid = 'public.orders'::regclass
      and conname = 'orders_ship_postal_code_not_null' and not convalidated)
    or not exists (select 1 from pg_constraint where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_address_postal_code_required' and not convalidated) then
    raise exception 'Table/postal constraints differ from the reviewed legacy schema';
  end if;
  if (select count(*) from public.shop_settings
      where key in ('instapay_handle', 'instapay_qr_path', 'instapay_link') and not is_public) <> 3 then
    raise exception 'Private payment settings differ from the reviewed schema';
  end if;
end;
$preflight$;

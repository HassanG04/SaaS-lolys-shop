-- =====================================================================
-- 20261012041924_admin_hardening.sql : T-1.15 Admin hardening & MFA
-- Scenarios: S19 (AAL2 MFA required for admin), S20 (role trigger & drop
-- admin_set_role), S30 (column length checks & metadata clamping).
-- =====================================================================

-- 1. Hardened is_admin() requiring aal2 session claim
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
      and coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- 2. require_admin(): raises ADM-002 if admin at aal1, else ADM-001
create or replace function public.require_admin()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
  v_aal  text;
begin
  select role into v_role
    from public.profiles
   where id = (select auth.uid());

  v_aal := coalesce((select auth.jwt() ->> 'aal'), '');

  if v_role = 'admin' then
    if v_aal <> 'aal2' then
      raise exception 'Two-factor authentication required for admin actions'
        using errcode = '42501', hint = 'ADM-002';
    end if;
  else
    raise exception 'Admins only'
      using errcode = '42501', hint = 'ADM-001';
  end if;
end;
$$;

revoke all on function public.require_admin() from public;
grant execute on function public.require_admin() to authenticated;

-- 3. Recreate admin_dashboard calling require_admin() first
create or replace function public.admin_dashboard(
  p_from date default (current_date - 29),
  p_to   date default current_date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  perform public.require_admin();

  with o as (
    select * from public.orders
     where (created_at at time zone 'Africa/Cairo')::date
           between p_from and p_to
  )
  select jsonb_build_object(
    'range', jsonb_build_object('from', p_from, 'to', p_to),

    'kpis', (
      select jsonb_build_object(
        'orders', count(*) filter (where status <> 'cancelled'),
        'pending', count(*) filter (where status = 'pending'),
        'booked_total',
          coalesce(sum(total) filter (where status <> 'cancelled'), 0),
        'delivered_total',
          coalesce(sum(total) filter (where status = 'delivered'), 0),
        'avg_order',
          coalesce(round(avg(total) filter (where status <> 'cancelled'), 2), 0)
      ) from o),

    'daily', (
      select coalesce(jsonb_agg(to_jsonb(d) order by d.day), '[]'::jsonb)
        from (select (created_at at time zone 'Africa/Cairo')::date as day,
                     count(*) filter (where status <> 'cancelled') as orders,
                     coalesce(sum(total) filter (where status <> 'cancelled'), 0)
                       as booked_total,
                     coalesce(sum(total) filter (where status = 'delivered'), 0)
                       as delivered_total
                from o group by 1) d),

    'by_status', (
      select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
        from (select status, count(*) as n from o group by status) s),

    'by_method', (
      select coalesce(jsonb_agg(to_jsonb(m) order by m.orders desc), '[]'::jsonb)
        from (select delivery_method as method, count(*) as orders,
                     sum(total) as total
                from o where status <> 'cancelled' group by 1) m),

    'by_governorate', (
      select coalesce(jsonb_agg(to_jsonb(g) order by g.orders desc), '[]'::jsonb)
        from (select ship_governorate as governorate, count(*) as orders,
                     sum(total) as total
                from o where status <> 'cancelled' group by 1) g),

    'top_products', (
      select coalesce(jsonb_agg(to_jsonb(t) order by t.units desc), '[]'::jsonb)
        from (select oi.product_id, oi.product_name as name,
                     sum(oi.quantity) as units,
                     sum(oi.quantity * oi.unit_price) as sales
                from o join public.order_items oi on oi.order_id = o.id
               where o.status <> 'cancelled'
               group by 1, 2
               order by units desc limit 10) t),

    'top_customers', (
      select coalesce(jsonb_agg(to_jsonb(c) order by c.total desc), '[]'::jsonb)
        from (select o.user_id, p.full_name as name, count(*) as orders,
                     sum(o.total) as total
                from o join public.profiles p on p.id = o.user_id
               where o.status <> 'cancelled'
               group by 1, 2
               order by total desc limit 5) c),

    'low_stock', (
      select coalesce(jsonb_agg(to_jsonb(l) order by l.stock), '[]'::jsonb)
        from (select id as product_id, name, stock_quantity as stock
                from public.products
               where is_active and stock_quantity <= 3
               order by stock_quantity, name limit 20) l)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_dashboard(date, date) from public, anon;
grant execute on function public.admin_dashboard(date, date) to authenticated;

-- 4. Drop admin_set_role
drop function if exists public.admin_set_role(uuid, public.user_role);

-- 5. Trigger blocking changes to profiles.role unless executed by db owner
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if current_user in ('anon', 'authenticated', 'authenticator') then
      raise exception 'Role cannot be modified through the API'
        using errcode = '42501', hint = 'ADM-001';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
  before update of role on public.profiles
  for each row execute function public.protect_profile_role();

-- 6. Clamp sign-up metadata in handle_new_user (name 100, phone 20)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    substring(coalesce(new.raw_user_meta_data ->> 'full_name', '') from 1 for 100),
    substring(new.raw_user_meta_data ->> 'phone' from 1 for 20)
  );
  return new;
end;
$$;

-- 7. Length check constraints on text columns
alter table public.profiles
  add constraint profiles_full_name_length check (char_length(full_name) <= 100),
  add constraint profiles_phone_length check (phone is null or char_length(phone) <= 20),
  add constraint profiles_city_length check (city is null or char_length(city) <= 150),
  add constraint profiles_address_length check (address is null or char_length(address) <= 150);

alter table public.categories
  add constraint categories_name_length check (char_length(name) <= 100),
  add constraint categories_name_ar_length check (name_ar is null or char_length(name_ar) <= 100);

alter table public.products
  add constraint products_name_length check (char_length(name) <= 100),
  add constraint products_name_ar_length check (name_ar is null or char_length(name_ar) <= 100);

alter table public.orders
  add constraint orders_ship_name_length check (char_length(ship_name) <= 100),
  add constraint orders_ship_phone_length check (char_length(ship_phone) <= 20),
  add constraint orders_ship_governorate_length check (char_length(ship_governorate) <= 100),
  add constraint orders_ship_city_length check (ship_city is null or char_length(ship_city) <= 150),
  add constraint orders_ship_address_length check (char_length(ship_address) <= 150),
  add constraint orders_notes_length check (notes is null or char_length(notes) <= 500),
  add constraint orders_tracking_number_length check (tracking_number is null or char_length(tracking_number) <= 100),
  add constraint orders_rep_name_length check (rep_name is null or char_length(rep_name) <= 100),
  add constraint orders_rep_phone_length check (rep_phone is null or char_length(rep_phone) <= 20);

-- =====================================================================
-- LOLYS ACCESSORIES & HOME - COMPLETE REMOTE DATABASE INITIALIZATION
-- Target: Supabase Cloud (PostgreSQL 15+)
-- How to apply:
--   1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/wcdkrgrceczeuttnijwf
--   2. Click "SQL Editor" in the left navigation.
--   3. Click "New query", paste the entire contents of this file, and click "Run".
-- =====================================================================

-- Clean up any preexisting storage policies to ensure idempotent execution
drop policy if exists "admin list product images" on storage.objects;
drop policy if exists "admin upload product images" on storage.objects;
drop policy if exists "admin replace product images" on storage.objects;
drop policy if exists "admin delete product images" on storage.objects;
drop policy if exists "user upload payment proof" on storage.objects;
drop policy if exists "user read payment proof" on storage.objects;
drop policy if exists "admin read payment proofs" on storage.objects;
drop policy if exists "admin delete payment proofs" on storage.objects;

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20261010232047_schema.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- =====================================================================
-- 01_schema.sql : accessories store - types, tables, indexes, triggers
-- Target: PostgreSQL 15+ (Supabase). Run files 01 -> 05 in order, once.
-- =====================================================================

-- ---------- Types ----------
create type public.user_role       as enum ('customer', 'admin');
create type public.order_status    as enum ('pending', 'confirmed', 'shipped',
                                            'delivered', 'cancelled');
create type public.delivery_method as enum ('egypt_post', 'representative');
-- Only cash on delivery for now. Add more later with:
--   alter type public.payment_method add value 'card';
create type public.payment_method  as enum ('cod');

-- ---------- Delivery lookup ----------
create table public.governorates (
  id      smallint primary key,
  name_en text not null unique,
  name_ar text not null
);

-- One row = "this method is available in this governorate for this fee".
-- No row = not available there.
create table public.delivery_fees (
  governorate_id smallint not null references public.governorates (id)
                   on delete cascade,
  method         public.delivery_method not null,
  fee            numeric(10,2) not null check (fee >= 0),
  primary key (governorate_id, method)
);

-- ---------- Users (extends Supabase auth.users) ----------
create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  full_name      text not null default '',
  phone          text,
  governorate_id smallint references public.governorates (id),
  city           text,
  address        text,
  role           public.user_role not null default 'customer',
  created_at     timestamptz not null default now()
);

-- ---------- Catalogue ----------
create table public.categories (
  id         bigint generated always as identity primary key,
  name       text not null,
  name_ar    text,
  slug       text not null unique
               check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  image_url  text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.products (
  id               bigint generated always as identity primary key,
  category_id      bigint not null references public.categories (id)
                     on delete restrict,
  name             text not null,
  name_ar          text,
  description      text,
  description_ar   text,
  price            numeric(10,2) not null check (price >= 0),
  discount_percent smallint not null default 0
                     check (discount_percent between 0 and 100),
  -- calculated by the database; never send these two from the client
  final_price      numeric(10,2) generated always as
                     (round(price * (100 - discount_percent) / 100.0, 2)) stored,
  stock_quantity   integer not null default 0 check (stock_quantity >= 0),
  in_stock         boolean generated always as (stock_quantity > 0) stored,
  -- kept up to date by place_order() / cancellation, so the public
  -- "best sellers" ranking never needs to read private order data
  sold_count       integer not null default 0 check (sold_count >= 0),
  is_active        boolean not null default true,
  image_url        text,
  extra_images     text[] not null default '{}',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index products_category_idx on public.products (category_id)
  where is_active;
create index products_sold_idx on public.products (sold_count desc);

-- ---------- Orders ----------
create table public.orders (
  id               bigint generated always as identity primary key,
  user_id          uuid not null references public.profiles (id)
                     on delete restrict,
  status           public.order_status not null default 'pending',
  delivery_method  public.delivery_method not null,
  payment_method   public.payment_method not null default 'cod',
  subtotal         numeric(10,2) not null check (subtotal >= 0),
  shipping_fee     numeric(10,2) not null check (shipping_fee >= 0),
  total            numeric(10,2) not null,
  -- address is copied here so history never changes when a profile does
  ship_name        text not null,
  ship_phone       text not null,
  ship_governorate text not null,
  ship_city        text,
  ship_address     text not null,
  notes            text,
  -- filled in by the admin
  tracking_number  text,   -- Egypt Post
  rep_name         text,   -- representative delivery
  rep_phone        text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint orders_total_matches check (total = subtotal + shipping_fee)
);
create index orders_user_idx   on public.orders (user_id, created_at desc);
create index orders_status_idx on public.orders (status, created_at desc);

create table public.order_items (
  id           bigint generated always as identity primary key,
  order_id     bigint not null references public.orders (id) on delete cascade,
  product_id   bigint not null references public.products (id)
                 on delete restrict,
  product_name text not null,                    -- name at purchase time
  quantity     integer not null check (quantity > 0),
  unit_price   numeric(10,2) not null check (unit_price >= 0),  -- price paid
  unique (order_id, product_id)
);
create index order_items_product_idx on public.order_items (product_id);

create table public.favorites (
  user_id    uuid   not null references public.profiles (id) on delete cascade,
  product_id bigint not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- ---------- Triggers ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

-- Create a profile row whenever someone signs up.
-- The role is NEVER read from sign-up data: users control that data.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id,
          coalesce(new.raw_user_meta_data ->> 'full_name', ''),
          new.raw_user_meta_data ->> 'phone');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20261010232048_security.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- =====================================================================
-- 02_security.sql : admin check, row-level security, grants, policies
-- =====================================================================

-- True when the logged-in user has role = 'admin'. SECURITY DEFINER lets it
-- read profiles without tripping over the profiles policies themselves.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------- Turn on RLS for every table ----------
alter table public.governorates  enable row level security;
alter table public.delivery_fees enable row level security;
alter table public.profiles      enable row level security;
alter table public.categories    enable row level security;
alter table public.products      enable row level security;
alter table public.orders        enable row level security;
alter table public.order_items   enable row level security;
alter table public.favorites     enable row level security;

-- ---------- Grants: start from zero, then add only what is needed ----------
revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;

-- public catalogue
grant select on public.categories, public.products,
                public.governorates, public.delivery_fees
  to anon, authenticated;

-- admin writes (still gated by the policies below)
grant insert, update, delete on public.categories, public.products,
                                public.governorates, public.delivery_fees
  to authenticated;

-- profiles: the role column is NOT in this list, so it cannot be edited
grant select on public.profiles to authenticated;
grant update (full_name, phone, governorate_id, city, address)
  on public.profiles to authenticated;

-- orders: customers read; admins may change fulfilment fields only
grant select on public.orders to authenticated;
grant update (status, tracking_number, rep_name, rep_phone)
  on public.orders to authenticated;
grant select on public.order_items to authenticated;

grant select, insert, delete on public.favorites to authenticated;

-- ---------- Policies ----------
-- governorates, delivery_fees, categories: everyone reads, admins write
create policy "public read governorates" on public.governorates
  for select to anon, authenticated using (true);
create policy "admin write governorates" on public.governorates
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "public read delivery fees" on public.delivery_fees
  for select to anon, authenticated using (true);
create policy "admin write delivery fees" on public.delivery_fees
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "public read categories" on public.categories
  for select to anon, authenticated using (true);
create policy "admin write categories" on public.categories
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- products: visitors see active ones, admins see everything
create policy "read active products" on public.products
  for select to anon, authenticated
  using (is_active or public.is_admin());
create policy "admin write products" on public.products
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- profiles: own row (admins: all rows); edit own row only
create policy "read own profile" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
create policy "update own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- orders and items: customers read their own, admins read all.
-- There is no INSERT policy on purpose: orders are created only by
-- place_order() (03_functions.sql), which computes the totals itself.
create policy "read own orders" on public.orders
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy "admin update orders" on public.orders
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "read items of visible orders" on public.order_items
  for select to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and (o.user_id = (select auth.uid()) or public.is_admin())
  ));

-- favorites: each user manages only their own
create policy "manage own favorites" on public.favorites
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20261010232049_functions.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- =====================================================================
-- 03_functions.sql : order logic, cancellation, roles, admin dashboard
-- =====================================================================

-- ---------- Cancelled orders put the stock back ----------
create or replace function public.orders_status_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'cancelled' and new.status <> 'cancelled' then
    raise exception 'A cancelled order cannot be re-opened';
  end if;

  if new.status = 'cancelled' and old.status <> 'cancelled' then
    update public.products p
       set stock_quantity = p.stock_quantity + oi.quantity,
           sold_count     = greatest(p.sold_count - oi.quantity, 0)
      from public.order_items oi
     where oi.order_id = new.id
       and oi.product_id = p.id;
  end if;
  return new;
end;
$$;

create trigger orders_status_guard
  before update of status on public.orders
  for each row execute function public.orders_status_guard();

-- ---------- Place an order (the ONLY way an order gets created) ----------
-- p_items example: [{"product_id": 12, "quantity": 2}, {"product_id": 7,
-- "quantity": 1}]. Prices, fees and totals are all calculated here.
create or replace function public.place_order(
  p_items           jsonb,
  p_delivery_method public.delivery_method,
  p_ship_name       text,
  p_ship_phone      text,
  p_governorate_id  smallint,
  p_ship_city       text,
  p_ship_address    text,
  p_notes           text default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user     uuid := auth.uid();
  v_gov_name text;
  v_fee      numeric(10,2);
  v_order_id bigint;
  v_subtotal numeric(10,2) := 0;
  v_expected integer;
  v_found    integer := 0;
  r          record;
begin
  if v_user is null then
    raise exception 'Please log in to place an order' using errcode = '28000';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'Your cart is empty';
  end if;

  if exists (select 1 from jsonb_array_elements(p_items) e
              where (e ->> 'product_id') is null
                 or (e ->> 'quantity') is null) then
    raise exception 'Each cart line needs a product_id and a quantity';
  end if;

  if coalesce(trim(p_ship_name), '') = ''
     or coalesce(trim(p_ship_phone), '') = ''
     or coalesce(trim(p_ship_address), '') = '' then
    raise exception 'Name, phone and address are required';
  end if;

  -- is this delivery method offered in that governorate, and at what fee?
  select g.name_en, f.fee
    into v_gov_name, v_fee
    from public.governorates g
    join public.delivery_fees f
      on f.governorate_id = g.id and f.method = p_delivery_method
   where g.id = p_governorate_id;
  if not found then
    raise exception 'This delivery method is not available in that governorate';
  end if;

  select count(*) into v_expected
    from (select (e ->> 'product_id')::bigint
            from jsonb_array_elements(p_items) e
           group by 1) s;

  insert into public.orders
         (user_id, delivery_method, subtotal, shipping_fee, total,
           ship_name, ship_phone, ship_governorate, ship_city, ship_address,
           notes)
  values (v_user, p_delivery_method, 0, v_fee, v_fee,
          trim(p_ship_name), trim(p_ship_phone), v_gov_name,
          nullif(trim(p_ship_city), ''), trim(p_ship_address),
          nullif(trim(p_notes), ''))
  returning id into v_order_id;

  -- lock the product rows so two buyers cannot take the last item
  for r in
    select p.id, p.name, p.final_price, p.stock_quantity, p.is_active, l.qty
      from (select (e ->> 'product_id')::bigint as product_id,
                   sum((e ->> 'quantity')::integer)::integer as qty
              from jsonb_array_elements(p_items) e
             group by 1) l
      join public.products p on p.id = l.product_id
     order by p.id
       for update of p
  loop
    v_found := v_found + 1;
    if not r.is_active then
      raise exception '"%" is no longer available', r.name;
    end if;
    if r.qty <= 0 then
      raise exception 'Quantity must be at least 1';
    end if;
    if r.stock_quantity < r.qty then
      raise exception 'Only % left in stock for "%"', r.stock_quantity, r.name;
    end if;

    insert into public.order_items
           (order_id, product_id, product_name, quantity, unit_price)
    values (v_order_id, r.id, r.name, r.qty, r.final_price);

    update public.products
       set stock_quantity = stock_quantity - r.qty,
           sold_count     = sold_count + r.qty
     where id = r.id;

    v_subtotal := v_subtotal + r.final_price * r.qty;
  end loop;

  if v_found <> v_expected then
    raise exception 'Your cart contains a product that does not exist';
  end if;

  update public.orders
     set subtotal = v_subtotal,
         total    = v_subtotal + v_fee
   where id = v_order_id;

  return v_order_id;
end;
$$;

-- ---------- Customer cancels their own pending order ----------
create or replace function public.cancel_my_order(p_order_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders
     set status = 'cancelled'
   where id = p_order_id
     and user_id = (select auth.uid())
     and status = 'pending';
  if not found then
    raise exception 'Order not found, or it can no longer be cancelled';
  end if;
end;
$$;

-- ---------- Admin: change someone's role ----------
create or replace function public.admin_set_role(p_user_id uuid,
                                                 p_role public.user_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  if p_user_id = (select auth.uid()) and p_role <> 'admin' then
    raise exception 'You cannot remove your own admin role';
  end if;
  update public.profiles set role = p_role where id = p_user_id;
end;
$$;

-- ---------- Admin dashboard: one call returns everything ----------
-- booked_total = all non-cancelled orders; delivered_total = money actually
-- received (cash on delivery can be refused at the door). Days use Cairo time.
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
  if not public.is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;

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

-- ---------- Who may call what ----------
revoke all on function public.place_order(jsonb, public.delivery_method, text,
  text, smallint, text, text, text) from public, anon;
grant execute on function public.place_order(jsonb, public.delivery_method, text,
  text, smallint, text, text, text) to authenticated;

revoke all on function public.cancel_my_order(bigint) from public, anon;
grant execute on function public.cancel_my_order(bigint) to authenticated;

revoke all on function public.admin_set_role(uuid, public.user_role)
  from public, anon;
grant execute on function public.admin_set_role(uuid, public.user_role)
  to authenticated;

revoke all on function public.admin_dashboard(date, date) from public, anon;
grant execute on function public.admin_dashboard(date, date) to authenticated;

-- trigger functions are never meant to be called directly
revoke all on function public.set_updated_at()      from public, anon, authenticated;
revoke all on function public.handle_new_user()     from public, anon, authenticated;
revoke all on function public.orders_status_guard() from public, anon, authenticated;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20261010232050_views.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- =====================================================================
-- 04_views.sql : per-customer statistics (calculated, never stored)
-- =====================================================================

-- "How much they buy" and "favourite item", worked out from real orders.
-- security_invoker = true means row-level security still applies:
-- a customer sees only their own row, an admin sees everyone.
create or replace view public.customer_stats
with (security_invoker = true) as
select
  p.id                           as user_id,
  p.full_name,
  p.phone,
  p.role,
  coalesce(s.orders_count, 0)    as orders_count,
  coalesce(s.total_spent, 0)     as total_spent,
  f.product_id                   as favorite_product_id,
  f.product_name                 as favorite_product_name
from public.profiles p
left join (
  select user_id, count(*) as orders_count, sum(total) as total_spent
    from public.orders
   where status <> 'cancelled'
   group by user_id
) s on s.user_id = p.id
left join lateral (
  select oi.product_id, oi.product_name
    from public.orders o
    join public.order_items oi on oi.order_id = o.id
   where o.user_id = p.id and o.status <> 'cancelled'
   group by oi.product_id, oi.product_name
   order by sum(oi.quantity) desc, oi.product_id
   limit 1
) f on true;

grant select on public.customer_stats to authenticated;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20261010232051_reference_data.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- =====================================================================
-- Reference data: Egypt's 27 governorates (from 05_seed.sql Part A)
-- =====================================================================

insert into public.governorates (id, name_en, name_ar) values
  (1,  'Cairo',           'القاهرة'),
  (2,  'Giza',            'الجيزة'),
  (3,  'Alexandria',      'الإسكندرية'),
  (4,  'Qalyubia',        'القليوبية'),
  (5,  'Port Said',       'بورسعيد'),
  (6,  'Suez',            'السويس'),
  (7,  'Dakahlia',        'الدقهلية'),
  (8,  'Sharqia',         'الشرقية'),
  (9,  'Gharbia',         'الغربية'),
  (10, 'Monufia',         'المنوفية'),
  (11, 'Beheira',         'البحيرة'),
  (12, 'Kafr El Sheikh',  'كفر الشيخ'),
  (13, 'Damietta',        'دمياط'),
  (14, 'Ismailia',        'الإسماعيلية'),
  (15, 'Faiyum',          'الفيوم'),
  (16, 'Beni Suef',       'بني سويف'),
  (17, 'Minya',           'المنيا'),
  (18, 'Asyut',           'أسيوط'),
  (19, 'Sohag',           'سوهاج'),
  (20, 'Qena',            'قنا'),
  (21, 'Luxor',           'الأقصر'),
  (22, 'Aswan',           'أسوان'),
  (23, 'Red Sea',         'البحر الأحمر'),
  (24, 'New Valley',      'الوادي الجديد'),
  (25, 'Matrouh',         'مطروح'),
  (26, 'North Sinai',     'شمال سيناء'),
  (27, 'South Sinai',     'جنوب سيناء');


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20261010232052_storage.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- =====================================================================
-- 06_storage.sql : product image bucket (Supabase only)
-- Everyone can view the images; only admins can add, replace or delete.
-- Set a file-size limit and image-only types on the bucket in the dashboard.
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "admin list product images" on storage.objects
  for select to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

create policy "admin upload product images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

create policy "admin replace product images" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

create policy "admin delete product images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20261012040559_error_codes.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- =====================================================================
-- 20261012040559_error_codes.sql : T-1.10 Stable error codes in hint
-- =====================================================================

-- ---------- Cancelled orders put the stock back ----------
create or replace function public.orders_status_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'cancelled' and new.status <> 'cancelled' then
    raise exception 'A cancelled order cannot be re-opened'
      using hint = 'ORD-014';
  end if;

  if new.status = 'cancelled' and old.status <> 'cancelled' then
    update public.products p
       set stock_quantity = p.stock_quantity + oi.quantity,
           sold_count     = greatest(p.sold_count - oi.quantity, 0)
      from public.order_items oi
     where oi.order_id = new.id
       and oi.product_id = p.id;
  end if;
  return new;
end;
$$;

-- ---------- Place an order (the ONLY way an order gets created) ----------
create or replace function public.place_order(
  p_items           jsonb,
  p_delivery_method public.delivery_method,
  p_ship_name       text,
  p_ship_phone      text,
  p_governorate_id  smallint,
  p_ship_city       text,
  p_ship_address    text,
  p_notes           text default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user     uuid := auth.uid();
  v_gov_name text;
  v_fee      numeric(10,2);
  v_order_id bigint;
  v_subtotal numeric(10,2) := 0;
  v_expected integer;
  v_found    integer := 0;
  r          record;
begin
  if v_user is null then
    raise exception 'Please log in to place an order'
      using errcode = '28000', hint = 'AUTH-004';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'Your cart is empty'
      using hint = 'ORD-001';
  end if;

  if exists (select 1 from jsonb_array_elements(p_items) e
              where (e ->> 'product_id') is null
                 or (e ->> 'quantity') is null) then
    raise exception 'Each cart line needs a product_id and a quantity'
      using hint = 'ORD-002';
  end if;

  if coalesce(trim(p_ship_name), '') = ''
     or coalesce(trim(p_ship_phone), '') = ''
     or coalesce(trim(p_ship_address), '') = '' then
    raise exception 'Name, phone and address are required'
      using hint = 'ORD-003';
  end if;

  -- is this delivery method offered in that governorate, and at what fee?
  select g.name_en, f.fee
    into v_gov_name, v_fee
    from public.governorates g
    join public.delivery_fees f
      on f.governorate_id = g.id and f.method = p_delivery_method
   where g.id = p_governorate_id;
  if not found then
    raise exception 'This delivery method is not available in that governorate'
      using hint = 'ORD-004';
  end if;

  select count(*) into v_expected
    from (select (e ->> 'product_id')::bigint
            from jsonb_array_elements(p_items) e
           group by 1) s;

  insert into public.orders
         (user_id, delivery_method, subtotal, shipping_fee, total,
           ship_name, ship_phone, ship_governorate, ship_city, ship_address,
           notes)
  values (v_user, p_delivery_method, 0, v_fee, v_fee,
          trim(p_ship_name), trim(p_ship_phone), v_gov_name,
          nullif(trim(p_ship_city), ''), trim(p_ship_address),
          nullif(trim(p_notes), ''))
  returning id into v_order_id;

  -- lock the product rows so two buyers cannot take the last item
  for r in
    select p.id, p.name, p.final_price, p.stock_quantity, p.is_active, l.qty
      from (select (e ->> 'product_id')::bigint as product_id,
                   sum((e ->> 'quantity')::integer)::integer as qty
              from jsonb_array_elements(p_items) e
             group by 1) l
      join public.products p on p.id = l.product_id
     order by p.id
       for update of p
  loop
    v_found := v_found + 1;
    if not r.is_active then
      raise exception '"%" is no longer available', r.name
        using hint = 'ORD-005';
    end if;
    if r.qty <= 0 then
      raise exception 'Quantity must be at least 1'
        using hint = 'ORD-006';
    end if;
    if r.stock_quantity < r.qty then
      raise exception 'Only % left in stock for "%"', r.stock_quantity, r.name
        using hint = 'ORD-007', detail = format('left=%s', r.stock_quantity);
    end if;

    insert into public.order_items
           (order_id, product_id, product_name, quantity, unit_price)
    values (v_order_id, r.id, r.name, r.qty, r.final_price);

    update public.products
       set stock_quantity = stock_quantity - r.qty,
           sold_count     = sold_count + r.qty
     where id = r.id;

    v_subtotal := v_subtotal + r.final_price * r.qty;
  end loop;

  if v_found <> v_expected then
    raise exception 'Your cart contains a product that does not exist'
      using hint = 'ORD-008';
  end if;

  update public.orders
     set subtotal = v_subtotal,
         total    = v_subtotal + v_fee
   where id = v_order_id;

  return v_order_id;
end;
$$;

-- ---------- Customer cancels their own pending order ----------
create or replace function public.cancel_my_order(p_order_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders
     set status = 'cancelled'
   where id = p_order_id
     and user_id = (select auth.uid())
     and status = 'pending';
  if not found then
    raise exception 'Order not found, or it can no longer be cancelled'
      using hint = 'ORD-009';
  end if;
end;
$$;

-- ---------- Admin dashboard: one call returns everything ----------
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
  if not public.is_admin() then
    raise exception 'Admins only' using errcode = '42501', hint = 'ADM-001';
  end if;

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

-- ---------- Who may call what ----------
revoke all on function public.place_order(jsonb, public.delivery_method, text,
  text, smallint, text, text, text) from public, anon;
grant execute on function public.place_order(jsonb, public.delivery_method, text,
  text, smallint, text, text, text) to authenticated;

revoke all on function public.cancel_my_order(bigint) from public, anon;
grant execute on function public.cancel_my_order(bigint) to authenticated;

revoke all on function public.admin_dashboard(date, date) from public, anon;
grant execute on function public.admin_dashboard(date, date) to authenticated;

revoke all on function public.orders_status_guard() from public, anon, authenticated;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20261012041924_admin_hardening.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
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
security invoker
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    -- SECURITY INVOKER preserves the caller, including SET ROLE API sessions.
    if current_user <> pg_get_userbyid((select datdba from pg_database where datname = current_database()))
       or session_user <> current_user then
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

revoke all on function public.protect_profile_role() from public, anon, authenticated, service_role;
revoke all on function public.handle_new_user() from public, anon, authenticated, service_role;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20261012043500_audit_log.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- =====================================================================
-- 20261012043500_audit_log.sql : T-1.16 Audit log & triggers
-- Scenario S21: Audit log records admin & owner changes, append-only,
-- unreadable by customers, protected against update and delete.
-- =====================================================================

-- 1. Create table audit_log
create table public.audit_log (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  actor       uuid,
  actor_role  text not null,
  action      text not null,
  entity      text not null,
  entity_id   text not null,
  old         jsonb,
  new         jsonb
);

create index audit_log_at_idx on public.audit_log (at desc);
create index audit_log_entity_idx on public.audit_log (entity, entity_id);

-- 2. RLS & Permissions
alter table public.audit_log enable row level security;

create policy "admin_read_audit_log"
  on public.audit_log
  for select
  using (public.is_admin());

revoke all on table public.audit_log from public, anon, authenticated, service_role;
grant select on table public.audit_log to authenticated;

-- 3. Immutability trigger: blocks update and delete for everyone
create or replace function public.audit_log_immutable()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'audit_log is append-only; update and delete are prohibited'
    using errcode = '42501', hint = 'ADM-001';
end;
$$;

drop trigger if exists audit_log_immutable_trigger on public.audit_log;
create trigger audit_log_immutable_trigger
  before update or delete on public.audit_log
  for each row execute function public.audit_log_immutable();

-- 4. audit_event() helper for functions
create or replace function public.audit_event(
  p_action text,
  p_entity text,
  p_entity_id text,
  p_old jsonb default null,
  p_new jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
begin
  if v_uid is not null then
    select role::text into v_role from public.profiles where id = v_uid;
  else
    v_role := current_user;
  end if;

  insert into public.audit_log (actor, actor_role, action, entity, entity_id, old, new)
  values (v_uid, coalesce(v_role, 'unknown'), p_action, p_entity, p_entity_id, p_old, p_new);
end;
$$;

revoke all on function public.audit_event(text, text, text, jsonb, jsonb) from public, anon, authenticated, service_role;

-- 5. Trigger function process_audit_log()
create or replace function public.process_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_is_admin boolean := false;
  v_is_owner boolean := false;
  v_old_json jsonb;
  v_new_json jsonb;
  v_entity_id text;
  v_action text := tg_op;
begin
  if v_uid is not null then
    select role::text into v_role from public.profiles where id = v_uid;
    if v_role = 'admin' then
      v_is_admin := true;
    end if;
  else
    if session_user = pg_get_userbyid((select datdba from pg_database where datname = current_database()))
       and current_setting('role', true) in ('none', 'postgres') then
      v_is_owner := true;
      v_role := current_user;
    end if;
  end if;

  -- Only audit when actor is admin or database owner
  if not (v_is_admin or v_is_owner) then
    return coalesce(new, old);
  end if;

  -- If UPDATE, check if audited columns actually changed
  if tg_op = 'UPDATE' then
    if tg_table_name = 'products' then
      if not (
        new.name is distinct from old.name or
        new.price is distinct from old.price or
        new.discount_percent is distinct from old.discount_percent or
        new.stock_quantity is distinct from old.stock_quantity or
        new.is_active is distinct from old.is_active
      ) then
        return new;
      end if;
    elsif tg_table_name = 'orders' then
      if not (
        new.status is distinct from old.status or
        new.tracking_number is distinct from old.tracking_number or
        new.rep_name is distinct from old.rep_name or
        new.rep_phone is distinct from old.rep_phone
      ) then
        return new;
      end if;
    elsif tg_table_name = 'profiles' then
      if not (new.role is distinct from old.role) then
        return new;
      end if;
    end if;
  end if;

  if tg_op in ('UPDATE', 'DELETE') then
    v_old_json := to_jsonb(old);
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    v_new_json := to_jsonb(new);
  end if;

  if tg_table_name = 'delivery_fees' then
    v_entity_id := (case when tg_op = 'DELETE'
      then old.governorate_id::text || ':' || old.method::text
      else new.governorate_id::text || ':' || new.method::text
    end);
  else
    v_entity_id := (case when tg_op = 'DELETE' then old.id::text else new.id::text end);
  end if;

  insert into public.audit_log (actor, actor_role, action, entity, entity_id, old, new)
  values (
    v_uid,
    coalesce(v_role, 'unknown'),
    v_action,
    tg_table_name,
    v_entity_id,
    v_old_json,
    v_new_json
  );

  return coalesce(new, old);
end;
$$;

-- 6. Attach triggers
drop trigger if exists audit_products on public.products;
create trigger audit_products
  after insert or update or delete on public.products
  for each row execute function public.process_audit_log();

drop trigger if exists audit_categories on public.categories;
create trigger audit_categories
  after insert or update or delete on public.categories
  for each row execute function public.process_audit_log();

drop trigger if exists audit_delivery_fees on public.delivery_fees;
create trigger audit_delivery_fees
  after insert or update or delete on public.delivery_fees
  for each row execute function public.process_audit_log();

drop trigger if exists audit_orders on public.orders;
create trigger audit_orders
  after insert or update or delete on public.orders
  for each row execute function public.process_audit_log();

drop trigger if exists audit_profiles on public.profiles;
create trigger audit_profiles
  after update of role on public.profiles
  for each row execute function public.process_audit_log();

revoke all on function public.audit_log_immutable() from public, anon, authenticated, service_role;
revoke all on function public.process_audit_log() from public, anon, authenticated, service_role;
revoke all on sequence public.audit_log_id_seq from public, anon, authenticated, service_role;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20261012044500_shop_settings.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- =====================================================================
-- 20261012044500_shop_settings.sql : T-1.17 Shop settings table, RLS,
-- admin_update_setting RPC and storage limits.
-- Scenario S22: Settings allow-list, typed validation, privacy RLS,
-- audited changes.
-- =====================================================================

-- 1. Create table shop_settings
create table public.shop_settings (
  key         text primary key,
  value       jsonb not null,
  is_public   boolean not null default false,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users (id)
);

-- 2. Seed default settings
insert into public.shop_settings (key, value, is_public) values
  ('shop_name_ar', '"Lolys'' Accessories & Home"'::jsonb, true),
  ('shop_name_en', '"Lolys'' Accessories & Home"'::jsonb, true),
  ('tagline_ar', '""'::jsonb, true),
  ('phone', '""'::jsonb, true),
  ('whatsapp', '""'::jsonb, true),
  ('instagram', '""'::jsonb, true),
  ('announcement_ar', '""'::jsonb, true),
  ('hero_title_ar', '"إكسسوارات صنعت بكل حب"'::jsonb, true),
  ('hero_subtitle_ar', '"قطع مميزة تناسب ذوقك وتضيف لمسة من الأناقة ليومك"'::jsonb, true),
  ('sale_percent', '50'::jsonb, true),
  ('payment_methods_enabled', '["cod", "instapay_qr"]'::jsonb, true),
  ('instapay_qr_path', '"settings/instapay-qr-default.png"'::jsonb, true),
  ('instapay_handle', '""'::jsonb, true),
  ('returns_text_ar', '"إمكانية الاسترجاع أو الاستبدال خلال 14 يوماً من الاستلام بشرط أن تكون المنتجات بحالتها الأصلية."'::jsonb, true),
  ('payment_window_hours', '24'::jsonb, false),
  ('pending_order_limit', '3'::jsonb, false)
on conflict (key) do nothing;

-- 3. RLS & Permissions
alter table public.shop_settings enable row level security;

create policy "public_read_shop_settings"
  on public.shop_settings
  for select
  using (is_public = true);

create policy "admin_read_all_shop_settings"
  on public.shop_settings
  for select
  using (public.is_admin());

revoke all on table public.shop_settings from public, anon;
grant select on table public.shop_settings to anon, authenticated;

-- 4. Update process_audit_log to support shop_settings (key instead of id)
create or replace function public.process_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_is_admin boolean := false;
  v_is_owner boolean := false;
  v_old_json jsonb;
  v_new_json jsonb;
  v_entity_id text;
  v_action text := tg_op;
begin
  if v_uid is not null then
    select role::text into v_role from public.profiles where id = v_uid;
    if v_role = 'admin' then
      v_is_admin := true;
    end if;
  else
    if current_user in ('postgres', 'supabase_admin')
       or session_user in ('postgres', 'supabase_admin') then
      v_is_owner := true;
      v_role := current_user;
    end if;
  end if;

  -- Only audit when actor is admin or database owner
  if not (v_is_admin or v_is_owner) then
    return coalesce(new, old);
  end if;

  -- If UPDATE, check if audited columns actually changed
  if tg_op = 'UPDATE' then
    if tg_table_name = 'products' then
      if not (
        new.name is distinct from old.name or
        new.price is distinct from old.price or
        new.discount_percent is distinct from old.discount_percent or
        new.stock_quantity is distinct from old.stock_quantity or
        new.is_active is distinct from old.is_active
      ) then
        return new;
      end if;
    elsif tg_table_name = 'orders' then
      if not (
        new.status is distinct from old.status or
        new.tracking_number is distinct from old.tracking_number or
        new.rep_name is distinct from old.rep_name or
        new.rep_phone is distinct from old.rep_phone
      ) then
        return new;
      end if;
    elsif tg_table_name = 'profiles' then
      if not (new.role is distinct from old.role) then
        return new;
      end if;
    elsif tg_table_name = 'shop_settings' then
      if not (new.value is distinct from old.value or new.is_public is distinct from old.is_public) then
        return new;
      end if;
    end if;
  end if;

  if tg_op in ('UPDATE', 'DELETE') then
    v_old_json := to_jsonb(old);
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    v_new_json := to_jsonb(new);
  end if;

  if tg_table_name = 'delivery_fees' then
    v_entity_id := (case when tg_op = 'DELETE'
      then old.governorate_id::text || ':' || old.method::text
      else new.governorate_id::text || ':' || new.method::text
    end);
  elsif tg_table_name = 'shop_settings' then
    v_entity_id := (case when tg_op = 'DELETE' then old.key else new.key end);
  else
    v_entity_id := (case when tg_op = 'DELETE' then old.id::text else new.id::text end);
  end if;

  insert into public.audit_log (actor, actor_role, action, entity, entity_id, old, new)
  values (
    v_uid,
    coalesce(v_role, 'unknown'),
    v_action,
    tg_table_name,
    v_entity_id,
    v_old_json,
    v_new_json
  );

  return coalesce(new, old);
end;
$$;

-- 5. Attach audit trigger to shop_settings
drop trigger if exists audit_shop_settings on public.shop_settings;
create trigger audit_shop_settings
  after insert or update or delete on public.shop_settings
  for each row execute function public.process_audit_log();

-- 6. admin_update_setting RPC function
create or replace function public.admin_update_setting(
  p_key text,
  p_value jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_num numeric;
  v_text text;
  v_arr_elem jsonb;
begin
  perform public.require_admin();

  -- Key allow-list
  if p_key not in (
    'shop_name_ar', 'shop_name_en', 'tagline_ar',
    'phone', 'whatsapp', 'instagram', 'announcement_ar',
    'hero_title_ar', 'hero_subtitle_ar', 'sale_percent',
    'payment_methods_enabled', 'instapay_qr_path', 'instapay_handle',
    'returns_text_ar', 'payment_window_hours', 'pending_order_limit'
  ) then
    raise exception 'Setting key not allowed'
      using errcode = '42501', hint = 'ADM-008';
  end if;

  -- Typed validation
  case p_key
    when 'shop_name_ar', 'shop_name_en' then
      if jsonb_typeof(p_value) <> 'string' then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;
      v_text := p_value #>> '{}';
      if char_length(v_text) = 0 or char_length(v_text) > 60 then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;

    when 'tagline_ar' then
      if jsonb_typeof(p_value) <> 'string' or char_length(p_value #>> '{}') > 120 then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;

    when 'phone', 'whatsapp' then
      if jsonb_typeof(p_value) <> 'string' or char_length(p_value #>> '{}') > 20 then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;

    when 'instagram' then
      if jsonb_typeof(p_value) <> 'string' then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;
      v_text := p_value #>> '{}';
      if char_length(v_text) > 100 then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;
      if v_text <> '' and v_text !~ '^https://[A-Za-z0-9._~:/?#\[\]@!$&''()*+,;=-]+$' then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;

    when 'announcement_ar' then
      if jsonb_typeof(p_value) <> 'string' or char_length(p_value #>> '{}') > 200 then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;

    when 'hero_title_ar' then
      if jsonb_typeof(p_value) <> 'string' or char_length(p_value #>> '{}') > 120 then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;

    when 'hero_subtitle_ar' then
      if jsonb_typeof(p_value) <> 'string' or char_length(p_value #>> '{}') > 240 then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;

    when 'sale_percent' then
      if jsonb_typeof(p_value) <> 'number' then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;
      v_num := (p_value #>> '{}')::numeric;
      if v_num <> trunc(v_num) or v_num < 0 or v_num > 90 then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;

    when 'payment_methods_enabled' then
      if jsonb_typeof(p_value) <> 'array' or jsonb_array_length(p_value) = 0 or jsonb_array_length(p_value) > 2 then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;
      for v_arr_elem in select jsonb_array_elements(p_value) loop
        if v_arr_elem #>> '{}' not in ('cod', 'instapay_qr') then
          raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
        end if;
      end loop;

    when 'instapay_qr_path' then
      if jsonb_typeof(p_value) <> 'string' then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;
      v_text := p_value #>> '{}';
      if v_text <> '' and v_text !~ '^(settings)/[A-Za-z0-9/_-]+\.(webp|jpg|jpeg|png)$' then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;

    when 'instapay_handle' then
      if jsonb_typeof(p_value) <> 'string' or char_length(p_value #>> '{}') > 60 then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;

    when 'returns_text_ar' then
      if jsonb_typeof(p_value) <> 'string' or char_length(p_value #>> '{}') > 2000 then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;

    when 'payment_window_hours' then
      if jsonb_typeof(p_value) <> 'number' then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;
      v_num := (p_value #>> '{}')::numeric;
      if v_num <> trunc(v_num) or v_num < 1 or v_num > 72 then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;

    when 'pending_order_limit' then
      if jsonb_typeof(p_value) <> 'number' then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;
      v_num := (p_value #>> '{}')::numeric;
      if v_num <> trunc(v_num) or v_num < 1 or v_num > 10 then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;

    else
      raise exception 'Setting key not allowed' using errcode = '42501', hint = 'ADM-008';
  end case;

  update public.shop_settings
     set value = p_value,
         updated_at = now(),
         updated_by = auth.uid()
   where key = p_key;

  if not found then
    raise exception 'Setting key not found' using errcode = 'P0002', hint = 'ADM-008';
  end if;
end;
$$;

revoke all on function public.admin_update_setting(text, jsonb) from public, anon;
grant execute on function public.admin_update_setting(text, jsonb) to authenticated;

-- 7. Configure product-images bucket size and mime limits (3 MB; JPEG, PNG, WebP)
update storage.buckets
   set file_size_limit = 3145728,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'product-images';


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20261012050000_orders_v2_payments.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- =====================================================================
-- 20261012050000_orders_v2_payments.sql : T-1.18 Orders v2 and Payments
-- Scenarios: S23 (Orders v2 & COD auto-pay), S24 (Payment proof flow),
-- S25 (expire_unpaid_orders).
-- =====================================================================

-- 1. Add instapay_qr to payment_method enum
alter type public.payment_method add value if not exists 'instapay_qr';

-- 2. Create payment_status enum
do $$
begin
  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type public.payment_status as enum (
      'unpaid', 'awaiting_proof', 'under_review', 'paid', 'rejected'
    );
  end if;
end;
$$;

-- 3. Add profile address columns
alter table public.profiles
  add column if not exists alt_phone text,
  add column if not exists governorate_id smallint references public.governorates (id),
  add column if not exists district text,
  add column if not exists floor text,
  add column if not exists apartment text,
  add column if not exists landmark text;

alter table public.profiles
  add constraint profiles_alt_phone_length check (alt_phone is null or char_length(alt_phone) <= 20),
  add constraint profiles_district_length check (district is null or char_length(district) <= 150),
  add constraint profiles_floor_length check (floor is null or char_length(floor) <= 50),
  add constraint profiles_apartment_length check (apartment is null or char_length(apartment) <= 50),
  add constraint profiles_landmark_length check (landmark is null or char_length(landmark) <= 150);

-- 4. Add order payment & structured address columns
alter table public.orders
  add column if not exists payment_status public.payment_status not null default 'unpaid',
  add column if not exists ship_alt_phone text,
  add column if not exists ship_district text,
  add column if not exists ship_floor text,
  add column if not exists ship_apartment text,
  add column if not exists ship_landmark text,
  add column if not exists payment_reference text,
  add column if not exists payment_proof_path text,
  add column if not exists payment_deadline timestamptz,
  add column if not exists payment_submitted_at timestamptz,
  add column if not exists paid_at timestamptz,
  add column if not exists payment_reviewed_by uuid references auth.users (id),
  add column if not exists payment_review_note text;

alter table public.orders
  add constraint orders_ship_alt_phone_length check (ship_alt_phone is null or char_length(ship_alt_phone) <= 20),
  add constraint orders_ship_district_length check (ship_district is null or char_length(ship_district) <= 150),
  add constraint orders_ship_floor_length check (ship_floor is null or char_length(ship_floor) <= 50),
  add constraint orders_ship_apartment_length check (ship_apartment is null or char_length(ship_apartment) <= 50),
  add constraint orders_ship_landmark_length check (ship_landmark is null or char_length(ship_landmark) <= 150),
  add constraint orders_payment_review_note_length check (payment_review_note is null or char_length(payment_review_note) <= 500),
  add constraint orders_payment_reference_unique unique (payment_reference);

-- 5. Trigger: COD orders automatically become paid on delivery
create or replace function public.orders_cod_payment_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.payment_method::text = 'cod' and new.status = 'delivered' and new.payment_status <> 'paid' then
    new.payment_status := 'paid';
    new.paid_at := coalesce(new.paid_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists orders_cod_payment_guard on public.orders;
create trigger orders_cod_payment_guard
  before insert or update on public.orders
  for each row execute function public.orders_cod_payment_guard();

-- 6. place_order v2 signature
create or replace function public.place_order(
  p_items           jsonb,
  p_delivery_method public.delivery_method,
  p_payment_method  public.payment_method,
  p_ship            jsonb
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id        uuid := auth.uid();
  v_order_id       bigint;
  v_subtotal       numeric(10,2) := 0;
  v_delivery_fee   numeric(10,2);
  v_total          numeric(10,2);
  v_item           jsonb;
  v_product_id     bigint;
  v_qty            integer;
  v_price          numeric(10,2);
  v_name           text;
  v_stock          integer;
  v_active         boolean;
  v_enabled_methods jsonb;
  v_window_hours   integer;
  v_payment_status public.payment_status;
  v_deadline       timestamptz;
  v_gov_id         smallint;
  v_gov_name       text;
  v_ship_name      text;
  v_ship_phone     text;
  v_ship_alt_phone text;
  v_ship_city      text;
  v_ship_district  text;
  v_ship_address   text;
  v_ship_floor     text;
  v_ship_apartment text;
  v_ship_landmark  text;
  v_notes          text;
begin
  -- 1. Must be authenticated
  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501', hint = 'AUTH-004';
  end if;

  -- 2. Validate cart items
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty'
      using errcode = '22023', hint = 'ORD-001';
  end if;

  if jsonb_array_length(p_items) > 30 then
    raise exception 'Too many items in order'
      using errcode = '22023', hint = 'ORD-013';
  end if;

  -- 3. Check payment method is enabled in settings
  select coalesce(value, '["cod", "instapay_qr"]'::jsonb)
    into v_enabled_methods
    from public.shop_settings
   where key = 'payment_methods_enabled';

  if not (v_enabled_methods @> to_jsonb(p_payment_method::text)) then
    raise exception 'Payment method is disabled'
      using errcode = '22023', hint = 'ORD-011';
  end if;

  -- 4. Parse & validate shipping fields
  if p_ship is null or jsonb_typeof(p_ship) <> 'object' then
    raise exception 'Shipping details required'
      using errcode = '22023', hint = 'ORD-012';
  end if;

  v_ship_name      := trim(coalesce(p_ship ->> 'name', ''));
  v_ship_phone     := trim(coalesce(p_ship ->> 'phone', ''));
  v_ship_alt_phone := nullif(trim(coalesce(p_ship ->> 'alt_phone', '')), '');
  v_ship_city      := nullif(trim(coalesce(p_ship ->> 'city', '')), '');
  v_ship_district  := nullif(trim(coalesce(p_ship ->> 'district', '')), '');
  v_ship_address   := trim(coalesce(p_ship ->> 'address', ''));
  v_ship_floor     := nullif(trim(coalesce(p_ship ->> 'floor', '')), '');
  v_ship_apartment := nullif(trim(coalesce(p_ship ->> 'apartment', '')), '');
  v_ship_landmark  := nullif(trim(coalesce(p_ship ->> 'landmark', '')), '');
  v_notes          := nullif(trim(coalesce(p_ship ->> 'notes', '')), '');

  if p_ship ? 'governorate_id' and (p_ship ->> 'governorate_id') ~ '^[0-9]+$' then
    v_gov_id := (p_ship ->> 'governorate_id')::smallint;
  else
    raise exception 'Governorate ID required'
      using errcode = '22023', hint = 'ORD-003';
  end if;

  if char_length(v_ship_name) = 0 or char_length(v_ship_name) > 100 or
     char_length(v_ship_phone) = 0 or char_length(v_ship_phone) > 20 or
     (v_ship_alt_phone is not null and char_length(v_ship_alt_phone) > 20) or
     (v_ship_city is not null and char_length(v_ship_city) > 150) or
     (v_ship_district is not null and char_length(v_ship_district) > 150) or
     char_length(v_ship_address) = 0 or char_length(v_ship_address) > 150 or
     (v_ship_floor is not null and char_length(v_ship_floor) > 50) or
     (v_ship_apartment is not null and char_length(v_ship_apartment) > 50) or
     (v_ship_landmark is not null and char_length(v_ship_landmark) > 150) or
     (v_notes is not null and char_length(v_notes) > 500) then
    raise exception 'Invalid shipping field length'
      using errcode = '22023', hint = 'ORD-012';
  end if;

  select name_en into v_gov_name from public.governorates where id = v_gov_id;
  if v_gov_name is null then
    raise exception 'Governorate not found'
      using errcode = '22023', hint = 'ORD-003';
  end if;

  -- 5. Delivery fee lookup
  select fee into v_delivery_fee
    from public.delivery_fees
   where governorate_id = v_gov_id and method = p_delivery_method;

  if v_delivery_fee is null then
    raise exception 'Delivery method unavailable'
      using errcode = '22023', hint = 'ORD-004';
  end if;

  -- 6. Lock products and validate stock/price
  for v_item in select jsonb_array_elements(p_items) loop
    v_product_id := (v_item ->> 'product_id')::bigint;
    v_qty := (v_item ->> 'quantity')::integer;

    if v_product_id is null then
      raise exception 'Invalid cart line'
        using errcode = '22023', hint = 'ORD-002';
    end if;

    if v_qty is null or v_qty <= 0 then
      raise exception 'Quantity must be positive'
        using errcode = '22023', hint = 'ORD-006';
    end if;

    select name, final_price, stock_quantity, is_active
      into v_name, v_price, v_stock, v_active
      from public.products
     where id = v_product_id
       for update;

    if v_name is null then
      raise exception 'Product not found'
        using errcode = '22023', hint = 'ORD-008';
    end if;

    if not v_active then
      raise exception 'Product is inactive'
        using errcode = '22023', hint = 'ORD-005';
    end if;

    if v_stock < v_qty then
      raise exception 'Not enough stock for %', v_name
        using errcode = '22023', hint = 'ORD-007', detail = 'left=' || v_stock::text;
    end if;

    v_subtotal := v_subtotal + (v_price * v_qty);
  end loop;

  v_total := v_subtotal + v_delivery_fee;

  -- 7. Payment status & deadline
  if p_payment_method::text = 'cod' then
    v_payment_status := 'unpaid';
    v_deadline := null;
  else
    v_payment_status := 'awaiting_proof';
    select coalesce((value #>> '{}')::integer, 24)
      into v_window_hours
      from public.shop_settings
     where key = 'payment_window_hours';
    v_deadline := now() + (coalesce(v_window_hours, 24) || ' hours')::interval;
  end if;

  -- 8. Insert order
  insert into public.orders (
    user_id, status, delivery_method, payment_method, payment_status,
    subtotal, shipping_fee, total,
    ship_name, ship_phone, ship_alt_phone, ship_governorate, ship_city,
    ship_district, ship_address, ship_floor, ship_apartment, ship_landmark,
    notes, payment_deadline
  ) values (
    v_user_id, 'pending', p_delivery_method, p_payment_method, v_payment_status,
    v_subtotal, v_delivery_fee, v_total,
    v_ship_name, v_ship_phone, v_ship_alt_phone, v_gov_name, v_ship_city,
    v_ship_district, v_ship_address, v_ship_floor, v_ship_apartment, v_ship_landmark,
    v_notes, v_deadline
  ) returning id into v_order_id;

  -- 9. Insert items and decrement stock
  for v_item in select jsonb_array_elements(p_items) loop
    v_product_id := (v_item ->> 'product_id')::bigint;
    v_qty := (v_item ->> 'quantity')::integer;

    select final_price, name into v_price, v_name
      from public.products
     where id = v_product_id;

    insert into public.order_items (order_id, product_id, product_name, quantity, unit_price)
    values (v_order_id, v_product_id, v_name, v_qty, v_price);

    update public.products
       set stock_quantity = stock_quantity - v_qty,
           sold_count = sold_count + v_qty
     where id = v_product_id;
  end loop;

  return v_order_id;
end;
$$;

-- Backward-compatibility wrapper for legacy place_order calls
create or replace function public.place_order(
  p_items            jsonb,
  p_delivery_method  public.delivery_method,
  p_ship_name        text,
  p_ship_phone       text,
  p_governorate_id   smallint,
  p_ship_city        text,
  p_ship_address     text,
  p_notes            text default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.place_order(
    p_items,
    p_delivery_method,
    'cod'::public.payment_method,
    jsonb_build_object(
      'name', p_ship_name,
      'phone', p_ship_phone,
      'governorate_id', p_governorate_id,
      'city', p_ship_city,
      'address', p_ship_address,
      'notes', p_notes
    )
  );
end;
$$;

revoke all on function public.place_order(jsonb, public.delivery_method, public.payment_method, jsonb) from public, anon;
grant execute on function public.place_order(jsonb, public.delivery_method, public.payment_method, jsonb) to authenticated;

revoke all on function public.place_order(jsonb, public.delivery_method, text, text, smallint, text, text, text) from public, anon;
grant execute on function public.place_order(jsonb, public.delivery_method, text, text, smallint, text, text, text) to authenticated;

-- 7. submit_payment_proof RPC function
create or replace function public.submit_payment_proof(
  p_order_id    bigint,
  p_reference   text,
  p_proof_path  text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid            uuid := auth.uid();
  v_order_uid      uuid;
  v_method         public.payment_method;
  v_status         public.payment_status;
  v_deadline       timestamptz;
  v_expected_prefix text;
begin
  if v_uid is null then
    raise exception 'Authentication required'
      using errcode = '42501', hint = 'AUTH-004';
  end if;

  select user_id, payment_method, payment_status, payment_deadline
    into v_order_uid, v_method, v_status, v_deadline
    from public.orders
   where id = p_order_id;

  if v_order_uid is null or v_order_uid <> v_uid then
    raise exception 'Not owner of order'
      using errcode = '42501', hint = 'ORD-009';
  end if;

  if v_method::text <> 'instapay_qr' then
    raise exception 'Wrong payment method'
      using errcode = '22023', hint = 'PAY-004';
  end if;

  if v_status = 'paid' then
    raise exception 'Order is already paid'
      using errcode = '22023', hint = 'PAY-002';
  end if;

  if v_status not in ('awaiting_proof', 'rejected') then
    raise exception 'Order is not awaiting proof'
      using errcode = '22023', hint = 'PAY-004';
  end if;

  if v_deadline is not null and now() > v_deadline then
    raise exception 'Payment deadline passed'
      using errcode = '22023', hint = 'PAY-001';
  end if;

  if p_reference is null or trim(p_reference) = '' then
    raise exception 'Payment reference required'
      using errcode = '22023', hint = 'PAY-003';
  end if;

  if exists (
    select 1 from public.orders
     where payment_reference = trim(p_reference)
       and id <> p_order_id
  ) then
    raise exception 'Duplicate payment reference'
      using errcode = '23505', hint = 'PAY-005';
  end if;

  v_expected_prefix := v_uid::text || '/' || p_order_id::text || '/';
  if p_proof_path is null or not starts_with(p_proof_path, v_expected_prefix) then
    raise exception 'Proof path must start with user and order ID'
      using errcode = '22023', hint = 'PAY-004';
  end if;

  update public.orders
     set payment_reference = trim(p_reference),
         payment_proof_path = p_proof_path,
         payment_status = 'under_review',
         payment_submitted_at = now()
   where id = p_order_id;
end;
$$;

revoke all on function public.submit_payment_proof(bigint, text, text) from public, anon;
grant execute on function public.submit_payment_proof(bigint, text, text) to authenticated;

-- 8. admin_review_payment RPC function
create or replace function public.admin_review_payment(
  p_order_id bigint,
  p_approve  boolean,
  p_note     text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.payment_status;
  v_new_status public.payment_status;
begin
  perform public.require_admin();

  select payment_status into v_status
    from public.orders
   where id = p_order_id;

  if v_status is null then
    raise exception 'Order not found' using errcode = 'P0002', hint = 'PAY-004';
  end if;

  if v_status = 'paid' then
    raise exception 'Order is already paid' using errcode = '22023', hint = 'PAY-002';
  end if;

  if v_status <> 'under_review' then
    raise exception 'Order is not under review' using errcode = '22023', hint = 'PAY-004';
  end if;

  if p_approve then
    v_new_status := 'paid';
    update public.orders
       set payment_status = v_new_status,
           paid_at = now(),
           payment_reviewed_by = auth.uid(),
           payment_review_note = p_note
     where id = p_order_id;
  else
    v_new_status := 'rejected';
    update public.orders
       set payment_status = v_new_status,
           payment_reviewed_by = auth.uid(),
           payment_review_note = p_note
     where id = p_order_id;
  end if;

  perform public.audit_event(
    'PAYMENT_REVIEW',
    'orders',
    p_order_id::text,
    jsonb_build_object('payment_status', v_status),
    jsonb_build_object('payment_status', v_new_status, 'approved', p_approve, 'note', p_note)
  );
end;
$$;

revoke all on function public.admin_review_payment(bigint, boolean, text) from public, anon;
grant execute on function public.admin_review_payment(bigint, boolean, text) to authenticated;

-- 9. expire_unpaid_orders function
create or replace function public.expire_unpaid_orders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  with cancelled as (
    update public.orders
       set status = 'cancelled'
     where payment_method::text = 'instapay_qr'
       and payment_status in ('awaiting_proof', 'rejected')
       and payment_deadline < now()
       and status = 'pending'
     returning id
  )
  select count(*) into v_count from cancelled;

  return v_count;
end;
$$;

revoke all on function public.expire_unpaid_orders() from public, anon;
grant execute on function public.expire_unpaid_orders() to authenticated;

-- 10. Private bucket payment-proofs with per-user folder policies
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs',
  'payment-proofs',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

create policy "user upload payment proof" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'payment-proofs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "user read payment proof" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'payment-proofs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "admin read payment proofs" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'payment-proofs'
    and public.is_admin()
  );

create policy "admin delete payment proofs" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'payment-proofs'
    and public.is_admin()
  );


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20261012051500_catalog_admin.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- =====================================================================
-- 20261012051500_catalog_admin.sql : T-1.19 Catalog admin support
-- Scenario S26: Category/product flags, image path pattern check,
-- safe delete functions (ADM-004, ADM-005), active storefront policies.
-- =====================================================================

-- 1. Add category and product flags
alter table public.categories
  add column if not exists is_active boolean not null default true,
  add column if not exists show_on_home boolean not null default false;

alter table public.products
  add column if not exists is_featured boolean not null default false;

-- 2. Image path validation function & check constraints
create or replace function public.is_valid_extra_images(p_paths text[])
returns boolean
language sql
immutable
as $$
  select p_paths is null or not exists (
    select 1 from unnest(p_paths) as p
     where p is null or p !~ '^(products|categories|settings)/[A-Za-z0-9/_-]+\.(webp|jpg|jpeg|png)$'
  );
$$;

alter table public.categories
  add constraint categories_image_url_path
  check (image_url is null or image_url ~ '^(products|categories|settings)/[A-Za-z0-9/_-]+\.(webp|jpg|jpeg|png)$');

alter table public.products
  add constraint products_image_url_path
  check (image_url is null or image_url ~ '^(products|categories|settings)/[A-Za-z0-9/_-]+\.(webp|jpg|jpeg|png)$'),
  add constraint products_extra_images_paths
  check (public.is_valid_extra_images(extra_images));

-- 3. Storefront policies: visitors and customers see active items only, admins see everything
drop policy if exists "public read categories" on public.categories;
create policy "public read categories" on public.categories
  for select to anon, authenticated
  using (is_active or public.is_admin());

drop policy if exists "read active products" on public.products;
create policy "read active products" on public.products
  for select to anon, authenticated
  using (
    (is_active and exists (
      select 1 from public.categories c
       where c.id = products.category_id and c.is_active
    ))
    or public.is_admin()
  );

-- 4. admin_delete_product RPC function
create or replace function public.admin_delete_product(p_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exists boolean;
begin
  perform public.require_admin();

  select exists(select 1 from public.products where id = p_id) into v_exists;
  if not v_exists then
    raise exception 'Product not found'
      using errcode = 'P0002', hint = 'ORD-008';
  end if;

  if exists (select 1 from public.order_items where product_id = p_id) then
    raise exception 'Cannot delete ordered product'
      using errcode = '22023', hint = 'ADM-004';
  end if;

  delete from public.products where id = p_id;
end;
$$;

revoke all on function public.admin_delete_product(bigint) from public, anon;
grant execute on function public.admin_delete_product(bigint) to authenticated;

-- 5. admin_delete_category RPC function
create or replace function public.admin_delete_category(
  p_id      bigint,
  p_move_to bigint default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prod_count integer;
  v_exists boolean;
begin
  perform public.require_admin();

  select exists(select 1 from public.categories where id = p_id) into v_exists;
  if not v_exists then
    raise exception 'Category not found'
      using errcode = 'P0002', hint = 'ADM-007';
  end if;

  select count(*) into v_prod_count
    from public.products
   where category_id = p_id;

  if v_prod_count > 0 then
    if p_move_to is null then
      raise exception 'Cannot delete non-empty category without target'
        using errcode = '22023', hint = 'ADM-005';
    end if;

    if p_move_to = p_id then
      raise exception 'Target category cannot be the same as deleted category'
        using errcode = '22023', hint = 'ADM-005';
    end if;

    if not exists (select 1 from public.categories where id = p_move_to) then
      raise exception 'Target category does not exist'
        using errcode = '22023', hint = 'ADM-005';
    end if;

    update public.products
       set category_id = p_move_to
     where category_id = p_id;
  end if;

  delete from public.categories where id = p_id;
end;
$$;

revoke all on function public.admin_delete_category(bigint, bigint) from public, anon;
grant execute on function public.admin_delete_category(bigint, bigint) to authenticated;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20261012053000_abuse_controls.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- =====================================================================
-- 20261012053000_abuse_controls.sql : T-1.20 Abuse controls
-- Scenarios S27 (Pending limit, line cap, qty cap), S28 (Rate limits).
-- =====================================================================

-- 1. Create internal rate_limits table
create table if not exists public.rate_limits (
  key          text primary key,
  window_start timestamptz not null default now(),
  count        integer not null default 1
);

alter table public.rate_limits enable row level security;
revoke all on table public.rate_limits from public, anon, authenticated;

-- 2. check_rate_limit function
create or replace function public.check_rate_limit(
  p_action text,
  p_limit  integer,
  p_window interval
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_key text;
  v_now timestamptz := now();
  v_rec record;
begin
  if v_uid is null then
    return;
  end if;

  v_key := v_uid::text || ':' || p_action;

  select window_start, count into v_rec
    from public.rate_limits
   where key = v_key
     for update;

  if not found then
    insert into public.rate_limits (key, window_start, count)
    values (v_key, v_now, 1)
    on conflict (key) do update
      set window_start = excluded.window_start, count = excluded.count;
  elsif v_now > (v_rec.window_start + p_window) then
    update public.rate_limits
       set window_start = v_now, count = 1
     where key = v_key;
  else
    if v_rec.count >= p_limit then
      raise exception 'Rate limit exceeded'
        using errcode = '22023', hint = 'SYS-003';
    else
      update public.rate_limits
         set count = count + 1
       where key = v_key;
    end if;
  end if;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, interval) from public, anon;
grant execute on function public.check_rate_limit(text, integer, interval) to authenticated;

-- 3. Update cancel_my_order with rate limiting
create or replace function public.cancel_my_order(p_order_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.check_rate_limit('cancel_my_order', 10, interval '1 minute');

  update public.orders
     set status = 'cancelled'
   where id = p_order_id
     and user_id = (select auth.uid())
     and status = 'pending';

  if not found then
    raise exception 'Order not found, or it can no longer be cancelled'
      using errcode = '22023', hint = 'ORD-009';
  end if;
end;
$$;

revoke all on function public.cancel_my_order(bigint) from public, anon;
grant execute on function public.cancel_my_order(bigint) to authenticated;

-- 4. Update submit_payment_proof with rate limiting
create or replace function public.submit_payment_proof(
  p_order_id    bigint,
  p_reference   text,
  p_proof_path  text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid            uuid := auth.uid();
  v_order_uid      uuid;
  v_method         public.payment_method;
  v_status         public.payment_status;
  v_deadline       timestamptz;
  v_expected_prefix text;
begin
  if v_uid is null then
    raise exception 'Authentication required'
      using errcode = '42501', hint = 'AUTH-004';
  end if;

  perform public.check_rate_limit('submit_payment_proof', 10, interval '1 minute');

  select user_id, payment_method, payment_status, payment_deadline
    into v_order_uid, v_method, v_status, v_deadline
    from public.orders
   where id = p_order_id;

  if v_order_uid is null or v_order_uid <> v_uid then
    raise exception 'Not owner of order'
      using errcode = '42501', hint = 'ORD-009';
  end if;

  if v_method::text <> 'instapay_qr' then
    raise exception 'Wrong payment method'
      using errcode = '22023', hint = 'PAY-004';
  end if;

  if v_status = 'paid' then
    raise exception 'Order is already paid'
      using errcode = '22023', hint = 'PAY-002';
  end if;

  if v_status not in ('awaiting_proof', 'rejected') then
    raise exception 'Order is not awaiting proof'
      using errcode = '22023', hint = 'PAY-004';
  end if;

  if v_deadline is not null and now() > v_deadline then
    raise exception 'Payment deadline passed'
      using errcode = '22023', hint = 'PAY-001';
  end if;

  if p_reference is null or trim(p_reference) = '' then
    raise exception 'Payment reference required'
      using errcode = '22023', hint = 'PAY-003';
  end if;

  if exists (
    select 1 from public.orders
     where payment_reference = trim(p_reference)
       and id <> p_order_id
  ) then
    raise exception 'Duplicate payment reference'
      using errcode = '23505', hint = 'PAY-005';
  end if;

  v_expected_prefix := v_uid::text || '/' || p_order_id::text || '/';
  if p_proof_path is null or not starts_with(p_proof_path, v_expected_prefix) then
    raise exception 'Proof path must start with user and order ID'
      using errcode = '22023', hint = 'PAY-004';
  end if;

  update public.orders
     set payment_reference = trim(p_reference),
         payment_proof_path = p_proof_path,
         payment_status = 'under_review',
         payment_submitted_at = now()
   where id = p_order_id;
end;
$$;

revoke all on function public.submit_payment_proof(bigint, text, text) from public, anon;
grant execute on function public.submit_payment_proof(bigint, text, text) to authenticated;

-- 5. Update place_order with rate limiting, order caps, and pending limits
create or replace function public.place_order(
  p_items           jsonb,
  p_delivery_method public.delivery_method,
  p_payment_method  public.payment_method,
  p_ship            jsonb
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id        uuid := auth.uid();
  v_order_id       bigint;
  v_subtotal       numeric(10,2) := 0;
  v_delivery_fee   numeric(10,2);
  v_total          numeric(10,2);
  v_item           jsonb;
  v_product_id     bigint;
  v_qty            integer;
  v_price          numeric(10,2);
  v_name           text;
  v_stock          integer;
  v_active         boolean;
  v_enabled_methods jsonb;
  v_window_hours   integer;
  v_pending_limit  integer;
  v_pending_count  integer;
  v_payment_status public.payment_status;
  v_deadline       timestamptz;
  v_gov_id         smallint;
  v_gov_name       text;
  v_ship_name      text;
  v_ship_phone     text;
  v_ship_alt_phone text;
  v_ship_city      text;
  v_ship_district  text;
  v_ship_address   text;
  v_ship_floor     text;
  v_ship_apartment text;
  v_ship_landmark  text;
  v_notes          text;
begin
  -- 1. Must be authenticated
  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501', hint = 'AUTH-004';
  end if;

  -- 2. Check rate limit
  perform public.check_rate_limit('place_order', 10, interval '1 minute');

  -- 3. Check pending orders cap
  select coalesce((value #>> '{}')::integer, 3)
    into v_pending_limit
    from public.shop_settings
   where key = 'pending_order_limit';

  select count(*)
    into v_pending_count
    from public.orders
   where user_id = v_user_id
     and status = 'pending';

  if v_pending_count >= coalesce(v_pending_limit, 3) then
    raise exception 'Too many pending orders'
      using errcode = '22023', hint = 'ORD-010';
  end if;

  -- 4. Validate cart items and line cap
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty'
      using errcode = '22023', hint = 'ORD-001';
  end if;

  if jsonb_array_length(p_items) > 30 then
    raise exception 'Too many items in order'
      using errcode = '22023', hint = 'ORD-013';
  end if;

  -- 5. Check payment method is enabled in settings
  select coalesce(value, '["cod", "instapay_qr"]'::jsonb)
    into v_enabled_methods
    from public.shop_settings
   where key = 'payment_methods_enabled';

  if not (v_enabled_methods @> to_jsonb(p_payment_method::text)) then
    raise exception 'Payment method is disabled'
      using errcode = '22023', hint = 'ORD-011';
  end if;

  -- 6. Parse & validate shipping fields
  if p_ship is null or jsonb_typeof(p_ship) <> 'object' then
    raise exception 'Shipping details required'
      using errcode = '22023', hint = 'ORD-012';
  end if;

  v_ship_name      := trim(coalesce(p_ship ->> 'name', ''));
  v_ship_phone     := trim(coalesce(p_ship ->> 'phone', ''));
  v_ship_alt_phone := nullif(trim(coalesce(p_ship ->> 'alt_phone', '')), '');
  v_ship_city      := nullif(trim(coalesce(p_ship ->> 'city', '')), '');
  v_ship_district  := nullif(trim(coalesce(p_ship ->> 'district', '')), '');
  v_ship_address   := trim(coalesce(p_ship ->> 'address', ''));
  v_ship_floor     := nullif(trim(coalesce(p_ship ->> 'floor', '')), '');
  v_ship_apartment := nullif(trim(coalesce(p_ship ->> 'apartment', '')), '');
  v_ship_landmark  := nullif(trim(coalesce(p_ship ->> 'landmark', '')), '');
  v_notes          := nullif(trim(coalesce(p_ship ->> 'notes', '')), '');

  if p_ship ? 'governorate_id' and (p_ship ->> 'governorate_id') ~ '^[0-9]+$' then
    v_gov_id := (p_ship ->> 'governorate_id')::smallint;
  else
    raise exception 'Governorate ID required'
      using errcode = '22023', hint = 'ORD-003';
  end if;

  if char_length(v_ship_name) = 0 or char_length(v_ship_name) > 100 or
     char_length(v_ship_phone) = 0 or char_length(v_ship_phone) > 20 or
     (v_ship_alt_phone is not null and char_length(v_ship_alt_phone) > 20) or
     (v_ship_city is not null and char_length(v_ship_city) > 150) or
     (v_ship_district is not null and char_length(v_ship_district) > 150) or
     char_length(v_ship_address) = 0 or char_length(v_ship_address) > 150 or
     (v_ship_floor is not null and char_length(v_ship_floor) > 50) or
     (v_ship_apartment is not null and char_length(v_ship_apartment) > 50) or
     (v_ship_landmark is not null and char_length(v_ship_landmark) > 150) or
     (v_notes is not null and char_length(v_notes) > 500) then
    raise exception 'Invalid shipping field length'
      using errcode = '22023', hint = 'ORD-012';
  end if;

  select name_en into v_gov_name from public.governorates where id = v_gov_id;
  if v_gov_name is null then
    raise exception 'Governorate not found'
      using errcode = '22023', hint = 'ORD-003';
  end if;

  -- 7. Delivery fee lookup
  select fee into v_delivery_fee
    from public.delivery_fees
   where governorate_id = v_gov_id and method = p_delivery_method;

  if v_delivery_fee is null then
    raise exception 'Delivery method unavailable'
      using errcode = '22023', hint = 'ORD-004';
  end if;

  -- 8. Lock products and validate stock/price/quantity cap
  for v_item in select jsonb_array_elements(p_items) loop
    v_product_id := (v_item ->> 'product_id')::bigint;
    v_qty := (v_item ->> 'quantity')::integer;

    if v_product_id is null then
      raise exception 'Invalid cart line'
        using errcode = '22023', hint = 'ORD-002';
    end if;

    if v_qty is null or v_qty <= 0 or v_qty > 20 then
      raise exception 'Quantity must be between 1 and 20'
        using errcode = '22023', hint = 'ORD-006';
    end if;

    select name, final_price, stock_quantity, is_active
      into v_name, v_price, v_stock, v_active
      from public.products
     where id = v_product_id
       for update;

    if v_name is null then
      raise exception 'Product not found'
        using errcode = '22023', hint = 'ORD-008';
    end if;

    if not v_active then
      raise exception 'Product is inactive'
        using errcode = '22023', hint = 'ORD-005';
    end if;

    if v_stock < v_qty then
      raise exception 'Not enough stock for %', v_name
        using errcode = '22023', hint = 'ORD-007', detail = 'left=' || v_stock::text;
    end if;

    v_subtotal := v_subtotal + (v_price * v_qty);
  end loop;

  v_total := v_subtotal + v_delivery_fee;

  -- 9. Payment status & deadline
  if p_payment_method::text = 'cod' then
    v_payment_status := 'unpaid';
    v_deadline := null;
  else
    v_payment_status := 'awaiting_proof';
    select coalesce((value #>> '{}')::integer, 24)
      into v_window_hours
      from public.shop_settings
     where key = 'payment_window_hours';
    v_deadline := now() + (coalesce(v_window_hours, 24) || ' hours')::interval;
  end if;

  -- 10. Insert order
  insert into public.orders (
    user_id, status, delivery_method, payment_method, payment_status,
    subtotal, shipping_fee, total,
    ship_name, ship_phone, ship_alt_phone, ship_governorate, ship_city,
    ship_district, ship_address, ship_floor, ship_apartment, ship_landmark,
    notes, payment_deadline
  ) values (
    v_user_id, 'pending', p_delivery_method, p_payment_method, v_payment_status,
    v_subtotal, v_delivery_fee, v_total,
    v_ship_name, v_ship_phone, v_ship_alt_phone, v_gov_name, v_ship_city,
    v_ship_district, v_ship_address, v_ship_floor, v_ship_apartment, v_ship_landmark,
    v_notes, v_deadline
  ) returning id into v_order_id;

  -- 11. Insert items and decrement stock
  for v_item in select jsonb_array_elements(p_items) loop
    v_product_id := (v_item ->> 'product_id')::bigint;
    v_qty := (v_item ->> 'quantity')::integer;

    select final_price, name into v_price, v_name
      from public.products
     where id = v_product_id;

    insert into public.order_items (order_id, product_id, product_name, quantity, unit_price)
    values (v_order_id, v_product_id, v_name, v_qty, v_price);

    update public.products
       set stock_quantity = stock_quantity - v_qty,
           sold_count = sold_count + v_qty
     where id = v_product_id;
  end loop;

  return v_order_id;
end;
$$;

revoke all on function public.place_order(jsonb, public.delivery_method, public.payment_method, jsonb) from public, anon;
grant execute on function public.place_order(jsonb, public.delivery_method, public.payment_method, jsonb) to authenticated;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20261012054500_stock_ledger.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- =====================================================================
-- 20261012054500_stock_ledger.sql : T-1.21 Stock ledger
-- Scenario S29: stock_movements append-only table, trigger on
-- products.stock_quantity, app.stock_reason and app.stock_order_id configs.
-- =====================================================================

-- 1. Create stock_reason enum
do $$
begin
  if not exists (select 1 from pg_type where typname = 'stock_reason') then
    create type public.stock_reason as enum (
      'order', 'cancel', 'admin_adjust', 'restock', 'correction'
    );
  end if;
end;
$$;

-- 2. Create stock_movements table
create table if not exists public.stock_movements (
  id           bigint generated always as identity primary key,
  product_id   bigint not null references public.products (id) on delete cascade,
  delta        integer not null,
  new_quantity integer not null,
  reason       public.stock_reason not null,
  order_id     bigint references public.orders (id) on delete set null,
  actor        uuid references auth.users (id) on delete set null,
  at           timestamptz not null default now()
);

create index if not exists stock_movements_product_idx on public.stock_movements (product_id);
create index if not exists stock_movements_at_idx on public.stock_movements (at desc);

-- 3. RLS & Permissions
alter table public.stock_movements enable row level security;

create policy "admin_read_stock_movements"
  on public.stock_movements
  for select
  using (public.is_admin());

revoke all on table public.stock_movements from public, anon;
grant select on table public.stock_movements to authenticated;

-- 4. Immutability trigger: blocks update and delete
create or replace function public.stock_movements_immutable()
returns trigger
language plpgsql
as $$
begin
  raise exception 'stock_movements is append-only; update and delete are prohibited'
    using errcode = '42501', hint = 'SEC-019';
end;
$$;

drop trigger if exists stock_movements_immutable_trigger on public.stock_movements;
create trigger stock_movements_immutable_trigger
  before update or delete on public.stock_movements
  for each row execute function public.stock_movements_immutable();

-- 5. Trigger function: log_stock_movement
create or replace function public.log_stock_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delta integer;
  v_reason_str text;
  v_reason public.stock_reason;
  v_order_id_str text;
  v_order_id bigint;
  v_actor uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    if new.stock_quantity > 0 then
      v_delta := new.stock_quantity;
      v_reason_str := nullif(current_setting('app.stock_reason', true), '');
      if v_reason_str is null then
        v_reason := 'restock'::public.stock_reason;
      else
        v_reason := v_reason_str::public.stock_reason;
      end if;

      v_order_id_str := nullif(current_setting('app.stock_order_id', true), '');
      if v_order_id_str is not null and v_order_id_str ~ '^[0-9]+$' then
        v_order_id := v_order_id_str::bigint;
      end if;

      insert into public.stock_movements (
        product_id, delta, new_quantity, reason, order_id, actor, at
      ) values (
        new.id, v_delta, new.stock_quantity, v_reason, v_order_id, v_actor, now()
      );
    end if;
  elsif tg_op = 'UPDATE' then
    if new.stock_quantity is distinct from old.stock_quantity then
      v_delta := new.stock_quantity - old.stock_quantity;

      v_reason_str := nullif(current_setting('app.stock_reason', true), '');
      if v_reason_str is null then
        v_reason := 'admin_adjust'::public.stock_reason;
      else
        v_reason := v_reason_str::public.stock_reason;
      end if;

      v_order_id_str := nullif(current_setting('app.stock_order_id', true), '');
      if v_order_id_str is not null and v_order_id_str ~ '^[0-9]+$' then
        v_order_id := v_order_id_str::bigint;
      end if;

      insert into public.stock_movements (
        product_id, delta, new_quantity, reason, order_id, actor, at
      ) values (
        new.id, v_delta, new.stock_quantity, v_reason, v_order_id, v_actor, now()
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists log_stock_movement on public.products;
create trigger log_stock_movement
  after insert or update of stock_quantity on public.products
  for each row execute function public.log_stock_movement();

-- 6. Update orders_status_guard to set cancel stock reason
create or replace function public.orders_status_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'cancelled' and new.status <> 'cancelled' then
    raise exception 'A cancelled order cannot be re-opened'
      using errcode = '22023', hint = 'ORD-014';
  end if;

  if new.status = 'cancelled' and old.status <> 'cancelled' then
    perform set_config('app.stock_reason', 'cancel', true);
    perform set_config('app.stock_order_id', new.id::text, true);

    update public.products p
       set stock_quantity = p.stock_quantity + oi.quantity,
           sold_count     = greatest(p.sold_count - oi.quantity, 0)
      from public.order_items oi
     where oi.order_id = new.id
       and oi.product_id = p.id;
  end if;
  return new;
end;
$$;

-- 7. Update place_order to set order stock reason
create or replace function public.place_order(
  p_items           jsonb,
  p_delivery_method public.delivery_method,
  p_payment_method  public.payment_method,
  p_ship            jsonb
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id        uuid := auth.uid();
  v_order_id       bigint;
  v_subtotal       numeric(10,2) := 0;
  v_delivery_fee   numeric(10,2);
  v_total          numeric(10,2);
  v_item           jsonb;
  v_product_id     bigint;
  v_qty            integer;
  v_price          numeric(10,2);
  v_name           text;
  v_stock          integer;
  v_active         boolean;
  v_enabled_methods jsonb;
  v_window_hours   integer;
  v_pending_limit  integer;
  v_pending_count  integer;
  v_payment_status public.payment_status;
  v_deadline       timestamptz;
  v_gov_id         smallint;
  v_gov_name       text;
  v_ship_name      text;
  v_ship_phone     text;
  v_ship_alt_phone text;
  v_ship_city      text;
  v_ship_district  text;
  v_ship_address   text;
  v_ship_floor     text;
  v_ship_apartment text;
  v_ship_landmark  text;
  v_notes          text;
begin
  -- 1. Must be authenticated
  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501', hint = 'AUTH-004';
  end if;

  -- 2. Check rate limit
  perform public.check_rate_limit('place_order', 10, interval '1 minute');

  -- 3. Check pending orders cap
  select coalesce((value #>> '{}')::integer, 3)
    into v_pending_limit
    from public.shop_settings
   where key = 'pending_order_limit';

  select count(*)
    into v_pending_count
    from public.orders
   where user_id = v_user_id
     and status = 'pending';

  if v_pending_count >= coalesce(v_pending_limit, 3) then
    raise exception 'Too many pending orders'
      using errcode = '22023', hint = 'ORD-010';
  end if;

  -- 4. Validate cart items and line cap
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty'
      using errcode = '22023', hint = 'ORD-001';
  end if;

  if jsonb_array_length(p_items) > 30 then
    raise exception 'Too many items in order'
      using errcode = '22023', hint = 'ORD-013';
  end if;

  -- 5. Check payment method is enabled in settings
  select coalesce(value, '["cod", "instapay_qr"]'::jsonb)
    into v_enabled_methods
    from public.shop_settings
   where key = 'payment_methods_enabled';

  if not (v_enabled_methods @> to_jsonb(p_payment_method::text)) then
    raise exception 'Payment method is disabled'
      using errcode = '22023', hint = 'ORD-011';
  end if;

  -- 6. Parse & validate shipping fields
  if p_ship is null or jsonb_typeof(p_ship) <> 'object' then
    raise exception 'Shipping details required'
      using errcode = '22023', hint = 'ORD-012';
  end if;

  v_ship_name      := trim(coalesce(p_ship ->> 'name', ''));
  v_ship_phone     := trim(coalesce(p_ship ->> 'phone', ''));
  v_ship_alt_phone := nullif(trim(coalesce(p_ship ->> 'alt_phone', '')), '');
  v_ship_city      := nullif(trim(coalesce(p_ship ->> 'city', '')), '');
  v_ship_district  := nullif(trim(coalesce(p_ship ->> 'district', '')), '');
  v_ship_address   := trim(coalesce(p_ship ->> 'address', ''));
  v_ship_floor     := nullif(trim(coalesce(p_ship ->> 'floor', '')), '');
  v_ship_apartment := nullif(trim(coalesce(p_ship ->> 'apartment', '')), '');
  v_ship_landmark  := nullif(trim(coalesce(p_ship ->> 'landmark', '')), '');
  v_notes          := nullif(trim(coalesce(p_ship ->> 'notes', '')), '');

  if p_ship ? 'governorate_id' and (p_ship ->> 'governorate_id') ~ '^[0-9]+$' then
    v_gov_id := (p_ship ->> 'governorate_id')::smallint;
  else
    raise exception 'Governorate ID required'
      using errcode = '22023', hint = 'ORD-003';
  end if;

  if char_length(v_ship_name) = 0 or char_length(v_ship_name) > 100 or
     char_length(v_ship_phone) = 0 or char_length(v_ship_phone) > 20 or
     (v_ship_alt_phone is not null and char_length(v_ship_alt_phone) > 20) or
     (v_ship_city is not null and char_length(v_ship_city) > 150) or
     (v_ship_district is not null and char_length(v_ship_district) > 150) or
     char_length(v_ship_address) = 0 or char_length(v_ship_address) > 150 or
     (v_ship_floor is not null and char_length(v_ship_floor) > 50) or
     (v_ship_apartment is not null and char_length(v_ship_apartment) > 50) or
     (v_ship_landmark is not null and char_length(v_ship_landmark) > 150) or
     (v_notes is not null and char_length(v_notes) > 500) then
    raise exception 'Invalid shipping field length'
      using errcode = '22023', hint = 'ORD-012';
  end if;

  select name_en into v_gov_name from public.governorates where id = v_gov_id;
  if v_gov_name is null then
    raise exception 'Governorate not found'
      using errcode = '22023', hint = 'ORD-003';
  end if;

  -- 7. Delivery fee lookup
  select fee into v_delivery_fee
    from public.delivery_fees
   where governorate_id = v_gov_id and method = p_delivery_method;

  if v_delivery_fee is null then
    raise exception 'Delivery method unavailable'
      using errcode = '22023', hint = 'ORD-004';
  end if;

  -- 8. Lock products and validate stock/price/quantity cap
  for v_item in select jsonb_array_elements(p_items) loop
    v_product_id := (v_item ->> 'product_id')::bigint;
    v_qty := (v_item ->> 'quantity')::integer;

    if v_product_id is null then
      raise exception 'Invalid cart line'
        using errcode = '22023', hint = 'ORD-002';
    end if;

    if v_qty is null or v_qty <= 0 or v_qty > 20 then
      raise exception 'Quantity must be between 1 and 20'
        using errcode = '22023', hint = 'ORD-006';
    end if;

    select name, final_price, stock_quantity, is_active
      into v_name, v_price, v_stock, v_active
      from public.products
     where id = v_product_id
       for update;

    if v_name is null then
      raise exception 'Product not found'
        using errcode = '22023', hint = 'ORD-008';
    end if;

    if not v_active then
      raise exception 'Product is inactive'
        using errcode = '22023', hint = 'ORD-005';
    end if;

    if v_stock < v_qty then
      raise exception 'Not enough stock for %', v_name
        using errcode = '22023', hint = 'ORD-007', detail = 'left=' || v_stock::text;
    end if;

    v_subtotal := v_subtotal + (v_price * v_qty);
  end loop;

  v_total := v_subtotal + v_delivery_fee;

  -- 9. Payment status & deadline
  if p_payment_method::text = 'cod' then
    v_payment_status := 'unpaid';
    v_deadline := null;
  else
    v_payment_status := 'awaiting_proof';
    select coalesce((value #>> '{}')::integer, 24)
      into v_window_hours
      from public.shop_settings
     where key = 'payment_window_hours';
    v_deadline := now() + (coalesce(v_window_hours, 24) || ' hours')::interval;
  end if;

  -- 10. Insert order
  insert into public.orders (
    user_id, status, delivery_method, payment_method, payment_status,
    subtotal, shipping_fee, total,
    ship_name, ship_phone, ship_alt_phone, ship_governorate, ship_city,
    ship_district, ship_address, ship_floor, ship_apartment, ship_landmark,
    notes, payment_deadline
  ) values (
    v_user_id, 'pending', p_delivery_method, p_payment_method, v_payment_status,
    v_subtotal, v_delivery_fee, v_total,
    v_ship_name, v_ship_phone, v_ship_alt_phone, v_gov_name, v_ship_city,
    v_ship_district, v_ship_address, v_ship_floor, v_ship_apartment, v_ship_landmark,
    v_notes, v_deadline
  ) returning id into v_order_id;

  -- 11. Insert items and decrement stock with stock reason 'order'
  perform set_config('app.stock_reason', 'order', true);
  perform set_config('app.stock_order_id', v_order_id::text, true);

  for v_item in select jsonb_array_elements(p_items) loop
    v_product_id := (v_item ->> 'product_id')::bigint;
    v_qty := (v_item ->> 'quantity')::integer;

    select final_price, name into v_price, v_name
      from public.products
     where id = v_product_id;

    insert into public.order_items (order_id, product_id, product_name, quantity, unit_price)
    values (v_order_id, v_product_id, v_name, v_qty, v_price);

    update public.products
       set stock_quantity = stock_quantity - v_qty,
           sold_count = sold_count + v_qty
     where id = v_product_id;
  end loop;

  return v_order_id;
end;
$$;

revoke all on function public.place_order(jsonb, public.delivery_method, public.payment_method, jsonb) from public, anon;
grant execute on function public.place_order(jsonb, public.delivery_method, public.payment_method, jsonb) to authenticated;

-- 8. Backfill seed movements so movements add up to initial product stock
insert into public.stock_movements (product_id, delta, new_quantity, reason, actor, at)
select id, stock_quantity, stock_quantity, 'restock'::public.stock_reason, null, created_at
  from public.products
 where stock_quantity > 0;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20261012060000_profile_address_grants.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- =====================================================================
-- 20261012060000_profile_address_grants.sql
-- Grant column update permissions on profiles structured address fields
-- to authenticated role for customer profile self-service editing.
-- =====================================================================

grant update (alt_phone, district, floor, apartment, landmark)
  on public.profiles to authenticated;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20261013232546_order_approval_enum.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- T-1.23: commit the enum value before functions use it in the next migration.
alter type public.payment_status add value if not exists 'awaiting_approval';


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20261014023000_order_approval_and_saved_address.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- =====================================================================
-- 20261014023000_order_approval_and_saved_address.sql : T-1.23
-- Change Request: Approve-first InstaPay flow and saved address.
-- Scenarios: S32 (Approve moves to confirmed/awaiting_proof with deadline),
--            S33 (Reject cancels and restocks with reason),
--            S34 (Refuse shipped/delivered for unpaid InstaPay orders - ORD-015),
--            S35 (Refuse get_payment_instructions & proof before approval - PAY-007),
--            S36 (Expiry cancels unapproved orders past approval window),
--            S37 (Only order owner can call get_payment_instructions).
-- =====================================================================

-- 1. Add awaiting_approval to payment_status enum
alter type public.payment_status add value if not exists 'awaiting_approval' before 'awaiting_proof';

-- 2. Insert new settings into shop_settings and set InstaPay keys to private
insert into public.shop_settings (key, value, is_public)
values
  ('require_order_approval', 'true'::jsonb, true),
  ('approval_window_hours', '24'::jsonb, false)
on conflict (key) do nothing;

update public.shop_settings
   set is_public = false
 where key in ('instapay_qr_path', 'instapay_handle');

-- 3. Update admin_update_setting with allow-list validation for new settings
create or replace function public.admin_update_setting(
  p_key text,
  p_value jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_num numeric;
  v_text text;
  v_arr_elem jsonb;
begin
  perform public.require_admin();

  -- Key allow-list
  if p_key not in (
    'shop_name_ar', 'shop_name_en', 'tagline_ar',
    'phone', 'whatsapp', 'instagram', 'announcement_ar',
    'hero_title_ar', 'hero_subtitle_ar', 'sale_percent',
    'payment_methods_enabled', 'instapay_qr_path', 'instapay_handle',
    'returns_text_ar', 'payment_window_hours', 'pending_order_limit',
    'require_order_approval', 'approval_window_hours'
  ) then
    raise exception 'Setting key not allowed'
      using errcode = '42501', hint = 'ADM-008';
  end if;

  case p_key
    when 'shop_name_ar', 'shop_name_en' then
      if jsonb_typeof(p_value) <> 'string' or char_length(p_value #>> '{}') = 0 or char_length(p_value #>> '{}') > 60 then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;

    when 'tagline_ar' then
      if jsonb_typeof(p_value) <> 'string' or char_length(p_value #>> '{}') > 120 then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;

    when 'phone', 'whatsapp' then
      if jsonb_typeof(p_value) <> 'string' or char_length(p_value #>> '{}') > 20 then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;

    when 'instagram' then
      if jsonb_typeof(p_value) <> 'string' then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;
      v_text := p_value #>> '{}';
      if char_length(v_text) > 100 then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;
      if v_text <> '' and v_text !~ '^https://[A-Za-z0-9._~:/?#\[\]@!$&''()*+,;=-]+$' then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;

    when 'announcement_ar' then
      if jsonb_typeof(p_value) <> 'string' or char_length(p_value #>> '{}') > 200 then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;

    when 'hero_title_ar' then
      if jsonb_typeof(p_value) <> 'string' or char_length(p_value #>> '{}') > 120 then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;

    when 'hero_subtitle_ar' then
      if jsonb_typeof(p_value) <> 'string' or char_length(p_value #>> '{}') > 240 then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;

    when 'sale_percent' then
      if jsonb_typeof(p_value) <> 'number' then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;
      v_num := (p_value #>> '{}')::numeric;
      if v_num <> trunc(v_num) or v_num < 0 or v_num > 90 then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;

    when 'payment_methods_enabled' then
      if jsonb_typeof(p_value) <> 'array' or jsonb_array_length(p_value) = 0 or jsonb_array_length(p_value) > 2 then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;
      for v_arr_elem in select jsonb_array_elements(p_value) loop
        if v_arr_elem #>> '{}' not in ('cod', 'instapay_qr') then
          raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
        end if;
      end loop;

    when 'instapay_qr_path' then
      if jsonb_typeof(p_value) <> 'string' then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;
      v_text := p_value #>> '{}';
      if v_text <> '' and v_text !~ '^(settings)/[A-Za-z0-9/_-]+\.(webp|jpg|jpeg|png)$' then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;

    when 'instapay_handle' then
      if jsonb_typeof(p_value) <> 'string' or char_length(p_value #>> '{}') > 60 then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;

    when 'returns_text_ar' then
      if jsonb_typeof(p_value) <> 'string' or char_length(p_value #>> '{}') > 2000 then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;

    when 'payment_window_hours' then
      if jsonb_typeof(p_value) <> 'number' then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;
      v_num := (p_value #>> '{}')::numeric;
      if v_num <> trunc(v_num) or v_num < 1 or v_num > 72 then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;

    when 'pending_order_limit' then
      if jsonb_typeof(p_value) <> 'number' then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;
      v_num := (p_value #>> '{}')::numeric;
      if v_num <> trunc(v_num) or v_num < 1 or v_num > 10 then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;

    when 'require_order_approval' then
      if jsonb_typeof(p_value) <> 'boolean' then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;

    when 'approval_window_hours' then
      if jsonb_typeof(p_value) <> 'number' then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;
      v_num := (p_value #>> '{}')::numeric;
      if v_num <> trunc(v_num) or v_num < 1 or v_num > 72 then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;

  end case;

  update public.shop_settings
     set value = p_value,
         updated_at = now(),
         updated_by = auth.uid()
   where key = p_key;

  if not found then
    raise exception 'Setting key not found' using errcode = 'P0002', hint = 'ADM-008';
  end if;
end;
$$;

revoke all on function public.admin_update_setting(text, jsonb) from public, anon;
grant execute on function public.admin_update_setting(text, jsonb) to authenticated;

-- 4. Update orders_status_guard trigger to enforce ORD-015
create or replace function public.orders_status_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'cancelled' and new.status <> 'cancelled' then
    raise exception 'A cancelled order cannot be re-opened'
      using errcode = '22023', hint = 'ORD-014';
  end if;

  -- ORD-015: An instapay_qr order cannot become shipped or delivered unless payment_status = paid
  if new.payment_method::text = 'instapay_qr'
     and new.status in ('shipped', 'delivered')
     and new.payment_status::text <> 'paid' then
    raise exception 'Cannot ship unpaid InstaPay order'
      using errcode = '22023', hint = 'ORD-015';
  end if;

  if new.status = 'cancelled' and old.status <> 'cancelled' then
    perform set_config('app.stock_reason', 'cancel', true);
    perform set_config('app.stock_order_id', new.id::text, true);

    update public.products p
       set stock_quantity = p.stock_quantity + oi.quantity,
           sold_count     = greatest(p.sold_count - oi.quantity, 0)
      from public.order_items oi
     where oi.order_id = new.id
       and oi.product_id = p.id;
  end if;
  return new;
end;
$$;

-- 5. Update place_order with approval-first logic and saved address
create or replace function public.place_order(
  p_items           jsonb,
  p_delivery_method public.delivery_method,
  p_payment_method  public.payment_method,
  p_ship            jsonb
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id             uuid := auth.uid();
  v_order_id            bigint;
  v_subtotal            numeric(10,2) := 0;
  v_delivery_fee        numeric(10,2);
  v_total               numeric(10,2);
  v_item                jsonb;
  v_product_id          bigint;
  v_qty                 integer;
  v_price               numeric(10,2);
  v_name                text;
  v_stock               integer;
  v_active              boolean;
  v_enabled_methods     jsonb;
  v_window_hours        integer;
  v_payment_status      public.payment_status;
  v_deadline            timestamptz;
  v_gov_id              smallint;
  v_gov_name            text;
  v_ship_name           text;
  v_ship_phone          text;
  v_ship_alt_phone      text;
  v_ship_city           text;
  v_ship_district       text;
  v_ship_address        text;
  v_ship_floor          text;
  v_ship_apartment      text;
  v_ship_landmark       text;
  v_notes               text;
  v_pending_limit       integer;
  v_pending_count       integer;
  v_require_approval    boolean := true;
  v_save_address        boolean := true;
  v_has_no_address      boolean := false;
begin
  -- 1. Must be authenticated
  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501', hint = 'AUTH-004';
  end if;

  -- 2. Rate limiting check (SYS-003)
  perform public.check_rate_limit('place_order', 10, interval '1 minute');

  -- 3. Check customer pending orders limit (ORD-010)
  select coalesce((value #>> '{}')::integer, 3)
    into v_pending_limit
    from public.shop_settings
   where key = 'pending_order_limit';

  select count(*)
    into v_pending_count
    from public.orders
   where user_id = v_user_id
     and status = 'pending';

  if v_pending_count >= coalesce(v_pending_limit, 3) then
    raise exception 'Pending orders limit reached'
      using errcode = '22023', hint = 'ORD-010';
  end if;

  -- 4. Validate cart items and cap lines (ORD-001, ORD-013)
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty'
      using errcode = '22023', hint = 'ORD-001';
  end if;

  if jsonb_array_length(p_items) > 30 then
    raise exception 'Too many items in order'
      using errcode = '22023', hint = 'ORD-013';
  end if;

  -- 5. Check payment method is enabled in settings (ORD-011)
  select coalesce(value, '["cod", "instapay_qr"]'::jsonb)
    into v_enabled_methods
    from public.shop_settings
   where key = 'payment_methods_enabled';

  if not (v_enabled_methods @> to_jsonb(p_payment_method::text)) then
    raise exception 'Payment method is disabled'
      using errcode = '22023', hint = 'ORD-011';
  end if;

  -- 6. Parse & validate shipping fields (ORD-003, ORD-012)
  if p_ship is null or jsonb_typeof(p_ship) <> 'object' then
    raise exception 'Shipping details required'
      using errcode = '22023', hint = 'ORD-012';
  end if;

  v_ship_name      := trim(coalesce(p_ship ->> 'name', ''));
  v_ship_phone     := trim(coalesce(p_ship ->> 'phone', ''));
  v_ship_alt_phone := nullif(trim(coalesce(p_ship ->> 'alt_phone', '')), '');
  v_ship_city      := nullif(trim(coalesce(p_ship ->> 'city', '')), '');
  v_ship_district  := nullif(trim(coalesce(p_ship ->> 'district', '')), '');
  v_ship_address   := trim(coalesce(p_ship ->> 'address', ''));
  v_ship_floor     := nullif(trim(coalesce(p_ship ->> 'floor', '')), '');
  v_ship_apartment := nullif(trim(coalesce(p_ship ->> 'apartment', '')), '');
  v_ship_landmark  := nullif(trim(coalesce(p_ship ->> 'landmark', '')), '');
  v_notes          := nullif(trim(coalesce(p_ship ->> 'notes', '')), '');

  if p_ship ? 'governorate_id' and (p_ship ->> 'governorate_id') ~ '^[0-9]+$' then
    v_gov_id := (p_ship ->> 'governorate_id')::smallint;
  else
    raise exception 'Governorate ID required'
      using errcode = '22023', hint = 'ORD-003';
  end if;

  if char_length(v_ship_name) = 0 or char_length(v_ship_name) > 100 or
     char_length(v_ship_phone) = 0 or char_length(v_ship_phone) > 20 or
     (v_ship_alt_phone is not null and char_length(v_ship_alt_phone) > 20) or
     (v_ship_city is not null and char_length(v_ship_city) > 150) or
     (v_ship_district is not null and char_length(v_ship_district) > 150) or
     char_length(v_ship_address) = 0 or char_length(v_ship_address) > 150 or
     (v_ship_floor is not null and char_length(v_ship_floor) > 50) or
     (v_ship_apartment is not null and char_length(v_ship_apartment) > 50) or
     (v_ship_landmark is not null and char_length(v_ship_landmark) > 150) or
     (v_notes is not null and char_length(v_notes) > 500) then
    raise exception 'Invalid shipping field length'
      using errcode = '22023', hint = 'ORD-012';
  end if;

  select name_en into v_gov_name from public.governorates where id = v_gov_id;
  if v_gov_name is null then
    raise exception 'Governorate not found'
      using errcode = '22023', hint = 'ORD-003';
  end if;

  -- 7. Delivery fee lookup (ORD-004)
  select fee into v_delivery_fee
    from public.delivery_fees
   where governorate_id = v_gov_id and method = p_delivery_method;

  if v_delivery_fee is null then
    raise exception 'Delivery method unavailable'
      using errcode = '22023', hint = 'ORD-004';
  end if;

  -- 8. Lock products and validate stock/price/quantity cap (ORD-002, ORD-005, ORD-006, ORD-007, ORD-008)
  for v_item in select jsonb_array_elements(p_items) loop
    v_product_id := (v_item ->> 'product_id')::bigint;
    v_qty := (v_item ->> 'quantity')::integer;

    if v_product_id is null then
      raise exception 'Invalid cart line'
        using errcode = '22023', hint = 'ORD-002';
    end if;

    if v_qty is null or v_qty <= 0 or v_qty > 20 then
      raise exception 'Quantity must be between 1 and 20'
        using errcode = '22023', hint = 'ORD-006';
    end if;

    select name, final_price, stock_quantity, is_active
      into v_name, v_price, v_stock, v_active
      from public.products
     where id = v_product_id
       for update;

    if v_name is null then
      raise exception 'Product not found'
        using errcode = '22023', hint = 'ORD-008';
    end if;

    if not v_active then
      raise exception 'Product is inactive'
        using errcode = '22023', hint = 'ORD-005';
    end if;

    if v_stock < v_qty then
      raise exception 'Not enough stock for %', v_name
        using errcode = '22023', hint = 'ORD-007', detail = 'left=' || v_stock::text;
    end if;

    v_subtotal := v_subtotal + (v_price * v_qty);
  end loop;

  v_total := v_subtotal + v_delivery_fee;

  -- 9. Payment status & deadline calculation
  if p_payment_method::text = 'cod' then
    v_payment_status := 'unpaid';
    v_deadline := null;
  else
    select coalesce((value #>> '{}')::boolean, true)
      into v_require_approval
      from public.shop_settings
     where key = 'require_order_approval';

    if coalesce(v_require_approval, true) then
      v_payment_status := 'awaiting_approval';
      v_deadline := null;
    else
      v_payment_status := 'awaiting_proof';
      select coalesce((value #>> '{}')::integer, 24)
        into v_window_hours
        from public.shop_settings
       where key = 'payment_window_hours';
      v_deadline := now() + (coalesce(v_window_hours, 24) || ' hours')::interval;
    end if;
  end if;

  -- 10. Saved address management (Section 2)
  select (address is null or trim(address) = '')
    into v_has_no_address
    from public.profiles
   where id = v_user_id;

  if p_ship ? 'save_address' then
    v_save_address := coalesce((p_ship ->> 'save_address')::boolean, false);
  else
    v_save_address := true;
  end if;

  if v_save_address or coalesce(v_has_no_address, true) then
    update public.profiles
       set full_name = coalesce(full_name, v_ship_name),
           phone = coalesce(phone, v_ship_phone),
           alt_phone = coalesce(v_ship_alt_phone, alt_phone),
           governorate_id = coalesce(v_gov_id, governorate_id),
           city = coalesce(v_ship_city, city),
           district = coalesce(v_ship_district, district),
           address = v_ship_address,
           floor = coalesce(v_ship_floor, floor),
           apartment = coalesce(v_ship_apartment, apartment),
           landmark = coalesce(v_ship_landmark, landmark)
     where id = v_user_id;
  end if;

  -- 11. Insert order
  insert into public.orders (
    user_id, status, delivery_method, payment_method, payment_status,
    subtotal, shipping_fee, total,
    ship_name, ship_phone, ship_alt_phone, ship_governorate, ship_city,
    ship_district, ship_address, ship_floor, ship_apartment, ship_landmark,
    notes, payment_deadline
  ) values (
    v_user_id, 'pending', p_delivery_method, p_payment_method, v_payment_status,
    v_subtotal, v_delivery_fee, v_total,
    v_ship_name, v_ship_phone, v_ship_alt_phone, v_gov_name, v_ship_city,
    v_ship_district, v_ship_address, v_ship_floor, v_ship_apartment, v_ship_landmark,
    v_notes, v_deadline
  ) returning id into v_order_id;

  -- 12. Insert items and decrement stock with stock reason 'order'
  perform set_config('app.stock_reason', 'order', true);
  perform set_config('app.stock_order_id', v_order_id::text, true);

  for v_item in select jsonb_array_elements(p_items) loop
    v_product_id := (v_item ->> 'product_id')::bigint;
    v_qty := (v_item ->> 'quantity')::integer;

    select final_price, name into v_price, v_name
      from public.products
     where id = v_product_id;

    insert into public.order_items (order_id, product_id, product_name, quantity, unit_price)
    values (v_order_id, v_product_id, v_name, v_qty, v_price);

    update public.products
       set stock_quantity = stock_quantity - v_qty,
           sold_count = sold_count + v_qty
     where id = v_product_id;
  end loop;

  return v_order_id;
end;
$$;

revoke all on function public.place_order(jsonb, public.delivery_method, public.payment_method, jsonb) from public, anon;
grant execute on function public.place_order(jsonb, public.delivery_method, public.payment_method, jsonb) to authenticated;

-- 6. admin_approve_order RPC function (S32)
create or replace function public.admin_approve_order(
  p_order_id bigint,
  p_note     text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status          public.order_status;
  v_payment_status  public.payment_status;
  v_window_hours    integer;
  v_deadline        timestamptz;
begin
  perform public.require_admin();

  select status, payment_status
    into v_status, v_payment_status
    from public.orders
   where id = p_order_id;

  if v_status is null then
    raise exception 'Order not found' using errcode = 'P0002', hint = 'ORD-009';
  end if;

  if v_status <> 'pending' or v_payment_status::text <> 'awaiting_approval' then
    raise exception 'Order is not awaiting approval'
      using errcode = '22023', hint = 'PAY-004';
  end if;

  select coalesce((value #>> '{}')::integer, 24)
    into v_window_hours
    from public.shop_settings
   where key = 'payment_window_hours';

  v_deadline := now() + (coalesce(v_window_hours, 24) || ' hours')::interval;

  update public.orders
     set status = 'confirmed',
         payment_status = 'awaiting_proof',
         payment_deadline = v_deadline,
         payment_review_note = coalesce(p_note, payment_review_note)
   where id = p_order_id;

  perform public.audit_event(
    'ORDER_APPROVE',
    'orders',
    p_order_id::text,
    jsonb_build_object('status', v_status, 'payment_status', v_payment_status),
    jsonb_build_object('status', 'confirmed', 'payment_status', 'awaiting_proof', 'deadline', v_deadline, 'note', p_note)
  );
end;
$$;

revoke all on function public.admin_approve_order(bigint, text) from public, anon;
grant execute on function public.admin_approve_order(bigint, text) to authenticated;

-- 7. admin_reject_order RPC function (S33)
create or replace function public.admin_reject_order(
  p_order_id bigint,
  p_reason   text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status          public.order_status;
  v_payment_status  public.payment_status;
begin
  perform public.require_admin();

  if p_reason is null or trim(p_reason) = '' then
    raise exception 'Rejection reason required'
      using errcode = '22023', hint = 'ADM-007';
  end if;

  select status, payment_status
    into v_status, v_payment_status
    from public.orders
   where id = p_order_id;

  if v_status is null then
    raise exception 'Order not found' using errcode = 'P0002', hint = 'ORD-009';
  end if;

  if v_status <> 'pending' or v_payment_status::text <> 'awaiting_approval' then
    raise exception 'Order is not awaiting approval'
      using errcode = '22023', hint = 'PAY-004';
  end if;

  -- Setting status = 'cancelled' triggers orders_status_guard which restores stock and logs cancel reason
  update public.orders
     set status = 'cancelled',
         payment_review_note = trim(p_reason)
   where id = p_order_id;

  perform public.audit_event(
    'ORDER_REJECT',
    'orders',
    p_order_id::text,
    jsonb_build_object('status', v_status, 'payment_status', v_payment_status),
    jsonb_build_object('status', 'cancelled', 'reason', trim(p_reason))
  );
end;
$$;

revoke all on function public.admin_reject_order(bigint, text) from public, anon;
grant execute on function public.admin_reject_order(bigint, text) to authenticated;

-- 8. get_payment_instructions function (S35, S37)
create or replace function public.get_payment_instructions(p_order_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid            uuid := auth.uid();
  v_order_uid      uuid;
  v_status         public.payment_status;
  v_total          numeric(10,2);
  v_deadline       timestamptz;
  v_qr_path        text;
  v_handle         text;
begin
  if v_uid is null then
    raise exception 'Authentication required'
      using errcode = '42501', hint = 'AUTH-004';
  end if;

  select user_id, payment_status, total, payment_deadline
    into v_order_uid, v_status, v_total, v_deadline
    from public.orders
   where id = p_order_id;

  if v_order_uid is null or v_order_uid <> v_uid then
    raise exception 'Not owner of order'
      using errcode = '42501', hint = 'ORD-009';
  end if;

  if v_status::text = 'awaiting_approval' then
    raise exception 'Order is awaiting store approval'
      using errcode = '22023', hint = 'PAY-007';
  end if;

  if v_status::text not in ('awaiting_proof', 'under_review', 'rejected') then
    raise exception 'Wrong payment status for instructions'
      using errcode = '22023', hint = 'PAY-004';
  end if;

  select value #>> '{}' into v_qr_path from public.shop_settings where key = 'instapay_qr_path';
  select value #>> '{}' into v_handle from public.shop_settings where key = 'instapay_handle';

  return jsonb_build_object(
    'qr_path', coalesce(v_qr_path, 'settings/instapay-qr-default.png'),
    'instapay_handle', coalesce(v_handle, ''),
    'amount', v_total,
    'deadline', v_deadline
  );
end;
$$;

revoke all on function public.get_payment_instructions(bigint) from public, anon;
grant execute on function public.get_payment_instructions(bigint) to authenticated;

-- 9. Update submit_payment_proof to refuse before approval (PAY-007)
create or replace function public.submit_payment_proof(
  p_order_id    bigint,
  p_reference   text,
  p_proof_path  text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid            uuid := auth.uid();
  v_order_uid      uuid;
  v_method         public.payment_method;
  v_status         public.payment_status;
  v_deadline       timestamptz;
  v_expected_prefix text;
begin
  if v_uid is null then
    raise exception 'Authentication required'
      using errcode = '42501', hint = 'AUTH-004';
  end if;

  select user_id, payment_method, payment_status, payment_deadline
    into v_order_uid, v_method, v_status, v_deadline
    from public.orders
   where id = p_order_id;

  if v_order_uid is null or v_order_uid <> v_uid then
    raise exception 'Not owner of order'
      using errcode = '42501', hint = 'ORD-009';
  end if;

  if v_method::text <> 'instapay_qr' then
    raise exception 'Wrong payment method'
      using errcode = '22023', hint = 'PAY-004';
  end if;

  if v_status::text = 'awaiting_approval' then
    raise exception 'Order is awaiting store approval'
      using errcode = '22023', hint = 'PAY-007';
  end if;

  if v_status::text = 'paid' then
    raise exception 'Order is already paid'
      using errcode = '22023', hint = 'PAY-002';
  end if;

  if v_status::text not in ('awaiting_proof', 'rejected') then
    raise exception 'Order is not awaiting proof'
      using errcode = '22023', hint = 'PAY-004';
  end if;

  if v_deadline is not null and now() > v_deadline then
    raise exception 'Payment deadline passed'
      using errcode = '22023', hint = 'PAY-001';
  end if;

  if p_reference is null or trim(p_reference) = '' then
    raise exception 'Payment reference required'
      using errcode = '22023', hint = 'PAY-003';
  end if;

  if exists (
    select 1 from public.orders
     where payment_reference = trim(p_reference)
       and id <> p_order_id
  ) then
    raise exception 'Duplicate payment reference'
      using errcode = '23505', hint = 'PAY-005';
  end if;

  v_expected_prefix := v_uid::text || '/' || p_order_id::text || '/';
  if p_proof_path is null or not starts_with(p_proof_path, v_expected_prefix) then
    raise exception 'Proof path must start with user and order ID'
      using errcode = '22023', hint = 'PAY-004';
  end if;

  update public.orders
     set payment_reference = trim(p_reference),
         payment_proof_path = p_proof_path,
         payment_status = 'under_review',
         payment_submitted_at = now()
   where id = p_order_id;
end;
$$;

revoke all on function public.submit_payment_proof(bigint, text, text) from public, anon;
grant execute on function public.submit_payment_proof(bigint, text, text) to authenticated;

-- 10. Update expire_unpaid_orders to also cancel unapproved orders past approval window (S36)
create or replace function public.expire_unpaid_orders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_approval_hours integer;
begin
  select coalesce((value #>> '{}')::integer, 24)
    into v_approval_hours
    from public.shop_settings
   where key = 'approval_window_hours';

  with cancelled_unapproved as (
    update public.orders
       set status = 'cancelled',
           payment_review_note = 'Approval window expired'
     where payment_method::text = 'instapay_qr'
       and payment_status::text = 'awaiting_approval'
       and status = 'pending'
       and created_at < now() - (coalesce(v_approval_hours, 24) || ' hours')::interval
     returning id
  ),
  cancelled_unpaid as (
    update public.orders
       set status = 'cancelled'
     where payment_method::text = 'instapay_qr'
       and payment_status::text in ('awaiting_proof', 'rejected')
       and payment_deadline < now()
       and status in ('pending', 'confirmed')
     returning id
  )
  select (select count(*) from cancelled_unapproved) + (select count(*) from cancelled_unpaid)
    into v_count;

  return v_count;
end;
$$;

revoke all on function public.expire_unpaid_orders() from public, anon;
grant execute on function public.expire_unpaid_orders() to authenticated;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20261014132000_security_review_hardening.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- Migration: 20261014132000_security_review_hardening.sql
-- Hardening for T-7.04 Security review:
-- 1. Correct place_order cart line deduplication & merging into order_items
-- 2. Validate cart line fields (ORD-002 for missing product_id or quantity, ORD-006 for invalid range)
-- 3. Separate shipping required empty check (ORD-003) from length check (ORD-012)
-- 4. Revoke insert/update/delete on shop_settings from authenticated (prevent direct mutation)
-- 5. Grant execute on place_order and admin_dashboard to anon & authenticated for uniform auth error codes

-- 1. Revoke direct write permissions on shop_settings
revoke insert, update, delete on table public.shop_settings from public, anon, authenticated;

-- 2. Update place_order function with proper deduplication and error handling
create or replace function public.place_order(
  p_items jsonb,
  p_delivery_method public.delivery_method,
  p_payment_method public.payment_method,
  p_ship jsonb
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_order_id bigint;
  v_pending_limit integer;
  v_pending_count integer;
  v_enabled_methods jsonb;
  v_delivery_fee numeric(10,2);
  v_subtotal numeric(10,2) := 0;
  v_total numeric(10,2);
  v_payment_status public.payment_status;
  v_require_approval boolean;
  v_window_hours integer;
  v_deadline timestamptz;
  v_item jsonb;
  v_product_id bigint;
  v_qty integer;
  v_name text;
  v_price numeric(10,2);
  v_stock integer;
  v_active boolean;
  r record;

  v_ship_name text;
  v_ship_phone text;
  v_ship_alt_phone text;
  v_ship_city text;
  v_ship_district text;
  v_ship_address text;
  v_ship_floor text;
  v_ship_apartment text;
  v_ship_landmark text;
  v_notes text;
  v_gov_id smallint;
  v_gov_name text;
  v_save_address boolean := false;
begin
  -- 1. Authentication check (AUTH-004)
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501', hint = 'AUTH-004';
  end if;

  -- 2. Rate limiting check (SYS-003)
  perform public.check_rate_limit('place_order', 10, interval '1 minute');

  -- 3. Check customer pending orders limit (ORD-010)
  select coalesce((value #>> '{}')::integer, 3)
    into v_pending_limit
    from public.shop_settings
   where key = 'pending_order_limit';

  select count(*)
    into v_pending_count
    from public.orders
   where user_id = v_user_id
     and status = 'pending';

  if v_pending_count >= coalesce(v_pending_limit, 3) then
    raise exception 'Pending orders limit reached'
      using errcode = '22023', hint = 'ORD-010';
  end if;

  -- 4. Validate cart items presence and cap lines (ORD-001, ORD-013)
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty'
      using errcode = '22023', hint = 'ORD-001';
  end if;

  if jsonb_array_length(p_items) > 30 then
    raise exception 'Too many items in order'
      using errcode = '22023', hint = 'ORD-013';
  end if;

  -- 5. Check payment method is enabled in settings (ORD-011)
  select coalesce(value, '["cod", "instapay_qr"]'::jsonb)
    into v_enabled_methods
    from public.shop_settings
   where key = 'payment_methods_enabled';

  if not (v_enabled_methods @> to_jsonb(p_payment_method::text)) then
    raise exception 'Payment method is disabled'
      using errcode = '22023', hint = 'ORD-011';
  end if;

  -- 6. Validate shipping payload
  if p_ship is null or jsonb_typeof(p_ship) <> 'object' then
    raise exception 'Shipping details required'
      using errcode = '22023', hint = 'ORD-012';
  end if;

  v_ship_name      := trim(coalesce(p_ship ->> 'name', ''));
  v_ship_phone     := trim(coalesce(p_ship ->> 'phone', ''));
  v_ship_alt_phone := nullif(trim(coalesce(p_ship ->> 'alt_phone', '')), '');
  v_ship_city      := nullif(trim(coalesce(p_ship ->> 'city', '')), '');
  v_ship_district  := nullif(trim(coalesce(p_ship ->> 'district', '')), '');
  v_ship_address   := trim(coalesce(p_ship ->> 'address', ''));
  v_ship_floor     := nullif(trim(coalesce(p_ship ->> 'floor', '')), '');
  v_ship_apartment := nullif(trim(coalesce(p_ship ->> 'apartment', '')), '');
  v_ship_landmark  := nullif(trim(coalesce(p_ship ->> 'landmark', '')), '');
  v_notes          := nullif(trim(coalesce(p_ship ->> 'notes', '')), '');

  if p_ship ? 'governorate_id' and (p_ship ->> 'governorate_id') ~ '^[0-9]+$' then
    v_gov_id := (p_ship ->> 'governorate_id')::smallint;
  else
    raise exception 'Governorate ID required'
      using errcode = '22023', hint = 'ORD-003';
  end if;

  -- Field length check (ORD-012)
  if char_length(v_ship_name) = 0 or
     char_length(v_ship_name) > 100 or
     char_length(v_ship_phone) = 0 or
     char_length(v_ship_phone) > 20 or
     (v_ship_alt_phone is not null and char_length(v_ship_alt_phone) > 20) or
     (v_ship_city is not null and char_length(v_ship_city) > 150) or
     (v_ship_district is not null and char_length(v_ship_district) > 150) or
     char_length(v_ship_address) = 0 or
     char_length(v_ship_address) > 150 or
     (v_ship_floor is not null and char_length(v_ship_floor) > 50) or
     (v_ship_apartment is not null and char_length(v_ship_apartment) > 50) or
     (v_ship_landmark is not null and char_length(v_ship_landmark) > 150) or
     (v_notes is not null and char_length(v_notes) > 500) then
    raise exception 'Invalid shipping field length'
      using errcode = '22023', hint = 'ORD-012';
  end if;

  select name_en into v_gov_name from public.governorates where id = v_gov_id;
  if v_gov_name is null then
    raise exception 'Governorate not found'
      using errcode = '22023', hint = 'ORD-003';
  end if;

  -- 7. Delivery fee lookup (ORD-004)
  select fee into v_delivery_fee
    from public.delivery_fees
   where governorate_id = v_gov_id and method = p_delivery_method;

  if v_delivery_fee is null then
    raise exception 'Delivery method unavailable'
      using errcode = '22023', hint = 'ORD-004';
  end if;

  -- 8. Validate each cart item individually for missing fields and per-line cap
  for v_item in select jsonb_array_elements(p_items) loop
    if not (v_item ? 'product_id' and (v_item ->> 'product_id') ~ '^[0-9]+$') then
      raise exception 'Each cart line needs a product_id'
        using errcode = '22023', hint = 'ORD-002';
    end if;

    if not (v_item ? 'quantity' and (v_item ->> 'quantity') ~ '^-?[0-9]+$') then
      raise exception 'Each cart line needs a quantity'
        using errcode = '22023', hint = 'ORD-002';
    end if;

    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty <= 0 or v_qty > 20 then
      raise exception 'Quantity must be between 1 and 20'
        using errcode = '22023', hint = 'ORD-006';
    end if;
  end loop;

  -- 9. Lock products and validate stock/price on aggregated line quantities
  for r in
    select (e ->> 'product_id')::bigint as product_id,
           sum((e ->> 'quantity')::integer)::integer as qty
      from jsonb_array_elements(p_items) e
     group by 1
     order by 1
  loop
    v_product_id := r.product_id;
    v_qty := r.qty;

    select name, final_price, stock_quantity, is_active
      into v_name, v_price, v_stock, v_active
      from public.products
     where id = v_product_id
       for update;

    if v_name is null then
      raise exception 'Product not found'
        using errcode = '22023', hint = 'ORD-008';
    end if;

    if not v_active then
      raise exception 'Product is inactive'
        using errcode = '22023', hint = 'ORD-005';
    end if;

    if v_stock < v_qty then
      raise exception 'Not enough stock for %', v_name
        using errcode = '22023', hint = 'ORD-007', detail = 'left=' || v_stock::text;
    end if;

    v_subtotal := v_subtotal + (v_price * v_qty);
  end loop;

  v_total := v_subtotal + v_delivery_fee;

  -- 10. Payment status & deadline calculation
  if p_payment_method::text = 'cod' then
    v_payment_status := 'unpaid';
    v_deadline := null;
  else
    select coalesce((value #>> '{}')::boolean, true)
      into v_require_approval
      from public.shop_settings
     where key = 'require_order_approval';

    if coalesce(v_require_approval, true) then
      v_payment_status := 'awaiting_approval';
      v_deadline := null;
    else
      v_payment_status := 'awaiting_proof';
      select coalesce((value #>> '{}')::integer, 24)
        into v_window_hours
        from public.shop_settings
       where key = 'payment_window_hours';
      v_deadline := now() + (coalesce(v_window_hours, 24) || ' hours')::interval;
    end if;
  end if;

  -- 11. Optionally update saved profile address
  if p_ship ? 'save_address' and (p_ship ->> 'save_address')::boolean = true then
    update public.profiles
       set phone = v_ship_phone,
           alt_phone = v_ship_alt_phone,
           governorate_id = v_gov_id,
           city = v_ship_city,
           district = v_ship_district,
           address = v_ship_address,
           floor = v_ship_floor,
           apartment = v_ship_apartment,
           landmark = v_ship_landmark
     where id = v_user_id;
  end if;

  -- 12. Insert order
  insert into public.orders (
    user_id, status, delivery_method, payment_method, payment_status,
    subtotal, shipping_fee, total,
    ship_name, ship_phone, ship_alt_phone, ship_governorate, ship_city,
    ship_district, ship_address, ship_floor, ship_apartment, ship_landmark,
    notes, payment_deadline
  ) values (
    v_user_id, 'pending', p_delivery_method, p_payment_method, v_payment_status,
    v_subtotal, v_delivery_fee, v_total,
    v_ship_name, v_ship_phone, v_ship_alt_phone, v_gov_name, v_ship_city,
    v_ship_district, v_ship_address, v_ship_floor, v_ship_apartment, v_ship_landmark,
    v_notes, v_deadline
  ) returning id into v_order_id;

  -- 13. Insert merged items and decrement stock with stock reason 'order'
  perform set_config('app.stock_reason', 'order', true);
  perform set_config('app.stock_order_id', v_order_id::text, true);

  for r in
    select (e ->> 'product_id')::bigint as product_id,
           sum((e ->> 'quantity')::integer)::integer as qty
      from jsonb_array_elements(p_items) e
     group by 1
     order by 1
  loop
    v_product_id := r.product_id;
    v_qty := r.qty;

    select final_price, name into v_price, v_name
      from public.products
     where id = v_product_id;

    insert into public.order_items (order_id, product_id, product_name, quantity, unit_price)
    values (v_order_id, v_product_id, v_name, v_qty, v_price);

    update public.products
       set stock_quantity = stock_quantity - v_qty,
           sold_count = sold_count + v_qty
     where id = v_product_id;
  end loop;

  return v_order_id;
end;
$$;

-- 3. Legacy 8-arg place_order wrapper (preserving ORD-003 for required fields)
create or replace function public.place_order(
  p_items jsonb,
  p_delivery_method public.delivery_method,
  p_ship_name text,
  p_ship_phone text,
  p_governorate_id smallint,
  p_ship_city text default null,
  p_ship_address text default '',
  p_notes text default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
begin
  if char_length(trim(coalesce(p_ship_name, ''))) = 0 or
     char_length(trim(coalesce(p_ship_phone, ''))) = 0 or
     char_length(trim(coalesce(p_ship_address, ''))) = 0 then
    raise exception 'Name, phone, and address are required'
      using errcode = '22023', hint = 'ORD-003';
  end if;

  return public.place_order(
    p_items,
    p_delivery_method,
    'cod'::public.payment_method,
    jsonb_build_object(
      'name', p_ship_name,
      'phone', p_ship_phone,
      'governorate_id', p_governorate_id,
      'city', p_ship_city,
      'address', p_ship_address,
      'notes', p_notes
    )
  );
end;
$$;

revoke all on function public.place_order(jsonb, public.delivery_method, public.payment_method, jsonb) from public;
grant execute on function public.place_order(jsonb, public.delivery_method, public.payment_method, jsonb) to anon, authenticated;

revoke all on function public.place_order(jsonb, public.delivery_method, text, text, smallint, text, text, text) from public;
grant execute on function public.place_order(jsonb, public.delivery_method, text, text, smallint, text, text, text) to anon, authenticated;

revoke all on function public.admin_dashboard(date, date) from public;
grant execute on function public.admin_dashboard(date, date) to anon, authenticated;

-- 6. Set explicit search_path on remaining public functions (Supabase Security Advisor 0011_function_search_path_mutable)
alter function public.set_updated_at() set search_path = public;
alter function public.audit_log_immutable() set search_path = public;
alter function public.is_valid_extra_images(text[]) set search_path = public;
alter function public.stock_movements_immutable() set search_path = public;



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20261014170000_customer_anonymization.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- Migration: Customer Anonymization (T-7.11)
-- Implements admin_anonymize_customer(p_user_id) for GDPR / Egyptian Personal Data Protection Law No. 151 of 2020 Right to Erasure

create or replace function public.admin_anonymize_customer(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_role public.user_role;
  v_orders_count integer;
begin
  -- 1. Enforce admin role and AAL2 step-up
  perform public.require_admin();

  -- 2. Validate input and ensure profile exists
  if p_user_id is null then
    raise exception 'Customer user ID is required'
      using errcode = '22023', hint = 'ADM-007';
  end if;

  select role into v_target_role
    from public.profiles
   where id = p_user_id;

  if not found then
    raise exception 'Customer profile not found'
      using errcode = 'P0002', hint = 'ORD-009';
  end if;

  if v_target_role = 'admin' then
    raise exception 'Cannot anonymize an administrator account'
      using errcode = '42501', hint = 'ADM-001';
  end if;

  -- 3. Count customer orders for audit metadata
  select count(*) into v_orders_count
    from public.orders
   where user_id = p_user_id;

  -- 4. Anonymize profile personal data
  update public.profiles
     set full_name = 'عميل مجهول',
         phone = null,
         alt_phone = null,
         governorate_id = null,
         city = null,
         address = null,
         district = null,
         floor = null,
         apartment = null,
         landmark = null
   where id = p_user_id;

  -- 5. Anonymize personal delivery and contact info on all orders belonging to user
  -- Retains subtotal, total, shipping_fee, status, payment_status, payment_method, items, etc.
  update public.orders
     set ship_name = 'عميل مجهول',
         ship_phone = '00000000000',
         ship_alt_phone = null,
         ship_city = null,
         ship_district = null,
         ship_address = '[محذوف]',
         ship_floor = null,
         ship_apartment = null,
         ship_landmark = null,
         notes = null,
         payment_reference = null,
         payment_proof_path = null
   where user_id = p_user_id;

  -- 6. Delete personal customer favorites
  delete from public.favorites
   where user_id = p_user_id;

  -- 7. Audit the anonymization action (without logging personal details)
  perform public.audit_event(
    'CUSTOMER_ANONYMIZE',
    'profiles',
    p_user_id::text,
    jsonb_build_object('anonymized', false, 'orders_count', v_orders_count),
    jsonb_build_object('anonymized', true, 'orders_count', v_orders_count)
  );
end;
$$;

revoke all on function public.admin_anonymize_customer(uuid) from public, anon;
grant execute on function public.admin_anonymize_customer(uuid) to authenticated;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20261014230000_analytics_foundation.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- =====================================================================
-- 20261014230000_analytics_foundation.sql : T-9.01 Analytics database foundation
-- Scenario S31: analytics schema, restricted roles (analytics_reader, analytics_writer),
-- aggregate views (sales_daily, stock_daily), calendar, forecast tables,
-- forecast_accuracy view, and public admin functions.
-- =====================================================================

-- 1. Create analytics schema
create schema if not exists analytics;
alter schema analytics owner to postgres;

-- 2. Create restricted database roles (no login by default, granted in environments)
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'analytics_reader') then
    create role analytics_reader with nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'analytics_writer') then
    create role analytics_writer with nologin;
  end if;
end;
$$;

-- Allow postgres (superuser/test harness) to set role to analytics roles
grant analytics_reader, analytics_writer to postgres;

-- Revoke all permissions on analytics schema from public API roles
revoke all on schema analytics from public, anon, authenticated;
grant usage on schema analytics to analytics_reader, analytics_writer;

-- 3. Analytics Views (Aggregates with Zero Personal Data)

-- View 3.1: sales_daily
-- Aggregates non-cancelled orders with confirmed payment
create or replace view analytics.sales_daily as
select
  date_trunc('day', o.created_at)::date as day,
  oi.product_id,
  p.category_id,
  sum(oi.quantity)::integer as units,
  sum(oi.unit_price * oi.quantity)::numeric(12,2) as revenue,
  count(distinct o.id)::integer as orders,
  coalesce(round(avg(case when p.price > 0 and p.price > oi.unit_price then ((p.price - oi.unit_price) / p.price) * 100 else 0 end), 2), 0)::numeric(5,2) as avg_discount_pct
from public.orders o
join public.order_items oi on o.id = oi.order_id
join public.products p on oi.product_id = p.id
where o.status != 'cancelled'
  and (o.payment_status is null or o.payment_status != 'rejected')
  and (
    (o.payment_method = 'cod' and o.status in ('confirmed', 'shipped', 'delivered'))
    or (o.payment_method != 'cod' and o.payment_status = 'paid')
    or (o.payment_method is null and o.status in ('confirmed', 'shipped', 'delivered'))
  )
group by date_trunc('day', o.created_at)::date, oi.product_id, p.category_id;

alter view analytics.sales_daily owner to postgres;

-- View 3.2: stock_daily
-- Reconstructed closing stock and stockout flag from stock_movements
create or replace view analytics.stock_daily as
with ranked_movements as (
  select
    date_trunc('day', sm.at)::date as day,
    sm.product_id,
    sm.new_quantity as closing_stock,
    row_number() over (
      partition by date_trunc('day', sm.at)::date, sm.product_id
      order by sm.at desc, sm.id desc
    ) as rn
  from public.stock_movements sm
)
select
  day,
  product_id,
  closing_stock,
  (closing_stock <= 0) as stockout_flag
from ranked_movements
where rn = 1;

alter view analytics.stock_daily owner to postgres;

-- 4. Calendar Table
create table if not exists analytics.calendar (
  day            date primary key,
  ramadan        boolean not null default false,
  eid_fitr       boolean not null default false,
  eid_adha       boolean not null default false,
  mothers_day    boolean not null default false,
  valentines     boolean not null default false,
  black_friday   boolean not null default false,
  back_to_school boolean not null default false,
  weekday        smallint not null check (weekday between 0 and 6)
);

alter table analytics.calendar owner to postgres;
alter table analytics.calendar enable row level security;

-- Seed calendar dates for 2026-2028 with official Egyptian / Hijri events
insert into analytics.calendar (
  day, ramadan, eid_fitr, eid_adha, mothers_day, valentines, black_friday, back_to_school, weekday
)
select
  d::date as day,
  (
    (d::date between '2026-02-18' and '2026-03-19') or
    (d::date between '2027-02-08' and '2027-03-09') or
    (d::date between '2028-01-28' and '2028-02-26')
  ) as ramadan,
  (
    (d::date between '2026-03-20' and '2026-03-23') or
    (d::date between '2027-03-10' and '2027-03-13') or
    (d::date between '2028-02-27' and '2028-03-01')
  ) as eid_fitr,
  (
    (d::date between '2026-05-27' and '2026-05-30') or
    (d::date between '2027-05-16' and '2027-05-19') or
    (d::date between '2028-05-05' and '2028-05-08')
  ) as eid_adha,
  (extract(month from d) = 3 and extract(day from d) = 21) as mothers_day,
  (extract(month from d) = 2 and extract(day from d) = 14) as valentines,
  (extract(month from d) = 11 and extract(dow from d) = 5 and extract(day from d) >= 22) as black_friday,
  (extract(month from d) = 9 and extract(day from d) between 15 and 30) as back_to_school,
  extract(dow from d)::smallint as weekday
from generate_series('2026-01-01'::date, '2028-12-31'::date, '1 day'::interval) as s(d)
on conflict (day) do update set
  ramadan = excluded.ramadan,
  eid_fitr = excluded.eid_fitr,
  eid_adha = excluded.eid_adha,
  mothers_day = excluded.mothers_day,
  valentines = excluded.valentines,
  black_friday = excluded.black_friday,
  back_to_school = excluded.back_to_school,
  weekday = excluded.weekday;

-- 5. Forecast Pipeline Tables

-- Table 5.1: forecast_runs
create table if not exists analytics.forecast_runs (
  id            bigint generated always as identity primary key,
  run_at        timestamptz not null default now(),
  git_commit    text not null,
  model_version text not null default 'v1.0',
  input_hash    text not null,
  notes         jsonb default '{}'::jsonb,
  status        text not null default 'completed' check (status in ('running', 'completed', 'failed')),
  created_at    timestamptz not null default now()
);

alter table analytics.forecast_runs owner to postgres;
alter table analytics.forecast_runs enable row level security;
create index if not exists forecast_runs_run_at_idx on analytics.forecast_runs (run_at desc);

-- Table 5.2: sales_forecasts
create table if not exists analytics.sales_forecasts (
  id                bigint generated always as identity primary key,
  run_id            bigint not null references analytics.forecast_runs (id) on delete cascade,
  series_type       text not null check (series_type in ('shop', 'category', 'product')),
  series_id         bigint, -- null for shop, category_id for category, product_id for product
  forecast_date     date not null,
  horizon_step      integer not null check (horizon_step >= 1),
  predicted_units   numeric(10,2) not null check (predicted_units >= 0),
  predicted_revenue numeric(12,2) not null check (predicted_revenue >= 0),
  lower_80          numeric(10,2) not null check (lower_80 >= 0),
  upper_80          numeric(10,2) not null check (upper_80 >= lower_80),
  model_name        text not null,
  created_at        timestamptz not null default now(),
  constraint uq_sales_forecast unique (run_id, series_type, series_id, forecast_date)
);

alter table analytics.sales_forecasts owner to postgres;
alter table analytics.sales_forecasts enable row level security;
create index if not exists sales_forecasts_lookup_idx on analytics.sales_forecasts (run_id, series_type, series_id);
create index if not exists sales_forecasts_date_idx on analytics.sales_forecasts (forecast_date);

-- Table 5.3: forecast_metrics
create table if not exists analytics.forecast_metrics (
  id           bigint generated always as identity primary key,
  run_id       bigint not null references analytics.forecast_runs (id) on delete cascade,
  series_type  text not null check (series_type in ('shop', 'category', 'product')),
  series_id    bigint,
  model_name   text not null,
  fold         integer not null default 1,
  wape         numeric(8,4) not null,
  mase         numeric(8,4),
  pinball_loss numeric(8,4),
  bias         numeric(8,4),
  is_selected  boolean not null default false,
  created_at   timestamptz not null default now()
);

alter table analytics.forecast_metrics owner to postgres;
alter table analytics.forecast_metrics enable row level security;
create index if not exists forecast_metrics_run_idx on analytics.forecast_metrics (run_id, series_type, series_id);

-- Table 5.4: basket_pairs
create table if not exists analytics.basket_pairs (
  id            bigint generated always as identity primary key,
  product_a_id  bigint not null references public.products (id) on delete cascade,
  product_b_id  bigint not null references public.products (id) on delete cascade,
  support       numeric(6,4) not null check (support >= 0 and support <= 1),
  confidence    numeric(6,4) not null check (confidence >= 0 and confidence <= 1),
  lift          numeric(8,4) not null check (lift >= 0),
  sample_orders integer not null default 0,
  updated_at    timestamptz not null default now(),
  constraint check_distinct_products check (product_a_id < product_b_id),
  constraint uq_basket_pair unique (product_a_id, product_b_id)
);

alter table analytics.basket_pairs owner to postgres;
alter table analytics.basket_pairs enable row level security;

-- Table 5.5: cohort_retention
create table if not exists analytics.cohort_retention (
  id               bigint generated always as identity primary key,
  cohort_month     date not null,
  period_months    integer not null check (period_months >= 0),
  cohort_size      integer not null check (cohort_size >= 0),
  active_customers integer not null check (active_customers >= 0),
  retention_rate   numeric(6,4) not null check (retention_rate >= 0 and retention_rate <= 1),
  updated_at       timestamptz not null default now(),
  constraint uq_cohort_period unique (cohort_month, period_months)
);

alter table analytics.cohort_retention owner to postgres;
alter table analytics.cohort_retention enable row level security;

-- 6. Forecast Accuracy View
create or replace view analytics.forecast_accuracy as
select
  f.run_id,
  f.series_type,
  f.series_id,
  f.forecast_date,
  f.horizon_step,
  f.model_name,
  f.predicted_units,
  coalesce(actuals.units, 0) as actual_units,
  (f.predicted_units - coalesce(actuals.units, 0)) as unit_error,
  abs(f.predicted_units - coalesce(actuals.units, 0)) as absolute_error,
  f.predicted_revenue,
  coalesce(actuals.revenue, 0) as actual_revenue,
  (f.predicted_revenue - coalesce(actuals.revenue, 0)) as revenue_error,
  case
    when coalesce(actuals.units, 0) > 0 then
      abs(f.predicted_units - actuals.units) / actuals.units
    else null
  end as ape,
  (coalesce(actuals.units, 0) between f.lower_80 and f.upper_80) as in_interval_80
from analytics.sales_forecasts f
left join (
  select
    s.day,
    s.product_id as series_id,
    'product'::text as series_type,
    s.units,
    s.revenue
  from analytics.sales_daily s
  union all
  select
    s.day,
    s.category_id as series_id,
    'category'::text as series_type,
    sum(s.units)::integer as units,
    sum(s.revenue)::numeric(12,2) as revenue
  from analytics.sales_daily s
  group by s.day, s.category_id
  union all
  select
    s.day,
    null::bigint as series_id,
    'shop'::text as series_type,
    sum(s.units)::integer as units,
    sum(s.revenue)::numeric(12,2) as revenue
  from analytics.sales_daily s
  group by s.day
) actuals on f.series_type = actuals.series_type
         and (f.series_id = actuals.series_id or (f.series_id is null and actuals.series_id is null))
         and f.forecast_date = actuals.day;

alter view analytics.forecast_accuracy owner to postgres;

-- 7. Grant Explicit Permissions on Analytics Schema & Tables

-- Revoke all table/view privileges on schema analytics from public roles
revoke all on all tables in schema analytics from public, anon, authenticated;
revoke all on all functions in schema analytics from public, anon, authenticated;

-- analytics_reader permissions
grant select on analytics.sales_daily to analytics_reader;
grant select on analytics.stock_daily to analytics_reader;
grant select on analytics.calendar to analytics_reader;
grant select on analytics.forecast_runs to analytics_reader;
grant select on analytics.sales_forecasts to analytics_reader;
grant select on analytics.forecast_metrics to analytics_reader;
grant select on analytics.basket_pairs to analytics_reader;
grant select on analytics.cohort_retention to analytics_reader;
grant select on analytics.forecast_accuracy to analytics_reader;

-- analytics_writer permissions
grant select, insert, update, delete on analytics.forecast_runs to analytics_writer;
grant select, insert, update, delete on analytics.sales_forecasts to analytics_writer;
grant select, insert, update, delete on analytics.forecast_metrics to analytics_writer;
grant select, insert, update, delete on analytics.basket_pairs to analytics_writer;
grant select, insert, update, delete on analytics.cohort_retention to analytics_writer;
grant select on analytics.calendar to analytics_writer;
grant usage, select on all sequences in schema analytics to analytics_writer;

-- Row Level Security policies for analytics roles
create policy "analytics_reader_select_runs" on analytics.forecast_runs for select to analytics_reader using (true);
create policy "analytics_reader_select_forecasts" on analytics.sales_forecasts for select to analytics_reader using (true);
create policy "analytics_reader_select_metrics" on analytics.forecast_metrics for select to analytics_reader using (true);
create policy "analytics_reader_select_basket" on analytics.basket_pairs for select to analytics_reader using (true);
create policy "analytics_reader_select_cohort" on analytics.cohort_retention for select to analytics_reader using (true);
create policy "analytics_reader_select_calendar" on analytics.calendar for select to analytics_reader using (true);

create policy "analytics_writer_all_runs" on analytics.forecast_runs for all to analytics_writer using (true) with check (true);
create policy "analytics_writer_all_forecasts" on analytics.sales_forecasts for all to analytics_writer using (true) with check (true);
create policy "analytics_writer_all_metrics" on analytics.forecast_metrics for all to analytics_writer using (true) with check (true);
create policy "analytics_writer_all_basket" on analytics.basket_pairs for all to analytics_writer using (true) with check (true);
create policy "analytics_writer_all_cohort" on analytics.cohort_retention for all to analytics_writer using (true) with check (true);
create policy "analytics_writer_select_calendar" on analytics.calendar for select to analytics_writer using (true);

-- Ensure NO access to public tables for analytics roles (defense in depth)
revoke all on all tables in schema public from analytics_reader, analytics_writer;
revoke all on all functions in schema public from analytics_reader, analytics_writer;
revoke all on all sequences in schema public from analytics_reader, analytics_writer;

-- 8. Admin-Only Functions in Public Schema (Exposing Analytics to Admin at AAL2)

-- Function 8.1: admin_get_forecasts
create or replace function public.admin_get_forecasts(
  p_series_type text default 'shop',
  p_series_id bigint default null,
  p_run_id bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, analytics, pg_temp
as $$
declare
  v_run_id bigint;
  v_run_record record;
  v_forecasts jsonb;
  v_metrics jsonb;
begin
  perform public.require_admin();

  if p_run_id is not null then
    v_run_id := p_run_id;
  else
    select id into v_run_id
      from analytics.forecast_runs
     where status = 'completed'
     order by run_at desc
     limit 1;
  end if;

  if v_run_id is null then
    return jsonb_build_object(
      'status', 'no_data',
      'message', 'ANL-001: No forecast runs available'
    );
  end if;

  select id, run_at, git_commit, model_version, notes
    into v_run_record
    from analytics.forecast_runs
   where id = v_run_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'forecast_date', f.forecast_date,
      'horizon_step', f.horizon_step,
      'predicted_units', f.predicted_units,
      'predicted_revenue', f.predicted_revenue,
      'lower_80', f.lower_80,
      'upper_80', f.upper_80,
      'model_name', f.model_name
    ) order by f.forecast_date asc
  ), '[]'::jsonb)
    into v_forecasts
    from analytics.sales_forecasts f
   where f.run_id = v_run_id
     and f.series_type = p_series_type
     and (
       (p_series_type = 'shop' and f.series_id is null)
       or (p_series_type != 'shop' and f.series_id = p_series_id)
     );

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'model_name', m.model_name,
      'wape', m.wape,
      'mase', m.mase,
      'pinball_loss', m.pinball_loss,
      'bias', m.bias,
      'is_selected', m.is_selected
    )
  ), '[]'::jsonb)
    into v_metrics
    from analytics.forecast_metrics m
   where m.run_id = v_run_id
     and m.series_type = p_series_type
     and (
       (p_series_type = 'shop' and m.series_id is null)
       or (p_series_type != 'shop' and m.series_id = p_series_id)
     );

  return jsonb_build_object(
    'status', 'ok',
    'run', jsonb_build_object(
      'id', v_run_record.id,
      'run_at', v_run_record.run_at,
      'git_commit', v_run_record.git_commit,
      'model_version', v_run_record.model_version,
      'notes', v_run_record.notes
    ),
    'forecasts', v_forecasts,
    'metrics', v_metrics
  );
end;
$$;

-- Function 8.2: admin_get_reorder_list
create or replace function public.admin_get_reorder_list(
  p_lead_time_days integer default 7,
  p_service_z numeric default 1.28
)
returns jsonb
language plpgsql
security definer
set search_path = public, analytics, pg_temp
as $$
declare
  v_result jsonb;
begin
  perform public.require_admin();

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'product_id', p.id,
      'name', p.name,
      'name_ar', p.name_ar,
      'category_id', p.category_id,
      'stock_quantity', p.stock_quantity,
      'daily_forecast', coalesce(fc.daily_mean, 0),
      'days_of_cover', case
        when coalesce(fc.daily_mean, 0) > 0 then
          round((p.stock_quantity::numeric / fc.daily_mean), 1)
        else 999.0
      end,
      'reorder_point', round((coalesce(fc.daily_mean, 0) * p_lead_time_days + (p_service_z * coalesce(fc.daily_sigma, 1.0) * sqrt(p_lead_time_days)))::numeric, 1),
      'suggested_quantity', case
        when p.stock_quantity <= round((coalesce(fc.daily_mean, 0) * p_lead_time_days + (p_service_z * coalesce(fc.daily_sigma, 1.0) * sqrt(p_lead_time_days)))::numeric, 1) then
          greatest(1, ceil(((coalesce(fc.daily_mean, 0) * (p_lead_time_days + 7)) + (p_service_z * coalesce(fc.daily_sigma, 1.0) * sqrt(p_lead_time_days)) - p.stock_quantity)::numeric))::integer
        else 0
      end,
      'needs_reorder', (p.stock_quantity <= round((coalesce(fc.daily_mean, 0) * p_lead_time_days + (p_service_z * coalesce(fc.daily_sigma, 1.0) * sqrt(p_lead_time_days)))::numeric, 1))
    ) order by
      case when p.stock_quantity <= round((coalesce(fc.daily_mean, 0) * p_lead_time_days + (p_service_z * coalesce(fc.daily_sigma, 1.0) * sqrt(p_lead_time_days)))::numeric, 1) then 0 else 1 end,
      p.stock_quantity asc
  ), '[]'::jsonb)
  into v_result
  from public.products p
  left join (
    select
      f.series_id as product_id,
      avg(f.predicted_units)::numeric(10,2) as daily_mean,
      coalesce(stddev(f.predicted_units), 1.0)::numeric(10,2) as daily_sigma
    from analytics.sales_forecasts f
    where f.series_type = 'product'
      and f.run_id = (select id from analytics.forecast_runs where status = 'completed' order by run_at desc limit 1)
    group by f.series_id
  ) fc on p.id = fc.product_id
  where p.is_active = true;

  return v_result;
end;
$$;

-- Function 8.3: admin_get_analytics_insights
create or replace function public.admin_get_analytics_insights()
returns jsonb
language plpgsql
security definer
set search_path = public, analytics, pg_temp
as $$
declare
  v_basket jsonb;
  v_cohorts jsonb;
begin
  perform public.require_admin();

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'product_a_id', t.product_a_id,
      'product_a_name', t.name_a,
      'product_a_name_ar', t.name_ar_a,
      'product_b_id', t.product_b_id,
      'product_b_name', t.name_b,
      'product_b_name_ar', t.name_ar_b,
      'support', t.support,
      'confidence', t.confidence,
      'lift', t.lift,
      'sample_orders', t.sample_orders
    )
  ), '[]'::jsonb)
  into v_basket
  from (
    select
      b.product_a_id,
      pa.name as name_a,
      pa.name_ar as name_ar_a,
      b.product_b_id,
      pb.name as name_b,
      pb.name_ar as name_ar_b,
      b.support,
      b.confidence,
      b.lift,
      b.sample_orders
    from analytics.basket_pairs b
    join public.products pa on b.product_a_id = pa.id
    join public.products pb on b.product_b_id = pb.id
    order by b.lift desc
    limit 20
  ) t;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'cohort_month', c.cohort_month,
      'period_months', c.period_months,
      'cohort_size', c.cohort_size,
      'active_customers', c.active_customers,
      'retention_rate', c.retention_rate
    ) order by c.cohort_month desc, c.period_months asc
  ), '[]'::jsonb)
  into v_cohorts
  from analytics.cohort_retention c;

  return jsonb_build_object(
    'basket_pairs', v_basket,
    'cohorts', v_cohorts
  );
end;
$$;

-- Grants on Public Admin Functions
revoke all on function public.admin_get_forecasts(text, bigint, bigint) from public, anon;
grant execute on function public.admin_get_forecasts(text, bigint, bigint) to authenticated;

revoke all on function public.admin_get_reorder_list(integer, numeric) from public, anon;
grant execute on function public.admin_get_reorder_list(integer, numeric) to authenticated;

revoke all on function public.admin_get_analytics_insights() from public, anon;
grant execute on function public.admin_get_analytics_insights() to authenticated;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20261015140000_forecast_history_and_reorder.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- Migration: Enhance admin_get_forecasts with historical sales and admin_get_reorder_list with stock risk / dead stock

create or replace function public.admin_get_forecasts(
  p_series_type text default 'shop',
  p_series_id bigint default null,
  p_run_id bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, analytics, pg_temp
as $$
declare
  v_run_id bigint;
  v_run_record record;
  v_forecasts jsonb;
  v_metrics jsonb;
  v_history jsonb;
begin
  perform public.require_admin();

  if p_run_id is not null then
    v_run_id := p_run_id;
  else
    select id into v_run_id
      from analytics.forecast_runs
     where status = 'completed'
     order by run_at desc
     limit 1;
  end if;

  if v_run_id is null then
    return jsonb_build_object(
      'status', 'no_data',
      'message', 'ANL-001: No forecast runs available'
    );
  end if;

  select id, run_at, git_commit, model_version, notes
    into v_run_record
    from analytics.forecast_runs
   where id = v_run_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'forecast_date', f.forecast_date,
      'horizon_step', f.horizon_step,
      'predicted_units', f.predicted_units,
      'predicted_revenue', f.predicted_revenue,
      'lower_80', f.lower_80,
      'upper_80', f.upper_80,
      'model_name', f.model_name
    ) order by f.forecast_date asc
  ), '[]'::jsonb)
    into v_forecasts
    from analytics.sales_forecasts f
   where f.run_id = v_run_id
     and f.series_type = p_series_type
     and (
       (p_series_type = 'shop' and f.series_id is null)
       or (p_series_type != 'shop' and f.series_id = p_series_id)
     );

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'model_name', m.model_name,
      'wape', m.wape,
      'mase', m.mase,
      'pinball_loss', m.pinball_loss,
      'bias', m.bias,
      'is_selected', m.is_selected
    )
  ), '[]'::jsonb)
    into v_metrics
    from analytics.forecast_metrics m
   where m.run_id = v_run_id
     and m.series_type = p_series_type
     and (
       (p_series_type = 'shop' and m.series_id is null)
       or (p_series_type != 'shop' and m.series_id = p_series_id)
     );

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'day', s.day,
      'units', s.units,
      'revenue', s.revenue
    ) order by s.day asc
  ), '[]'::jsonb)
  into v_history
  from (
    select
      d.day,
      sum(d.units)::integer as units,
      sum(d.revenue)::numeric(12,2) as revenue
    from analytics.sales_daily d
    where (
      (p_series_type = 'shop')
      or (p_series_type = 'category' and d.category_id = p_series_id)
      or (p_series_type = 'product' and d.product_id = p_series_id)
    )
    and d.day >= (current_date - interval '56 days')
    group by d.day
    order by d.day asc
  ) s;

  return jsonb_build_object(
    'status', 'ok',
    'run', jsonb_build_object(
      'id', v_run_record.id,
      'run_at', v_run_record.run_at,
      'git_commit', v_run_record.git_commit,
      'model_version', v_run_record.model_version,
      'notes', v_run_record.notes
    ),
    'forecasts', v_forecasts,
    'metrics', v_metrics,
    'history', v_history
  );
end;
$$;

create or replace function public.admin_get_reorder_list(
  p_lead_time_days integer default 7,
  p_service_z numeric default 1.28
)
returns jsonb
language plpgsql
security definer
set search_path = public, analytics, pg_temp
as $$
declare
  v_result jsonb;
begin
  perform public.require_admin();

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'product_id', p.id,
      'name', p.name,
      'name_ar', p.name_ar,
      'category_id', p.category_id,
      'stock_quantity', p.stock_quantity,
      'daily_forecast', coalesce(fc.daily_mean, 0),
      'days_of_cover', case
        when coalesce(fc.daily_mean, 0) > 0 then
          round((p.stock_quantity::numeric / fc.daily_mean), 1)
        else 999.0
      end,
      'reorder_point', round((coalesce(fc.daily_mean, 0) * p_lead_time_days + (p_service_z * coalesce(fc.daily_sigma, 1.0) * sqrt(p_lead_time_days)))::numeric, 1),
      'suggested_quantity', case
        when p.stock_quantity <= round((coalesce(fc.daily_mean, 0) * p_lead_time_days + (p_service_z * coalesce(fc.daily_sigma, 1.0) * sqrt(p_lead_time_days)))::numeric, 1) then
          greatest(1, ceil(((coalesce(fc.daily_mean, 0) * (p_lead_time_days + 7)) + (p_service_z * coalesce(fc.daily_sigma, 1.0) * sqrt(p_lead_time_days)) - p.stock_quantity)::numeric))::integer
        else 0
      end,
      'needs_reorder', (p.stock_quantity <= round((coalesce(fc.daily_mean, 0) * p_lead_time_days + (p_service_z * coalesce(fc.daily_sigma, 1.0) * sqrt(p_lead_time_days)))::numeric, 1)),
      'days_since_last_sale', coalesce((current_date - last_s.last_sale_date), 999),
      'is_dead_stock', (coalesce((current_date - last_s.last_sale_date), 999) >= 60),
      'is_stock_risk', (p.stock_quantity > 0 and case when coalesce(fc.daily_mean, 0) > 0 then (p.stock_quantity::numeric / fc.daily_mean) <= 14 else false end)
    ) order by
      case when p.stock_quantity <= round((coalesce(fc.daily_mean, 0) * p_lead_time_days + (p_service_z * coalesce(fc.daily_sigma, 1.0) * sqrt(p_lead_time_days)))::numeric, 1) then 0 else 1 end,
      p.stock_quantity asc
  ), '[]'::jsonb)
  into v_result
  from public.products p
  left join (
    select
      f.series_id as product_id,
      avg(f.predicted_units)::numeric(10,2) as daily_mean,
      coalesce(stddev(f.predicted_units), 1.0)::numeric(10,2) as daily_sigma
    from analytics.sales_forecasts f
    where f.series_type = 'product'
      and f.run_id = (select id from analytics.forecast_runs where status = 'completed' order by run_at desc limit 1)
    group by f.series_id
  ) fc on p.id = fc.product_id
  left join (
    select
      oi.product_id,
      max(date_trunc('day', o.created_at)::date) as last_sale_date
    from public.order_items oi
    join public.orders o on oi.order_id = o.id
    where o.status != 'cancelled'
    group by oi.product_id
  ) last_s on p.id = last_s.product_id
  where p.is_active = true;

  return v_result;
end;
$$;

revoke all on function public.admin_get_forecasts(text, bigint, bigint) from public, anon;
grant execute on function public.admin_get_forecasts(text, bigint, bigint) to authenticated;

revoke all on function public.admin_get_reorder_list(integer, numeric) from public, anon;
grant execute on function public.admin_get_reorder_list(integer, numeric) to authenticated;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20261015160000_analytics_insights_and_views.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- Migration: 20261015160000_analytics_insights_and_views.sql
-- Description: Descriptive analyses, aggregate customer segments table, analytics SQL views, and comprehensive admin insights RPC (T-9.11)

-- 1. Customer Segments Table (RFM Aggregates with zero PII)
create table if not exists analytics.customer_segments (
  id               bigint generated always as identity primary key,
  segment          text not null check (segment in ('champions', 'loyal', 'promising', 'at_risk', 'lost', 'other')),
  customer_count   integer not null check (customer_count >= 0),
  total_revenue    numeric(12,2) not null check (total_revenue >= 0),
  avg_order_value  numeric(10,2) not null check (avg_order_value >= 0),
  updated_at       timestamptz not null default now(),
  constraint uq_customer_segment unique (segment)
);

alter table analytics.customer_segments owner to postgres;
alter table analytics.customer_segments enable row level security;
grant select on analytics.customer_segments to analytics_reader;
grant select, insert, update, delete on analytics.customer_segments to analytics_writer;

-- 2. Sales Overview View (7d and 28d moving averages)
create or replace view analytics.sales_overview as
with daily_totals as (
  select
    day,
    sum(units)::integer as units,
    sum(revenue)::numeric(12,2) as revenue
  from analytics.sales_daily
  group by day
),
moving_averages as (
  select
    day,
    units,
    revenue,
    round(avg(units) over (order by day rows between 6 preceding and current row), 2)::numeric(10,2) as units_ma7,
    round(avg(revenue) over (order by day rows between 6 preceding and current row), 2)::numeric(12,2) as revenue_ma7,
    round(avg(units) over (order by day rows between 27 preceding and current row), 2)::numeric(10,2) as units_ma28,
    round(avg(revenue) over (order by day rows between 27 preceding and current row), 2)::numeric(12,2) as revenue_ma28
  from daily_totals
)
select * from moving_averages;

alter view analytics.sales_overview owner to postgres;
grant select on analytics.sales_overview to analytics_reader;

-- 3. Product Performance View (ABC Revenue Share & XYZ Demand Variability)
create or replace view analytics.product_performance as
with product_rev as (
  select
    p.id as product_id,
    p.name,
    p.name_ar,
    p.category_id,
    coalesce(sum(sd.revenue), 0)::numeric(12,2) as total_revenue,
    coalesce(sum(sd.units), 0)::integer as total_units
  from public.products p
  left join analytics.sales_daily sd on p.id = sd.product_id
  where p.is_active = true
  group by p.id, p.name, p.name_ar, p.category_id
),
total_shop_rev as (
  select coalesce(sum(total_revenue), 0) as grand_total from product_rev
),
abc_calc as (
  select
    pr.*,
    case
      when tsr.grand_total > 0 then round((pr.total_revenue / tsr.grand_total * 100)::numeric, 2)
      else 0
    end as revenue_share_pct,
    case
      when tsr.grand_total > 0 then
        round((sum(pr.total_revenue) over (order by pr.total_revenue desc, pr.product_id asc) / tsr.grand_total * 100)::numeric, 2)
      else 100
    end as cum_revenue_pct
  from product_rev pr
  cross join total_shop_rev tsr
),
weekly_demand as (
  select
    oi.product_id,
    date_trunc('week', o.created_at)::date as week_start,
    sum(oi.quantity)::numeric as weekly_units
  from public.order_items oi
  join public.orders o on oi.order_id = o.id
  where o.status != 'cancelled'
  group by oi.product_id, date_trunc('week', o.created_at)::date
),
xyz_calc as (
  select
    product_id,
    avg(weekly_units) as mean_weekly,
    stddev(weekly_units) as std_weekly
  from weekly_demand
  group by product_id
)
select
  a.product_id,
  a.name,
  a.name_ar,
  a.category_id,
  a.total_revenue,
  a.total_units,
  a.revenue_share_pct,
  case
    when a.cum_revenue_pct <= 80.00 then 'A'
    when a.cum_revenue_pct <= 95.00 then 'B'
    else 'C'
  end as abc_class,
  case
    when coalesce(x.mean_weekly, 0) = 0 then 'Z'
    when (coalesce(x.std_weekly, 0) / x.mean_weekly) < 0.5 then 'X'
    when (coalesce(x.std_weekly, 0) / x.mean_weekly) <= 1.0 then 'Y'
    else 'Z'
  end as xyz_class,
  case
    when coalesce(x.mean_weekly, 0) > 0 then round((coalesce(x.std_weekly, 0) / x.mean_weekly)::numeric, 2)
    else null
  end as cv_demand
from abc_calc a
left join xyz_calc x on a.product_id = x.product_id;

alter view analytics.product_performance owner to postgres;
grant select on analytics.product_performance to analytics_reader;

-- 4. Discount Effect View
create or replace view analytics.discount_effect as
with weekly_discount as (
  select
    date_trunc('week', sd.day)::date as week_start,
    (avg(sd.avg_discount_pct) > 5.0) as is_discount_week,
    sum(sd.units)::numeric as units,
    sum(sd.revenue)::numeric as revenue
  from analytics.sales_daily sd
  group by date_trunc('week', sd.day)::date
),
stats as (
  select
    is_discount_week,
    count(*)::integer as weeks_count,
    round(avg(units)::numeric, 1) as avg_weekly_units,
    round(avg(revenue)::numeric, 2) as avg_weekly_revenue
  from weekly_discount
  group by is_discount_week
),
comp as (
  select
    disc.avg_weekly_units as promo_units,
    base.avg_weekly_units as regular_units,
    case
      when coalesce(base.avg_weekly_units, 0) > 0 then
        round((((disc.avg_weekly_units - base.avg_weekly_units) / base.avg_weekly_units) * 100)::numeric, 1)
      else 0
    end as unit_lift_pct
  from (select * from stats where is_discount_week = true) disc
  full outer join (select * from stats where is_discount_week = false) base on true
)
select
  coalesce(promo_units, 0)::numeric(10,1) as promo_weekly_units,
  coalesce(regular_units, 0)::numeric(10,1) as baseline_weekly_units,
  coalesce(unit_lift_pct, 0)::numeric(6,1) as uplift_pct,
  'هذا التحليل للمقارنة ولا يثبت علاقة سببية حتمية'::text as note_ar,
  'Correlation for comparison; not proof of cause'::text as note_en
from comp;

alter view analytics.discount_effect owner to postgres;
grant select on analytics.discount_effect to analytics_reader;

-- 5. Fulfilment Quality View
create or replace view analytics.fulfilment_quality as
with order_metrics as (
  select
    o.id,
    o.status,
    o.payment_method,
    o.payment_status,
    o.delivery_method,
    coalesce(nullif(o.ship_governorate, ''), 'القاهرة') as governorate,
    o.created_at,
    case
      when o.status = 'delivered' and o.created_at is not null then
        extract(epoch from (o.updated_at - o.created_at)) / 86400.0
      else null
    end as delivery_days,
    case
      when o.payment_method = 'instapay_qr' and o.payment_status = 'paid' and o.payment_submitted_at is not null and o.paid_at is not null then
        extract(epoch from (o.paid_at - o.payment_submitted_at)) / 3600.0
      else null
    end as proof_turnaround_hours
  from public.orders o
)
select
  count(*)::integer as total_orders,
  coalesce(round((count(*) filter (where status = 'cancelled')::numeric / nullif(count(*), 0) * 100), 1), 0)::numeric(5,1) as cancellation_rate_pct,
  coalesce(round((count(*) filter (where payment_status = 'rejected')::numeric / nullif(count(*), 0) * 100), 1), 0)::numeric(5,1) as refusal_rate_pct,
  coalesce(round((count(*) filter (where status = 'cancelled' and payment_status in ('unpaid', 'awaiting_proof'))::numeric / nullif(count(*), 0) * 100), 1), 0)::numeric(5,1) as expiry_rate_pct,
  round(coalesce(percentile_cont(0.5) within group (order by delivery_days), 0)::numeric, 1) as median_delivery_days,
  round(coalesce(avg(proof_turnaround_hours), 0)::numeric, 1) as avg_proof_hours
from order_metrics;

alter view analytics.fulfilment_quality owner to postgres;
grant select on analytics.fulfilment_quality to analytics_reader;

-- 6. Geography Distribution View (Privacy Rule: groups < 5 customers merged into 'أخرى')
create or replace view analytics.geography as
with gov_raw as (
  select
    coalesce(nullif(o.ship_governorate, ''), 'القاهرة') as governorate,
    count(distinct o.user_id)::integer as customer_count,
    count(o.id)::integer as orders_count,
    sum(o.total)::numeric(12,2) as total_revenue
  from public.orders o
  where o.status != 'cancelled'
  group by coalesce(nullif(o.ship_governorate, ''), 'القاهرة')
),
gov_anonymized as (
  select
    case when customer_count >= 5 then governorate else 'أخرى' end as governorate,
    customer_count,
    orders_count,
    total_revenue
  from gov_raw
)
select
  governorate,
  sum(customer_count)::integer as customer_count,
  sum(orders_count)::integer as orders_count,
  sum(total_revenue)::numeric(12,2) as total_revenue
from gov_anonymized
group by governorate
order by total_revenue desc;

alter view analytics.geography owner to postgres;
grant select on analytics.geography to analytics_reader;

-- 7. Updated admin_get_analytics_insights Function (AAL2 MFA Enforced)
create or replace function public.admin_get_analytics_insights()
returns jsonb
language plpgsql
security definer
set search_path = public, analytics, pg_temp
as $$
declare
  v_basket jsonb;
  v_cohorts jsonb;
  v_segments jsonb;
  v_sales_overview jsonb;
  v_product_perf jsonb;
  v_discount_effect jsonb;
  v_fulfilment jsonb;
  v_geography jsonb;
begin
  perform public.require_admin();

  -- 1. Basket Analysis Pairs
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'product_a_id', t.product_a_id,
      'product_a_name', t.name_a,
      'product_a_name_ar', t.name_ar_a,
      'product_b_id', t.product_b_id,
      'product_b_name', t.name_b,
      'product_b_name_ar', t.name_ar_b,
      'support', t.support,
      'confidence', t.confidence,
      'lift', t.lift,
      'sample_orders', t.sample_orders
    )
  ), '[]'::jsonb)
  into v_basket
  from (
    select
      b.product_a_id,
      pa.name as name_a,
      pa.name_ar as name_ar_a,
      b.product_b_id,
      pb.name as name_b,
      pb.name_ar as name_ar_b,
      b.support,
      b.confidence,
      b.lift,
      b.sample_orders
    from analytics.basket_pairs b
    join public.products pa on b.product_a_id = pa.id
    join public.products pb on b.product_b_id = pb.id
    order by b.lift desc
    limit 25
  ) t;

  -- 2. Cohort Retention Matrix
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'cohort_month', c.cohort_month,
      'period_months', c.period_months,
      'cohort_size', c.cohort_size,
      'active_customers', c.active_customers,
      'retention_rate', c.retention_rate
    ) order by c.cohort_month desc, c.period_months asc
  ), '[]'::jsonb)
  into v_cohorts
  from analytics.cohort_retention c;

  -- 3. Customer Segments (RFM)
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'segment', s.segment,
      'customer_count', s.customer_count,
      'total_revenue', s.total_revenue,
      'avg_order_value', s.avg_order_value
    ) order by s.total_revenue desc
  ), '[]'::jsonb)
  into v_segments
  from analytics.customer_segments s;

  -- 4. Sales Overview (Recent 28 days)
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'day', so.day,
      'units', so.units,
      'revenue', so.revenue,
      'units_ma7', so.units_ma7,
      'revenue_ma7', so.revenue_ma7,
      'units_ma28', so.units_ma28,
      'revenue_ma28', so.revenue_ma28
    ) order by so.day asc
  ), '[]'::jsonb)
  into v_sales_overview
  from (
    select * from analytics.sales_overview order by day desc limit 28
  ) so;

  -- 5. Product Performance (ABC / XYZ)
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'product_id', pp.product_id,
      'name', pp.name,
      'name_ar', pp.name_ar,
      'category_id', pp.category_id,
      'total_revenue', pp.total_revenue,
      'total_units', pp.total_units,
      'revenue_share_pct', pp.revenue_share_pct,
      'abc_class', pp.abc_class,
      'xyz_class', pp.xyz_class,
      'cv_demand', pp.cv_demand
    ) order by pp.total_revenue desc
  ), '[]'::jsonb)
  into v_product_perf
  from (
    select * from analytics.product_performance order by total_revenue desc limit 50
  ) pp;

  -- 6. Discount Effect
  select coalesce(
    jsonb_build_object(
      'promo_weekly_units', de.promo_weekly_units,
      'baseline_weekly_units', de.baseline_weekly_units,
      'uplift_pct', de.uplift_pct,
      'note_ar', de.note_ar,
      'note_en', de.note_en
    ),
    jsonb_build_object(
      'promo_weekly_units', 0,
      'baseline_weekly_units', 0,
      'uplift_pct', 0,
      'note_ar', 'هذا التحليل للمقارنة ولا يثبت علاقة سببية حتمية',
      'note_en', 'Correlation for comparison; not proof of cause'
    )
  )
  into v_discount_effect
  from analytics.discount_effect de
  limit 1;

  -- 7. Fulfilment Quality
  select coalesce(
    jsonb_build_object(
      'total_orders', fq.total_orders,
      'cancellation_rate_pct', fq.cancellation_rate_pct,
      'refusal_rate_pct', fq.refusal_rate_pct,
      'expiry_rate_pct', fq.expiry_rate_pct,
      'median_delivery_days', fq.median_delivery_days,
      'avg_proof_hours', fq.avg_proof_hours
    ),
    jsonb_build_object(
      'total_orders', 0,
      'cancellation_rate_pct', 0,
      'refusal_rate_pct', 0,
      'expiry_rate_pct', 0,
      'median_delivery_days', 0,
      'avg_proof_hours', 0
    )
  )
  into v_fulfilment
  from analytics.fulfilment_quality fq;

  -- 8. Geography Distribution
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'governorate', g.governorate,
      'customer_count', g.customer_count,
      'orders_count', g.orders_count,
      'total_revenue', g.total_revenue
    ) order by g.total_revenue desc
  ), '[]'::jsonb)
  into v_geography
  from analytics.geography g;

  return jsonb_build_object(
    'basket_pairs', v_basket,
    'cohorts', v_cohorts,
    'customer_segments', v_segments,
    'sales_overview', v_sales_overview,
    'product_performance', v_product_perf,
    'discount_effect', coalesce(v_discount_effect, '{}'::jsonb),
    'fulfilment_quality', coalesce(v_fulfilment, '{}'::jsonb),
    'geography', v_geography
  );
end;
$$;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20261015180000_product_reviews_and_moderation.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- =====================================================================
-- 20261015180000_product_reviews_and_moderation.sql
-- Product Reviews, 5-Star Rating, Profanity Detector & Ban Controls
-- =====================================================================

-- 1. Profiles ban columns
alter table public.profiles
  add column if not exists is_banned boolean not null default false,
  add column if not exists banned_at timestamptz,
  add column if not exists banned_reason text;

-- 2. Orders ban guard trigger: banned users cannot place orders
create or replace function public.check_user_not_banned()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.profiles where id = new.user_id and is_banned = true) then
    raise exception 'USR-004: Your account has been suspended.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists orders_ban_guard on public.orders;
create trigger orders_ban_guard
  before insert on public.orders
  for each row
  execute function public.check_user_not_banned();

-- 3. Product Reviews table
create table if not exists public.product_reviews (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text not null check (char_length(trim(comment)) > 0 and char_length(comment) <= 1000),
  is_verified_purchase boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, user_id)
);

create index if not exists product_reviews_product_idx
  on public.product_reviews (product_id, created_at desc);
create index if not exists product_reviews_user_idx
  on public.product_reviews (user_id);

alter table public.product_reviews enable row level security;

-- Authenticated users can view reviews for active products
create policy product_reviews_select_auth on public.product_reviews
  for select
  to authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_reviews.product_id and p.is_active = true
    )
  );

-- Revoke direct mutation grants; interactions go through guarded RPC
revoke insert, update, delete on public.product_reviews from public, anon, authenticated;
grant select on public.product_reviews to authenticated;

-- 4. Text Normalization for Content Moderation
create or replace function public.normalize_review_text(p_text text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_res text;
begin
  if p_text is null then
    return '';
  end if;
  v_res := lower(p_text);
  -- Remove Arabic diacritics / tashkeel
  v_res := regexp_replace(v_res, '[\u064B-\u065F\u0670]', '', 'g');
  -- Normalize alef forms (أ, إ, آ -> ا)
  v_res := regexp_replace(v_res, '[إأآا]', 'ا', 'g');
  -- Normalize yaa forms (ى -> ي)
  v_res := regexp_replace(v_res, '[ىي]', 'ي', 'g');
  -- Normalize taa marbuta (ة -> ه)
  v_res := regexp_replace(v_res, '[ةه]', 'ه', 'g');
  -- Remove punctuation and symbols except whitespace
  v_res := regexp_replace(v_res, '[^\w\s\u0600-\u06FF]', ' ', 'g');
  -- Collapse repeated adjacent characters (e.g. كككككس -> كس)
  v_res := regexp_replace(v_res, '(.)\1+', '\1', 'g');
  -- Collapse consecutive whitespace
  v_res := regexp_replace(v_res, '\s+', ' ', 'g');
  return trim(v_res);
end;
$$;

-- 5. Profanity detector: checks both Arabic vulgarities and English curse words
create or replace function public.contains_review_profanity(p_text text)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  v_norm text;
  v_pattern text;
begin
  if p_text is null or char_length(trim(p_text)) = 0 then
    return false;
  end if;

  v_norm := public.normalize_review_text(p_text);

  -- Regex pattern covering English and Arabic vulgarities / curse words / slurs
  v_pattern := '(\y(fuck|fucking|shit|bitch|asshole|bastard|dick|cunt|pussy|whore|slut|faggot|nigger|cock|motherfucker)\y)|' ||
               '(\m(شرموط|منيوك|كس|طيز|خول|عرص|زب|قحب|نيك|عاهر|ديوث|وسخ|كلب|حمار|سافل|حقير)\M)';

  return v_norm ~* v_pattern;
end;
$$;

-- 6. Mask Profanities Helper
create or replace function public.mask_review_profanity(p_text text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_res text;
begin
  if p_text is null then
    return '';
  end if;
  v_res := p_text;
  v_res := regexp_replace(v_res, '\y(fuck|fucking|shit|bitch|asshole|bastard|dick|cunt|pussy|whore|slut|faggot|nigger|cock|motherfucker)\y', '***', 'gi');
  v_res := regexp_replace(v_res, '\m(شرموط[ةه]?|منيوك|كس|طيز|خول|عرص|زب|قحب[ةه]?|نيك|عاهر[ةه]?|ديوث)\M', '***', 'gi');
  return v_res;
end;
$$;

-- 7. Submit Product Review RPC (with verification & automated ban on curse words)
create or replace function public.submit_product_review(
  p_product_id bigint,
  p_rating smallint,
  p_comment text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_is_banned boolean;
  v_review_id bigint;
  v_clean_comment text;
  v_created_at timestamptz;
begin
  -- A. Authentication required
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'AUTH-001: Authentication required.' using errcode = 'P0001';
  end if;

  -- B. Check if user is currently banned
  select is_banned into v_is_banned
  from public.profiles
  where id = v_user_id;

  if coalesce(v_is_banned, false) = true then
    raise exception 'REV-001: Your account has been suspended.' using errcode = 'P0001';
  end if;

  -- C. Validate rating bounds
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'REV-004: Rating must be between 1 and 5 stars.' using errcode = 'P0001';
  end if;

  -- D. Validate comment length
  v_clean_comment := trim(coalesce(p_comment, ''));
  if char_length(v_clean_comment) = 0 or char_length(v_clean_comment) > 1000 then
    raise exception 'REV-005: Review comment must be between 1 and 1000 characters.' using errcode = 'P0001';
  end if;

  -- E. Profanity Check: if curse words detected, ban user immediately and reject review!
  if public.contains_review_profanity(v_clean_comment) then
    -- Ban user immediately
    update public.profiles
    set is_banned = true,
        banned_at = now(),
        banned_reason = 'Profanity detected in product review submission'
    where id = v_user_id;

    -- Log moderation action to audit_log
    insert into public.audit_log (
      actor_id,
      actor_role,
      entity,
      entity_id,
      action,
      diff
    ) values (
      v_user_id,
      'customer',
      'user',
      v_user_id::text,
      'USER_BANNED_PROFANITY',
      jsonb_build_object(
        'reason', 'Profanity detected in product review',
        'product_id', p_product_id
      )
    );

    raise exception 'REV-003: Review rejected due to inappropriate language. Your account has been suspended.' using errcode = 'P0001';
  end if;

  -- F. Verified Purchase Check: User must have purchased this product
  if not exists (
    select 1
    from public.orders o
    join public.order_items oi on oi.order_id = o.id
    where o.user_id = v_user_id
      and oi.product_id = p_product_id
      and o.status not in ('cancelled')
  ) then
    raise exception 'REV-002: You must purchase this product before writing a review.' using errcode = 'P0001';
  end if;

  -- G. Upsert review
  insert into public.product_reviews (
    product_id,
    user_id,
    rating,
    comment,
    is_verified_purchase,
    updated_at
  ) values (
    p_product_id,
    v_user_id,
    p_rating,
    v_clean_comment,
    true,
    now()
  )
  on conflict (product_id, user_id) do update set
    rating = excluded.rating,
    comment = excluded.comment,
    updated_at = now()
  returning id, created_at into v_review_id, v_created_at;

  return jsonb_build_object(
    'review_id', v_review_id,
    'product_id', p_product_id,
    'rating', p_rating,
    'comment', v_clean_comment,
    'created_at', v_created_at,
    'status', 'published'
  );
end;
$$;

-- 8. Get Product Reviews RPC (Safe for anon & authenticated)
create or replace function public.get_product_reviews(p_product_id bigint)
returns table (
  id bigint,
  product_id bigint,
  rating smallint,
  comment text,
  reviewer_name text,
  is_verified_purchase boolean,
  is_own boolean,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pr.id,
    pr.product_id,
    pr.rating,
    pr.comment,
    case
      when length(coalesce(p.full_name, '')) > 0
        then substring(trim(p.full_name) from 1 for 1) || '***'
      else 'عميل موثق'
    end as reviewer_name,
    pr.is_verified_purchase,
    (auth.uid() is not null and pr.user_id = auth.uid()) as is_own,
    pr.created_at
  from public.product_reviews pr
  join public.profiles p on p.id = pr.user_id
  join public.products prod on prod.id = pr.product_id
  where pr.product_id = p_product_id
    and prod.is_active = true
  order by (auth.uid() is not null and pr.user_id = auth.uid()) desc, pr.created_at desc;
$$;

-- 9. Get Review Summary Stats RPC
create or replace function public.get_product_review_summary(p_product_id bigint)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_avg numeric(3,2);
  v_c1 integer;
  v_c2 integer;
  v_c3 integer;
  v_c4 integer;
  v_c5 integer;
begin
  select
    count(*),
    coalesce(round(avg(rating)::numeric, 2), 0.00),
    count(*) filter (where rating = 1),
    count(*) filter (where rating = 2),
    count(*) filter (where rating = 3),
    count(*) filter (where rating = 4),
    count(*) filter (where rating = 5)
  into v_count, v_avg, v_c1, v_c2, v_c3, v_c4, v_c5
  from public.product_reviews
  where product_id = p_product_id;

  return jsonb_build_object(
    'review_count', v_count,
    'average_rating', v_avg,
    'distribution', jsonb_build_object(
      '1', v_c1,
      '2', v_c2,
      '3', v_c3,
      '4', v_c4,
      '5', v_c5
    )
  );
end;
$$;

-- 10. Check User Eligibility RPC
create or replace function public.check_user_review_eligibility(p_product_id bigint)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_is_banned boolean;
  v_has_purchased boolean;
  v_existing_review jsonb;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object(
      'is_authenticated', false,
      'is_banned', false,
      'has_purchased', false,
      'existing_review', null
    );
  end if;

  select is_banned into v_is_banned
  from public.profiles
  where id = v_user_id;

  v_has_purchased := exists (
    select 1
    from public.orders o
    join public.order_items oi on oi.order_id = o.id
    where o.user_id = v_user_id
      and oi.product_id = p_product_id
      and o.status not in ('cancelled')
  );

  select jsonb_build_object(
    'id', id,
    'rating', rating,
    'comment', comment,
    'created_at', created_at
  ) into v_existing_review
  from public.product_reviews
  where product_id = p_product_id and user_id = v_user_id;

  return jsonb_build_object(
    'is_authenticated', true,
    'is_banned', coalesce(v_is_banned, false),
    'has_purchased', v_has_purchased,
    'existing_review', v_existing_review
  );
end;
$$;

-- 11. Explicit function grants
grant execute on function public.normalize_review_text(text) to anon, authenticated;
grant execute on function public.contains_review_profanity(text) to anon, authenticated;
grant execute on function public.mask_review_profanity(text) to anon, authenticated;
grant execute on function public.get_product_reviews(bigint) to anon, authenticated;
grant execute on function public.get_product_review_summary(bigint) to anon, authenticated;
grant execute on function public.check_user_review_eligibility(bigint) to anon, authenticated;
grant execute on function public.submit_product_review(bigint, smallint, text) to authenticated;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20261016010000_product_id_cascade_and_quick_edit.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- =====================================================================
-- 20261016010000_product_id_cascade_and_quick_edit.sql
-- Enables admin product ID modification, cascade propagation, and quick editing
-- =====================================================================

-- 1. Change public.products.id from GENERATED ALWAYS to GENERATED BY DEFAULT
-- This permits explicit ID assignment and updates while maintaining auto-increment
alter table public.products alter column id set generated by default;

-- 2. Update all foreign keys referencing public.products(id) to ON UPDATE CASCADE
-- so that updating a product's ID safely cascades across orders, carts, favorites,
-- stock history, reviews, and analytics.

-- 2.1 order_items
alter table public.order_items drop constraint if exists order_items_product_id_fkey;
alter table public.order_items add constraint order_items_product_id_fkey
  foreign key (product_id) references public.products (id)
  on delete restrict on update cascade;


-- 2.3 favorites
alter table public.favorites drop constraint if exists favorites_product_id_fkey;
alter table public.favorites add constraint favorites_product_id_fkey
  foreign key (product_id) references public.products (id)
  on delete cascade on update cascade;

-- 2.4 stock_movements
alter table public.stock_movements drop constraint if exists stock_movements_product_id_fkey;
alter table public.stock_movements add constraint stock_movements_product_id_fkey
  foreign key (product_id) references public.products (id)
  on delete cascade on update cascade;

-- 2.5 product_reviews
alter table public.product_reviews drop constraint if exists product_reviews_product_id_fkey;
alter table public.product_reviews add constraint product_reviews_product_id_fkey
  foreign key (product_id) references public.products (id)
  on delete cascade on update cascade;

-- 2.6 analytics.basket_pairs
alter table analytics.basket_pairs drop constraint if exists basket_pairs_product_a_id_fkey;
alter table analytics.basket_pairs add constraint basket_pairs_product_a_id_fkey
  foreign key (product_a_id) references public.products (id)
  on delete cascade on update cascade;

alter table analytics.basket_pairs drop constraint if exists basket_pairs_product_b_id_fkey;
alter table analytics.basket_pairs add constraint basket_pairs_product_b_id_fkey
  foreign key (product_b_id) references public.products (id)
  on delete cascade on update cascade;

-- 3. Dedicated Admin RPC to update product ID with sequence alignment and audit logging
create or replace function public.admin_update_product_id(
  p_old_id bigint,
  p_new_id bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exists boolean;
begin
  perform public.require_admin();

  if p_new_id is null or p_new_id <= 0 then
    raise exception 'Invalid product ID'
      using errcode = '22023', hint = 'PRD-001';
  end if;

  if p_old_id = p_new_id then
    return;
  end if;

  select exists(select 1 from public.products where id = p_old_id) into v_exists;
  if not v_exists then
    raise exception 'Product not found'
      using errcode = 'P0002', hint = 'ORD-008';
  end if;

  if exists(select 1 from public.products where id = p_new_id) then
    raise exception 'Product ID already in use'
      using errcode = '23505', hint = 'PRD-002';
  end if;

  -- 1. Update the product ID in public.products.
  -- The ON UPDATE CASCADE constraints propagate this ID update to:
  -- order_items, cart_items, favorites, stock_movements, product_reviews, analytics.basket_pairs.
  update public.products set id = p_new_id where id = p_old_id;

  -- 2. Keep the identity sequence aligned so future inserts do not collide
  perform setval(
    pg_get_serial_sequence('public.products', 'id'),
    greatest((select coalesce(max(id), 1) from public.products), p_new_id)
  );

  -- 3. Audit trail
  perform public.audit_event(
    'PRODUCT_ID_UPDATED',
    'product',
    p_new_id::text,
    jsonb_build_object('id', p_old_id),
    jsonb_build_object('id', p_new_id)
  );
end;
$$;

revoke all on function public.admin_update_product_id(bigint, bigint) from public, anon;
grant execute on function public.admin_update_product_id(bigint, bigint) to authenticated;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20261016020000_handle_new_user_idempotent.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- Migration: handle_new_user idempotent insert + profile backfill
-- Purpose:
--   1. Replace the plain INSERT in handle_new_user with ON CONFLICT (id) DO NOTHING
--      so that re-registration of an already-authenticated user (e.g. after a public
--      schema reset that wiped public.profiles but left auth.users intact) no longer
--      raises a duplicate-key error or silently drops the profile row.
--   2. Backfill any auth.users rows that exist but are missing a public.profiles row
--      (happens when public schema was dropped/recreated while auth schema was kept).

-- 1. Harden handle_new_user with ON CONFLICT DO NOTHING
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
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Re-apply existing security grants (append-only; do not remove prior revokes)
revoke all on function public.handle_new_user() from public, anon, authenticated, service_role;

-- 2. Backfill: insert a profile row for every auth user that lacks one.
--    Sets role to 'customer' by default; the owner can promote admins separately.
insert into public.profiles (id, full_name, phone)
select
  u.id,
  substring(coalesce(u.raw_user_meta_data ->> 'full_name', '') from 1 for 100),
  substring(u.raw_user_meta_data ->> 'phone' from 1 for 20)
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;


-- =====================================================================
-- PART 2: STORE POLICIES & INITIAL SEEDING
-- =====================================================================

-- 1. Postal Mail Delivery (Egypt Post ONLY for all 27 governorates)
-- Delivery is strictly through Egypt Post (Postal Code / البريد المصري).
insert into public.delivery_fees (governorate_id, method, fee)
select id, 'egypt_post', 50.00
from public.governorates
on conflict (governorate_id, method) do update set fee = excluded.fee;

-- Ensure courier/representative delivery is completely removed
delete from public.delivery_fees where method = 'representative';

-- 2. Payment Method (InstaPay ONLY - Cash on Delivery disabled)
update public.shop_settings
set value = '["instapay_qr"]'::jsonb
where key = 'payment_methods_enabled';

-- 3. Initial Categories (Bilingual: English + Arabic)
insert into public.categories (name, name_ar, slug, sort_order)
values
  ('Earrings',  'أقراط',  'earrings',  1),
  ('Chains',    'سلاسل',  'chains',    2),
  ('Rings',     'خواتم',  'rings',     3),
  ('Bracelets', 'أساور',  'bracelets', 4)
on conflict (slug) do update set
  name = excluded.name,
  name_ar = excluded.name_ar,
  sort_order = excluded.sort_order;

-- 4. Initial Sample Products
insert into public.products
  (category_id, name, name_ar, price, discount_percent, stock_quantity, is_active)
select c.id, v.name, v.name_ar, v.price, v.discount, v.stock, true
  from (values
    ('earrings',  'Pearl drop earrings',  'أقراط لؤلؤ متدلية',    250, 50, 12),
    ('earrings',  'Gold hoop earrings',   'أقراط حلقية ذهبية',    400, 0,  5),
    ('chains',    'Thin gold chain',      'سلسلة ذهبية رقيقة',    650, 20, 8),
    ('chains',    'Layered silver chain', 'سلسلة فضية متعددة',    520, 0,  10),
    ('rings',     'Stackable ring set',   'طقم خواتم متناسقة',    300, 50, 15),
    ('bracelets', 'Charm bracelet',       'سوار دلايات أنيق',     350, 10, 6)
  ) as v(slug, name, name_ar, price, discount, stock)
  join public.categories c on c.slug = v.slug
where not exists (
  select 1 from public.products p where p.name = v.name and p.category_id = c.id
);

-- 5. Backfill any existing auth users into public.profiles
insert into public.profiles (id, full_name, role)
select id, coalesce(raw_user_meta_data->>'full_name', ''), 'customer'::public.user_role
from auth.users
on conflict (id) do nothing;

-- =====================================================================
-- PART 3: ADMIN ACCOUNT PROMOTION (RUN AFTER YOU SIGN UP)
-- =====================================================================
-- 1. Sign up on the live website or in Supabase Auth (Authentication -> Users -> Add User).
-- 2. Replace 'YOUR_EMAIL@EXAMPLE.COM' with your email and run this query:
--
-- update public.profiles
--    set role = 'admin'
--  where id = (select id from auth.users where email = 'YOUR_EMAIL@EXAMPLE.COM');
--
-- 3. Once promoted, visit /account/security to set up your 2FA authenticator app.
-- 4. Log in to /admin to manage orders, products, and categories.

-- Accessories store: complete schema (files 01-06, in order).
-- Tested on PostgreSQL 16 with stand-ins for Supabase auth/storage.
-- File 06 (storage) works only on Supabase.

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

-- =====================================================================
-- 05_seed.sql : starter data
-- Part A is required. Part B is demo data - delete it before launch.
-- =====================================================================

-- ---------- Part A (required): Egypt's 27 governorates ----------
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

-- Delivery fees are deliberately NOT seeded: no row means "not available",
-- so the shop cannot accidentally ship for free. Add real fees in the admin
-- screen, or in SQL, for example (replace the numbers with your own):
--   insert into public.delivery_fees (governorate_id, method, fee)
--   select id, 'egypt_post', 60 from public.governorates;
--   insert into public.delivery_fees (governorate_id, method, fee)
--   values (3, 'representative', 40);   -- representative: Alexandria only

-- ---------- Part B (optional): demo catalogue ----------
insert into public.categories (name, name_ar, slug, sort_order) values
  ('Earrings',  'أقراط',  'earrings',  1),
  ('Chains',    'سلاسل',  'chains',    2),
  ('Rings',     'خواتم',  'rings',     3),
  ('Bracelets', 'أساور',  'bracelets', 4);

insert into public.products
  (category_id, name, price, discount_percent, stock_quantity)
select c.id, v.name, v.price, v.discount, v.stock
  from (values
    (1, 'earrings',  'Pearl drop earrings',   250, 50, 12),
    (2, 'earrings',  'Gold hoop earrings',    400, 0,  5),
    (3, 'chains',    'Thin gold chain',       650, 20, 8),
    (4, 'chains',    'Layered silver chain',  520, 0,  0),
    (5, 'rings',     'Stackable ring set',    300, 50, 15),
    (6, 'bracelets', 'Charm bracelet',        350, 10, 6)
  ) as v(ord, slug, name, price, discount, stock)
  join public.categories c on c.slug = v.slug
 order by v.ord;

-- ---------- Your first admin ----------
-- 1) Sign up on the website with your own email.
-- 2) Run this once in the Supabase SQL editor (it runs as the owner, so the
--    column restrictions for website users do not apply):
--   update public.profiles
--      set role = 'admin'
--    where id = (select id from auth.users where email = 'you@example.com');

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


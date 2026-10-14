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

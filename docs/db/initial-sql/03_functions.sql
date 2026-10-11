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


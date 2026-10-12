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

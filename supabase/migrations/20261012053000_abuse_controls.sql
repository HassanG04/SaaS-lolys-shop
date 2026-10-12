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

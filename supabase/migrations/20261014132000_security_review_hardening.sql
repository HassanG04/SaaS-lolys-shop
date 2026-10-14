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


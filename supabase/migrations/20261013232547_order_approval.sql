-- T-1.23: owner-approved approve-first InstaPay and atomic saved address.
-- Existing orders retain their payment state and deadlines.
alter table public.orders add column approval_note text
  constraint orders_approval_note_length check (char_length(approval_note) <= 500);

insert into public.shop_settings (key, value, is_public) values
  ('require_order_approval', 'true'::jsonb, true),
  ('approval_window_hours', '24'::jsonb, false);
update public.shop_settings set is_public = false
 where key in ('instapay_qr_path', 'instapay_handle');

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
      if jsonb_typeof(p_value) is distinct from 'number' then
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

    when 'require_order_approval' then
      if jsonb_typeof(p_value) is distinct from 'boolean' then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;

    when 'payment_window_hours', 'approval_window_hours' then
      if jsonb_typeof(p_value) is distinct from 'number' then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;
      v_num := (p_value #>> '{}')::numeric;
      if v_num <> trunc(v_num) or v_num < 1 or v_num > 72 then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;

    when 'pending_order_limit' then
      if jsonb_typeof(p_value) is distinct from 'number' then
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
  v_require_approval boolean;
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

  -- Save-address input is optional for legacy callers, but must be boolean.
  if p_ship ? 'save_address' and jsonb_typeof(p_ship -> 'save_address') is distinct from 'boolean' then
    raise exception 'Invalid save address option' using errcode = '22023', hint = 'ORD-012';
  end if;

  select (value #>> '{}')::boolean into v_require_approval
    from public.shop_settings where key = 'require_order_approval';

  -- 9. Payment status & deadline
  if p_payment_method::text = 'cod' then
    v_payment_status := 'unpaid';
    v_deadline := null;
  elsif coalesce(v_require_approval, true) then
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

  -- Atomic with the order: a failed checkout never changes the saved address.
  update public.profiles
     set full_name = v_ship_name, phone = v_ship_phone, alt_phone = v_ship_alt_phone,
         governorate_id = v_gov_id, city = v_ship_city, district = v_ship_district,
         address = v_ship_address, floor = v_ship_floor,
         apartment = v_ship_apartment, landmark = v_ship_landmark
   where id = v_user_id
     and (nullif(trim(address), '') is null or governorate_id is null
          or coalesce((p_ship ->> 'save_address')::boolean, true));

  return v_order_id;
end;
$$;

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

  if new.payment_method = 'instapay_qr'
     and new.status in ('shipped', 'delivered') and new.payment_status <> 'paid' then
    raise exception 'Payment must be confirmed before shipping'
      using errcode = '22023', hint = 'ORD-015';
  end if;

  -- Direct status edits cannot bypass the approval RPC and its payment deadline.
  if new.payment_status = 'awaiting_approval' and new.status not in ('pending', 'cancelled') then
    raise exception 'Order is awaiting approval' using errcode = '22023', hint = 'PAY-007';
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
  v_order_status   public.order_status;
  v_expected_prefix text;
begin
  if v_uid is null then
    raise exception 'Authentication required'
      using errcode = '42501', hint = 'AUTH-004';
  end if;

  perform public.check_rate_limit('submit_payment_proof', 10, interval '1 minute');

  select user_id, payment_method, payment_status, payment_deadline, status
    into v_order_uid, v_method, v_status, v_deadline, v_order_status
    from public.orders
   where id = p_order_id for update;

  if v_order_uid is null or v_order_uid <> v_uid then
    raise exception 'Not owner of order'
      using errcode = '42501', hint = 'ORD-009';
  end if;

  if v_method::text <> 'instapay_qr' then
    raise exception 'Wrong payment method'
      using errcode = '22023', hint = 'PAY-004';
  end if;

  if v_order_status not in ('pending', 'confirmed') then
    raise exception 'Order is not awaiting proof' using errcode = '22023', hint = 'PAY-004';
  end if;
  if v_status = 'awaiting_approval' then
    raise exception 'Order is awaiting approval' using errcode = '22023', hint = 'PAY-007';
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
  v_order_status public.order_status;
begin
  perform public.require_admin();

  select payment_status, status into v_status, v_order_status
    from public.orders
   where id = p_order_id for update;

  if v_status is null then
    raise exception 'Order not found' using errcode = 'P0002', hint = 'PAY-004';
  end if;

  if v_status = 'paid' then
    raise exception 'Order is already paid' using errcode = '22023', hint = 'PAY-002';
  end if;

  if v_status <> 'under_review' or v_order_status not in ('pending', 'confirmed') then
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

create or replace function public.admin_approve_order(p_order_id bigint, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_approval_hours integer;
  v_payment_hours integer;
begin
  perform public.require_admin();
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.payment_method <> 'instapay_qr'
     or v_order.payment_status <> 'awaiting_approval' or v_order.status <> 'pending' then
    raise exception 'Order is not awaiting approval' using errcode = '22023', hint = 'PAY-004';
  end if;
  select (value #>> '{}')::integer into v_approval_hours from public.shop_settings where key = 'approval_window_hours';
  if v_order.created_at + make_interval(hours => coalesce(v_approval_hours, 24)) <= now() then
    raise exception 'Approval window expired' using errcode = '22023', hint = 'PAY-008';
  end if;
  if char_length(p_note) > 500 then
    raise exception 'Invalid approval note' using errcode = '22023', hint = 'ADM-007';
  end if;
  select (value #>> '{}')::integer into v_payment_hours from public.shop_settings where key = 'payment_window_hours';
  update public.orders set status = 'confirmed', payment_status = 'awaiting_proof',
    payment_deadline = now() + make_interval(hours => coalesce(v_payment_hours, 24)),
    approval_note = nullif(trim(p_note), '') where id = p_order_id;
  perform public.audit_event('ORDER_APPROVAL', 'orders', p_order_id::text,
    jsonb_build_object('payment_status', v_order.payment_status),
    jsonb_build_object('approved', true, 'note', p_note));
end;
$$;

create or replace function public.admin_reject_order(p_order_id bigint, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  perform public.require_admin();
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.payment_method <> 'instapay_qr'
     or v_order.payment_status <> 'awaiting_approval' or v_order.status <> 'pending' then
    raise exception 'Order is not awaiting approval' using errcode = '22023', hint = 'PAY-004';
  end if;
  if nullif(trim(p_reason), '') is null or char_length(p_reason) > 500 then
    raise exception 'Rejection reason required' using errcode = '22023', hint = 'ADM-007';
  end if;
  update public.orders set status = 'cancelled', approval_note = trim(p_reason) where id = p_order_id;
  perform public.audit_event('ORDER_APPROVAL', 'orders', p_order_id::text,
    jsonb_build_object('payment_status', v_order.payment_status),
    jsonb_build_object('approved', false, 'reason', trim(p_reason)));
end;
$$;

create or replace function public.get_payment_instructions(p_order_id bigint)
returns table(qr_path text, instapay_handle text, amount numeric, deadline timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501', hint = 'AUTH-004';
  end if;
  select * into v_order from public.orders where id = p_order_id;
  if not found or v_order.user_id <> auth.uid() then
    raise exception 'Not owner of order' using errcode = '42501', hint = 'ORD-009';
  end if;
  if v_order.status not in ('pending', 'confirmed') or v_order.payment_method <> 'instapay_qr' then
    raise exception 'Order is not awaiting payment' using errcode = '22023', hint = 'PAY-004';
  end if;
  if v_order.payment_status = 'awaiting_approval' then
    raise exception 'Order is awaiting approval' using errcode = '22023', hint = 'PAY-007';
  end if;
  if v_order.payment_status not in ('awaiting_proof', 'rejected', 'under_review') then
    raise exception 'Order is not awaiting payment' using errcode = '22023', hint = 'PAY-004';
  end if;
  if v_order.payment_status <> 'under_review' and v_order.payment_deadline <= now() then
    raise exception 'Payment deadline passed' using errcode = '22023', hint = 'PAY-001';
  end if;
  return query select
    (select s.value #>> '{}' from public.shop_settings s where s.key = 'instapay_qr_path'),
    (select s.value #>> '{}' from public.shop_settings s where s.key = 'instapay_handle'),
    v_order.total, v_order.payment_deadline;
end;
$$;

create or replace function public.expire_unpaid_orders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_approval_hours integer;
begin
  select (value #>> '{}')::integer into v_approval_hours
    from public.shop_settings where key = 'approval_window_hours';
  with cancelled as (
    update public.orders set status = 'cancelled'
    where payment_method = 'instapay_qr' and status in ('pending', 'confirmed')
      and ((payment_status = 'awaiting_approval'
            and created_at + make_interval(hours => coalesce(v_approval_hours, 24)) <= now())
           or (payment_status in ('awaiting_proof', 'rejected') and payment_deadline <= now()))
    returning id
  ) select count(*) into v_count from cancelled;
  return v_count;
end;
$$;

-- The scheduled expiry job runs as database owner, never as a browser user.
revoke all on function public.expire_unpaid_orders() from public, anon, authenticated;

revoke all on function public.admin_update_setting(text, jsonb) from public, anon, authenticated;
grant execute on function public.admin_update_setting(text, jsonb) to authenticated;

revoke all on function public.place_order(jsonb, public.delivery_method, public.payment_method, jsonb) from public, anon, authenticated;
grant execute on function public.place_order(jsonb, public.delivery_method, public.payment_method, jsonb) to authenticated;

revoke all on function public.orders_status_guard() from public, anon, authenticated;

revoke all on function public.submit_payment_proof(bigint, text, text) from public, anon, authenticated;
grant execute on function public.submit_payment_proof(bigint, text, text) to authenticated;

revoke all on function public.admin_review_payment(bigint, boolean, text) from public, anon, authenticated;
grant execute on function public.admin_review_payment(bigint, boolean, text) to authenticated;

revoke all on function public.admin_approve_order(bigint, text) from public, anon, authenticated;
grant execute on function public.admin_approve_order(bigint, text) to authenticated;

revoke all on function public.admin_reject_order(bigint, text) from public, anon, authenticated;
grant execute on function public.admin_reject_order(bigint, text) to authenticated;

revoke all on function public.get_payment_instructions(bigint) from public, anon, authenticated;
grant execute on function public.get_payment_instructions(bigint) to authenticated;

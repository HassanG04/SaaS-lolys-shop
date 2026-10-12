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
  if p_proof_path is null or not (p_proof_path starts with v_expected_prefix) then
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

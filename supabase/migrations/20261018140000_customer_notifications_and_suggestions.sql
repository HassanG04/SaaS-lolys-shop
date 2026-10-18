-- =====================================================================
-- 20261018140000_customer_notifications_and_suggestions.sql : T-2.10
-- Customer Notifications, Suggestions, and Admin Wishlist Demand View
-- =====================================================================

-- 1. Customer Notifications Table
create table if not exists public.customer_notifications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('wishlist_sale', 'order_approved', 'general_sale')),
  title_ar text not null check (char_length(trim(title_ar)) > 0 and char_length(title_ar) <= 120),
  title_en text not null check (char_length(trim(title_en)) > 0 and char_length(title_en) <= 120),
  message_ar text not null check (char_length(trim(message_ar)) > 0 and char_length(message_ar) <= 500),
  message_en text not null check (char_length(trim(message_en)) > 0 and char_length(message_en) <= 500),
  link text check (link is null or char_length(link) <= 255),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists customer_notifications_user_idx
  on public.customer_notifications (customer_id, created_at desc);

create index if not exists customer_notifications_unread_idx
  on public.customer_notifications (customer_id, is_read)
  where is_read = false;

alter table public.customer_notifications enable row level security;

drop policy if exists customer_notifications_select on public.customer_notifications;
create policy customer_notifications_select on public.customer_notifications
  for select
  to authenticated
  using (customer_id = auth.uid());

drop policy if exists customer_notifications_update on public.customer_notifications;
create policy customer_notifications_update on public.customer_notifications
  for update
  to authenticated
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

drop policy if exists customer_notifications_delete on public.customer_notifications;
create policy customer_notifications_delete on public.customer_notifications
  for delete
  to authenticated
  using (customer_id = auth.uid());

revoke insert on public.customer_notifications from public, anon, authenticated;
grant select, update (is_read), delete on public.customer_notifications to authenticated;

-- Mark all notifications as read for current customer
create or replace function public.mark_all_notifications_read()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501', hint = 'AUTH-001';
  end if;

  update public.customer_notifications
     set is_read = true
   where customer_id = auth.uid()
     and is_read = false;
end;
$$;

revoke all on function public.mark_all_notifications_read() from public, anon;
grant execute on function public.mark_all_notifications_read() to authenticated;

-- 2. Customer Suggestions Table
create table if not exists public.customer_suggestions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.profiles (id) on delete set null,
  topic text not null check (topic in ('products', 'service', 'delivery', 'website', 'other')),
  message text not null check (char_length(trim(message)) >= 10 and char_length(message) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'archived')),
  admin_notes text check (admin_notes is null or char_length(admin_notes) <= 500),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists customer_suggestions_created_idx
  on public.customer_suggestions (created_at desc);

create index if not exists customer_suggestions_customer_idx
  on public.customer_suggestions (customer_id, created_at desc);

alter table public.customer_suggestions enable row level security;

drop policy if exists customer_suggestions_select on public.customer_suggestions;
create policy customer_suggestions_select on public.customer_suggestions
  for select
  to authenticated
  using (customer_id = auth.uid() or public.is_admin());

drop policy if exists customer_suggestions_admin_update on public.customer_suggestions;
create policy customer_suggestions_admin_update on public.customer_suggestions
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke insert, update, delete on public.customer_suggestions from public, anon, authenticated;
grant select on public.customer_suggestions to authenticated;

-- Secure submission RPC for suggestions with rate limiting
create or replace function public.submit_customer_suggestion(
  p_topic text,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_recent_count integer;
  v_id uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '42501', hint = 'AUTH-001';
  end if;

  if p_topic is null or p_topic not in ('products', 'service', 'delivery', 'website', 'other') then
    raise exception 'Invalid suggestion topic' using errcode = '22023', hint = 'SUG-002';
  end if;

  if p_message is null or char_length(trim(p_message)) < 10 or char_length(p_message) > 1000 then
    raise exception 'Suggestion message must be between 10 and 1000 characters' using errcode = '22023', hint = 'SUG-003';
  end if;

  -- Rate limit: maximum 5 suggestions per customer in the last hour
  select count(*)
    into v_recent_count
    from public.customer_suggestions
   where customer_id = v_uid
     and created_at > now() - interval '1 hour';

  if v_recent_count >= 5 then
    raise exception 'Too many suggestions submitted. Please try again later.'
      using errcode = '22023', hint = 'SUG-001';
  end if;

  insert into public.customer_suggestions (
    customer_id,
    topic,
    message
  ) values (
    v_uid,
    p_topic,
    trim(p_message)
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_customer_suggestion(text, text) from public, anon;
grant execute on function public.submit_customer_suggestion(text, text) to authenticated;

-- Admin review RPC for suggestions
create or replace function public.admin_review_suggestion(
  p_id uuid,
  p_status text,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_status text;
begin
  perform public.require_admin();

  if p_status is null or p_status not in ('pending', 'reviewed', 'archived') then
    raise exception 'Invalid suggestion status' using errcode = '22023', hint = 'ADM-007';
  end if;

  if p_notes is not null and char_length(p_notes) > 500 then
    raise exception 'Admin notes exceed 500 characters' using errcode = '22023', hint = 'ADM-007';
  end if;

  select status into v_old_status
    from public.customer_suggestions
   where id = p_id;

  if v_old_status is null then
    raise exception 'Suggestion not found' using errcode = 'P0002', hint = 'SUG-004';
  end if;

  update public.customer_suggestions
     set status = p_status,
         admin_notes = p_notes,
         reviewed_at = case when p_status <> 'pending' then now() else null end
   where id = p_id;

  perform public.audit_event(
    'SUGGESTION_REVIEW',
    'customer_suggestions',
    p_id::text,
    jsonb_build_object('status', v_old_status),
    jsonb_build_object('status', p_status, 'notes', p_notes)
  );
end;
$$;

revoke all on function public.admin_review_suggestion(uuid, text, text) from public, anon;
grant execute on function public.admin_review_suggestion(uuid, text, text) to authenticated;

-- 3. Automatic Notifications: Order Approval Trigger
create or replace function public.notify_on_order_approved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null and
     new.payment_status = 'awaiting_proof' and
     (old.payment_status is distinct from new.payment_status) then
    insert into public.customer_notifications (
      customer_id,
      type,
      title_ar,
      title_en,
      message_ar,
      message_en,
      link
    ) values (
      new.user_id,
      'order_approved',
      'تمت الموافقة على طلبك',
      'Your order has been approved',
      'تمت الموافقة على طلبك #' || new.id || '. يمكنك الآن تأكيد الدفع.',
      'Your order #' || new.id || ' has been approved. You can now submit payment proof.',
      '/pay/' || new.id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_order_approved on public.orders;
create trigger trg_notify_order_approved
  after update of payment_status on public.orders
  for each row
  execute function public.notify_on_order_approved();

-- 4. Automatic Notifications: Wishlist Sale Trigger
create or replace function public.notify_on_wishlist_sale()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_active = true and
     new.discount_percent > 0 and
     (old.discount_percent is null or new.discount_percent > old.discount_percent) then
    insert into public.customer_notifications (
      customer_id,
      type,
      title_ar,
      title_en,
      message_ar,
      message_en,
      link
    )
    select
      f.user_id,
      'wishlist_sale',
      'عرض على منتج في مفضلتك',
      'Sale on wishlist item',
      'أصبح المنتج "' || coalesce(new.name_ar, new.name) || '" متوفرًا بخصم ' || new.discount_percent || '%!',
      'The product "' || coalesce(new.name, new.name_ar) || '" is now on sale with ' || new.discount_percent || '% off!',
      '/products/' || new.id
    from public.favorites f
    where f.product_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_wishlist_sale on public.products;
create trigger trg_notify_wishlist_sale
  after update of discount_percent on public.products
  for each row
  execute function public.notify_on_wishlist_sale();

-- 5. Admin Broadcast Sale Notification RPC
create or replace function public.admin_broadcast_sale_notification(
  p_title_ar text,
  p_title_en text,
  p_message_ar text,
  p_message_en text,
  p_link text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  perform public.require_admin();

  if p_title_ar is null or char_length(trim(p_title_ar)) = 0 or char_length(p_title_ar) > 120 or
     p_title_en is null or char_length(trim(p_title_en)) = 0 or char_length(p_title_en) > 120 or
     p_message_ar is null or char_length(trim(p_message_ar)) = 0 or char_length(p_message_ar) > 500 or
     p_message_en is null or char_length(trim(p_message_en)) = 0 or char_length(p_message_en) > 500 then
    raise exception 'Invalid notification payload' using errcode = '22023', hint = 'ADM-007';
  end if;

  if p_link is not null and char_length(p_link) > 255 then
    raise exception 'Notification link too long' using errcode = '22023', hint = 'ADM-007';
  end if;

  insert into public.customer_notifications (
    customer_id,
    type,
    title_ar,
    title_en,
    message_ar,
    message_en,
    link
  )
  select
    p.id,
    'general_sale',
    trim(p_title_ar),
    trim(p_title_en),
    trim(p_message_ar),
    trim(p_message_en),
    p_link
  from public.profiles p;

  get diagnostics v_count = row_count;

  perform public.audit_event(
    'BROADCAST_SALE_NOTIFICATION',
    'customer_notifications',
    'broadcast',
    null,
    jsonb_build_object('recipient_count', v_count, 'title_en', trim(p_title_en))
  );

  return v_count;
end;
$$;

revoke all on function public.admin_broadcast_sale_notification(text, text, text, text, text) from public, anon;
grant execute on function public.admin_broadcast_sale_notification(text, text, text, text, text) to authenticated;

-- 6. Admin Wishlist Demand Reporting RPC
create or replace function public.admin_get_wishlist_demand()
returns table (
  product_id bigint,
  product_name text,
  product_name_ar text,
  price numeric,
  discount_percent smallint,
  final_price numeric,
  stock_quantity integer,
  is_active boolean,
  image_url text,
  wishlist_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_admin();

  return query
  select
    p.id as product_id,
    p.name as product_name,
    p.name_ar as product_name_ar,
    p.price,
    p.discount_percent,
    p.final_price,
    p.stock_quantity,
    p.is_active,
    p.image_url,
    count(f.user_id) as wishlist_count
  from public.products p
  inner join public.favorites f on f.product_id = p.id
  group by p.id, p.name, p.name_ar, p.price, p.discount_percent, p.final_price, p.stock_quantity, p.is_active, p.image_url
  order by wishlist_count desc, p.id desc;
end;
$$;

revoke all on function public.admin_get_wishlist_demand() from public, anon;
grant execute on function public.admin_get_wishlist_demand() to authenticated;

-- 7. Update Customer Anonymization to Include Notifications and Suggestions
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
         district = null,
         address = null,
         postal_code = null,
         floor = null,
         apartment = null,
         landmark = null
   where id = p_user_id;

  -- 5. Anonymize personal delivery and contact info on all orders belonging to user
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

  -- 7. Delete personal customer notifications
  delete from public.customer_notifications
   where customer_id = p_user_id;

  -- 8. Disassociate customer suggestions
  update public.customer_suggestions
     set customer_id = null
   where customer_id = p_user_id;

  -- 9. Audit the anonymization action (without logging personal details)
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

-- Migration: 20261018180000_occasion_reminders.sql
-- Description: Task T-9.14: Upcoming occasion reminders for admins
-- Provides AAL2-only API for calendar occasions, in-app deduplicated admin reminders,
-- configurable advance window in shop_settings, and storage deletion safety.

-- 1. Storage protect_delete safety for existing automated cleanup and anonymization functions
create or replace function public.cleanup_old_avatar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.avatar_url is not null and (new.avatar_url is null or new.avatar_url <> old.avatar_url) then
    perform set_config('storage.allow_delete_query', 'true', true);
    delete from storage.objects
     where bucket_id = 'avatars'
       and name = old.avatar_url;
  end if;
  return new;
end;
$$;

create or replace function public.cleanup_deleted_profile_avatar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.avatar_url is not null then
    perform set_config('storage.allow_delete_query', 'true', true);
    delete from storage.objects
     where bucket_id = 'avatars'
       and name = old.avatar_url;
  end if;
  return old;
end;
$$;

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
         avatar_url = null,
         floor = null,
         apartment = null,
         landmark = null
   where id = p_user_id;

  -- 5. Delete customer avatar from storage (enabling storage.allow_delete_query for trigger)
  perform set_config('storage.allow_delete_query', 'true', true);
  delete from storage.objects
   where bucket_id = 'avatars'
     and (storage.foldername(name))[1] = p_user_id::text;

  -- 6. Anonymize personal delivery and contact info on all orders belonging to user
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

  -- 7. Delete personal customer favorites
  delete from public.favorites
   where user_id = p_user_id;

  -- 8. Delete personal customer notifications
  delete from public.customer_notifications
   where customer_id = p_user_id;

  -- 9. Disassociate customer suggestions
  update public.customer_suggestions
     set customer_id = null
   where customer_id = p_user_id;

  -- 10. Audit the anonymization action (without logging personal details)
  perform public.audit_event(
    'CUSTOMER_ANONYMIZE',
    'profiles',
    p_user_id::text,
    jsonb_build_object('anonymized', false, 'orders_count', v_orders_count),
    jsonb_build_object('anonymized', true, 'orders_count', v_orders_count)
  );
end;
$$;

-- 2. Add occasion_reminder_advance_days setting to shop_settings
insert into public.shop_settings (key, value, is_public)
values (
  'occasion_reminder_advance_days',
  '14'::jsonb,
  false
)
on conflict (key) do update set
  is_public = false;

-- 3. Update admin_update_setting with occasion_reminder_advance_days validation
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
    'require_order_approval', 'approval_window_hours',
    'occasion_reminder_advance_days'
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

    when 'occasion_reminder_advance_days' then
      if jsonb_typeof(p_value) <> 'number' then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;
      v_num := (p_value #>> '{}')::numeric;
      if v_num not in (7, 14, 21, 30) then
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

-- 4. Create admin_occasion_reminders table
create table if not exists public.admin_occasion_reminders (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete cascade,
  occasion_key text not null check (occasion_key in (
    'ramadan', 'eid_fitr', 'eid_adha', 'mothers_day', 'valentines', 'black_friday', 'back_to_school'
  )),
  event_year integer not null check (event_year >= 2026),
  event_date date not null,
  title_ar text not null,
  title_en text not null,
  message_ar text not null,
  message_en text not null,
  advance_days integer not null check (advance_days in (7, 14, 21, 30)),
  is_read boolean not null default false,
  is_dismissed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_admin_occasion_reminder unique (admin_id, occasion_key, event_year, advance_days)
);

alter table public.admin_occasion_reminders owner to postgres;
alter table public.admin_occasion_reminders enable row level security;

drop policy if exists "admin_occasion_reminders_policy" on public.admin_occasion_reminders;
create policy "admin_occasion_reminders_policy" on public.admin_occasion_reminders
  for all to authenticated
  using (public.is_admin() and admin_id = (select auth.uid()))
  with check (public.is_admin() and admin_id = (select auth.uid()));

-- 5. Helper function or CTE-based function: public.admin_get_upcoming_occasions
create or replace function public.admin_get_upcoming_occasions(
  p_days_ahead integer default 120
)
returns jsonb
language plpgsql
security definer
set search_path = public, analytics, pg_temp
as $$
declare
  v_cairo_today date;
  v_max_date date;
  v_occasions jsonb;
begin
  -- 1. Strictly enforce admin role and AAL2 step-up
  perform public.require_admin();

  -- 2. Determine Cairo local date boundaries
  v_cairo_today := (now() at time zone 'Africa/Cairo')::date;
  v_max_date := v_cairo_today + coalesce(p_days_ahead, 120);

  -- 3. Query discrete events from analytics.calendar
  with raw_occasions as (
    select
      'valentines'::text as occasion_key,
      'عيد الحب'::text as name_ar,
      'Valentine''s Day'::text as name_en,
      min(day) as start_date,
      max(day) as end_date,
      false as is_uncertain,
      null::text as uncertainty_note_ar,
      null::text as uncertainty_note_en,
      '/admin/products'::text as action_url
    from analytics.calendar
    where valentines = true
    group by extract(year from day)

    union all

    select
      'ramadan'::text as occasion_key,
      'شهر رمضان المبارك'::text as name_ar,
      'Holy Month of Ramadan'::text as name_en,
      min(day) as start_date,
      max(day) as end_date,
      true as is_uncertain,
      'تخضع للرؤية الشرعية لدار الإفتاء المصرية'::text as uncertainty_note_ar,
      'Subject to official moon sighting by Dar al-Ifta'::text as uncertainty_note_en,
      '/admin/products'::text as action_url
    from analytics.calendar
    where ramadan = true
    group by extract(year from day)

    union all

    select
      'eid_fitr'::text as occasion_key,
      'عيد الفطر المبارك'::text as name_ar,
      'Eid al-Fitr'::text as name_en,
      min(day) as start_date,
      max(day) as end_date,
      true as is_uncertain,
      'تخضع للرؤية الشرعية لدار الإفتاء المصرية'::text as uncertainty_note_ar,
      'Subject to official moon sighting by Dar al-Ifta'::text as uncertainty_note_en,
      '/admin/products'::text as action_url
    from analytics.calendar
    where eid_fitr = true
    group by extract(year from day)

    union all

    select
      'mothers_day'::text as occasion_key,
      'عيد الأم'::text as name_ar,
      'Mother''s Day'::text as name_en,
      min(day) as start_date,
      max(day) as end_date,
      false as is_uncertain,
      null::text as uncertainty_note_ar,
      null::text as uncertainty_note_en,
      '/admin/products'::text as action_url
    from analytics.calendar
    where mothers_day = true
    group by extract(year from day)

    union all

    select
      'eid_adha'::text as occasion_key,
      'عيد الأضحى المبارك'::text as name_ar,
      'Eid al-Adha'::text as name_en,
      min(day) as start_date,
      max(day) as end_date,
      true as is_uncertain,
      'تخضع للرؤية الشرعية لدار الإفتاء المصرية'::text as uncertainty_note_ar,
      'Subject to official moon sighting by Dar al-Ifta'::text as uncertainty_note_en,
      '/admin/products'::text as action_url
    from analytics.calendar
    where eid_adha = true
    group by extract(year from day)

    union all

    select
      'back_to_school'::text as occasion_key,
      'موسم العودة للمدارس'::text as name_ar,
      'Back to School Season'::text as name_en,
      min(day) as start_date,
      max(day) as end_date,
      false as is_uncertain,
      null::text as uncertainty_note_ar,
      null::text as uncertainty_note_en,
      '/admin/products'::text as action_url
    from analytics.calendar
    where back_to_school = true
    group by extract(year from day)

    union all

    select
      'black_friday'::text as occasion_key,
      'عروض الجمعة البيضاء'::text as name_ar,
      'White Friday / Black Friday'::text as name_en,
      min(day) as start_date,
      max(day) as end_date,
      false as is_uncertain,
      null::text as uncertainty_note_ar,
      null::text as uncertainty_note_en,
      '/admin/products'::text as action_url
    from analytics.calendar
    where black_friday = true
    group by extract(year from day)
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'occasion_key', o.occasion_key,
      'name_ar', o.name_ar,
      'name_en', o.name_en,
      'start_date', o.start_date,
      'end_date', o.end_date,
      'days_until', greatest(0, o.start_date - v_cairo_today),
      'is_ongoing', (v_cairo_today between o.start_date and o.end_date),
      'is_uncertain', o.is_uncertain,
      'uncertainty_note_ar', o.uncertainty_note_ar,
      'uncertainty_note_en', o.uncertainty_note_en,
      'action_url', o.action_url
    ) order by o.start_date asc
  ), '[]'::jsonb)
  into v_occasions
  from raw_occasions o
  where o.end_date >= v_cairo_today
    and o.start_date <= v_max_date;

  return v_occasions;
end;
$$;

revoke all on function public.admin_get_upcoming_occasions(integer) from public, anon;
grant execute on function public.admin_get_upcoming_occasions(integer) to authenticated;

-- 6. RPC: public.admin_generate_occasion_reminders
create or replace function public.admin_generate_occasion_reminders(
  p_advance_days integer default null
)
returns integer
language plpgsql
security definer
set search_path = public, analytics, pg_temp
as $$
declare
  v_admin_id uuid;
  v_advance_days integer;
  v_cairo_today date;
  v_count integer := 0;
  v_row record;
begin
  -- 1. Strictly enforce admin role and AAL2 step-up
  perform public.require_admin();
  v_admin_id := auth.uid();

  -- 2. Determine advance days window from parameter or shop_settings
  if p_advance_days is not null then
    if p_advance_days not in (7, 14, 21, 30) then
      raise exception 'Advance days must be 7, 14, 21, or 30'
        using errcode = '22023', hint = 'ADM-007';
    end if;
    v_advance_days := p_advance_days;
  else
    select coalesce((value #>> '{}')::integer, 14)
      into v_advance_days
      from public.shop_settings
     where key = 'occasion_reminder_advance_days';
    if v_advance_days not in (7, 14, 21, 30) then
      v_advance_days := 14;
    end if;
  end if;

  -- 3. Cairo local date boundaries
  v_cairo_today := (now() at time zone 'Africa/Cairo')::date;

  -- 4. Find all upcoming occasions starting within v_advance_days
  for v_row in
    with raw_occasions as (
      select
        'valentines'::text as occasion_key,
        extract(year from min(day))::integer as event_year,
        'عيد الحب'::text as title_ar,
        'Valentine''s Day'::text as title_en,
        'اقتراب موعد عيد الحب - فرصة لمراجعة مخزون الهدايا والإكسسوارات والعروض الترويجية.'::text as message_ar,
        'Valentine''s Day is approaching - review gift & accessory stock and promotional campaigns.'::text as message_en,
        min(day) as start_date
      from analytics.calendar
      where valentines = true
      group by extract(year from day)

      union all

      select
        'ramadan'::text as occasion_key,
        extract(year from min(day))::integer as event_year,
        'شهر رمضان المبارك'::text as title_ar,
        'Holy Month of Ramadan'::text as title_en,
        'اقتراب موعد شهر رمضان المبارك (يخضع للرؤية الشرعية لدار الإفتاء المصرية) - راجع المنتجات والعروض.'::text as message_ar,
        'Ramadan is approaching (subject to Dar al-Ifta moon sighting) - review inventory and promotional offers.'::text as message_en,
        min(day) as start_date
      from analytics.calendar
      where ramadan = true
      group by extract(year from day)

      union all

      select
        'eid_fitr'::text as occasion_key,
        extract(year from min(day))::integer as event_year,
        'عيد الفطر المبارك'::text as title_ar,
        'Eid al-Fitr'::text as title_en,
        'اقتراب موعد عيد الفطر المبارك (يخضع للرؤية الشرعية لدار الإفتاء المصرية) - راجع تجهيزات موسم العيد ومخزون الهدايا.'::text as message_ar,
        'Eid al-Fitr is approaching (subject to Dar al-Ifta moon sighting) - review Eid inventory and gifts.'::text as message_en,
        min(day) as start_date
      from analytics.calendar
      where eid_fitr = true
      group by extract(year from day)

      union all

      select
        'mothers_day'::text as occasion_key,
        extract(year from min(day))::integer as event_year,
        'عيد الأم'::text as title_ar,
        'Mother''s Day'::text as title_en,
        'اقتراب موعد عيد الأم - موسم رئيسي لإكسسوارات وهدايا السيدات، راجع المخزون والعروض.'::text as message_ar,
        'Mother''s Day is approaching - peak season for jewelry & gifts, review stock and promotions.'::text as message_en,
        min(day) as start_date
      from analytics.calendar
      where mothers_day = true
      group by extract(year from day)

      union all

      select
        'eid_adha'::text as occasion_key,
        extract(year from min(day))::integer as event_year,
        'عيد الأضحى المبارك'::text as title_ar,
        'Eid al-Adha'::text as title_en,
        'اقتراب موعد عيد الأضحى المبارك (يخضع للرؤية الشرعية لدار الإفتاء المصرية) - راجع مستويات المخزون وحملات العيد.'::text as message_ar,
        'Eid al-Adha is approaching (subject to Dar al-Ifta moon sighting) - check stock levels and promotions.'::text as message_en,
        min(day) as start_date
      from analytics.calendar
      where eid_adha = true
      group by extract(year from day)

      union all

      select
        'back_to_school'::text as occasion_key,
        extract(year from min(day))::integer as event_year,
        'موسم العودة للمدارس'::text as title_ar,
        'Back to School Season'::text as title_en,
        'اقتراب موسم العودة للمدارس - راجع الإكسسوارات والمنتجات المناسبة للموسم.'::text as message_ar,
        'Back to school season is approaching - check suitable accessories and seasonal collections.'::text as message_en,
        min(day) as start_date
      from analytics.calendar
      where back_to_school = true
      group by extract(year from day)

      union all

      select
        'black_friday'::text as occasion_key,
        extract(year from min(day))::integer as event_year,
        'عروض الجمعة البيضاء'::text as title_ar,
        'White Friday / Black Friday'::text as title_en,
        'اقتراب موسم تخفيضات الجمعة البيضاء - خطط للحملات الترويجية ومستويات المخزون مسبقاً.'::text as message_ar,
        'White Friday / Black Friday is approaching - plan promotions and stock levels in advance.'::text as message_en,
        min(day) as start_date
      from analytics.calendar
      where black_friday = true
      group by extract(year from day)
    )
    select *
      from raw_occasions
     where start_date between v_cairo_today and (v_cairo_today + v_advance_days)
     order by start_date asc
  loop
    insert into public.admin_occasion_reminders (
      admin_id,
      occasion_key,
      event_year,
      event_date,
      title_ar,
      title_en,
      message_ar,
      message_en,
      advance_days
    ) values (
      v_admin_id,
      v_row.occasion_key,
      v_row.event_year,
      v_row.start_date,
      v_row.title_ar,
      v_row.title_en,
      v_row.message_ar,
      v_row.message_en,
      v_advance_days
    )
    on conflict (admin_id, occasion_key, event_year, advance_days) do nothing;

    if found then
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.admin_generate_occasion_reminders(integer) from public, anon;
grant execute on function public.admin_generate_occasion_reminders(integer) to authenticated;

-- 7. RPC: public.admin_get_occasion_reminders
create or replace function public.admin_get_occasion_reminders()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reminders jsonb;
begin
  -- Strictly enforce admin role and AAL2 step-up
  perform public.require_admin();

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'admin_id', r.admin_id,
      'occasion_key', r.occasion_key,
      'event_year', r.event_year,
      'event_date', r.event_date,
      'title_ar', r.title_ar,
      'title_en', r.title_en,
      'message_ar', r.message_ar,
      'message_en', r.message_en,
      'advance_days', r.advance_days,
      'is_read', r.is_read,
      'is_dismissed', r.is_dismissed,
      'created_at', r.created_at,
      'days_until', greatest(0, r.event_date - (now() at time zone 'Africa/Cairo')::date)
    ) order by r.event_date asc, r.created_at desc
  ), '[]'::jsonb)
  into v_reminders
  from public.admin_occasion_reminders r
  where r.admin_id = auth.uid()
    and r.is_dismissed = false;

  return v_reminders;
end;
$$;

revoke all on function public.admin_get_occasion_reminders() from public, anon;
grant execute on function public.admin_get_occasion_reminders() to authenticated;

-- 8. RPC: public.admin_dismiss_occasion_reminder
create or replace function public.admin_dismiss_occasion_reminder(
  p_reminder_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Strictly enforce admin role and AAL2 step-up
  perform public.require_admin();

  if p_reminder_id is null then
    raise exception 'Reminder ID is required'
      using errcode = '22023', hint = 'ADM-007';
  end if;

  update public.admin_occasion_reminders
     set is_dismissed = true,
         is_read = true,
         updated_at = now()
   where id = p_reminder_id
     and admin_id = auth.uid();

  return found;
end;
$$;

revoke all on function public.admin_dismiss_occasion_reminder(uuid) from public, anon;
grant execute on function public.admin_dismiss_occasion_reminder(uuid) to authenticated;

-- =====================================================================
-- 20261018200000_instapay_themed_qr.sql : T-5.16
-- Generated themed InstaPay QR from Admin Settings.
-- Accepts and validates verified HTTPS ipn.eg share links, preserves privacy,
-- extends get_payment_instructions to deliver the official payment link
-- to approved customer orders, and audits changes with AAL2 protection.
-- =====================================================================

-- 1. Ensure instapay_link exists in shop_settings as a private setting
insert into public.shop_settings (key, value, is_public)
values ('instapay_link', '""'::jsonb, false)
on conflict (key) do update
   set is_public = false;

-- 2. Update admin_update_setting with instapay_link validation and allow-list
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
    'instapay_link', 'returns_text_ar', 'payment_window_hours',
    'pending_order_limit', 'require_order_approval', 'approval_window_hours',
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
      if v_num < 0 or v_num > 90 or v_num <> trunc(v_num) then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;

    when 'payment_methods_enabled' then
      if jsonb_typeof(p_value) <> 'array' or jsonb_array_length(p_value) = 0 then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;
      for v_arr_elem in select * from jsonb_array_elements(p_value) loop
        if v_arr_elem #>> '{}' not in ('cod', 'instapay_qr') then
          raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
        end if;
      end loop;

    when 'instapay_handle' then
      if jsonb_typeof(p_value) <> 'string' then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;
      v_text := p_value #>> '{}';
      if char_length(v_text) > 60 then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;
      if v_text <> '' and v_text !~ '^[A-Za-z0-9._-]+@[A-Za-z0-9._-]+$' then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;

    when 'instapay_link' then
      if jsonb_typeof(p_value) <> 'string' then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;
      v_text := p_value #>> '{}';
      if char_length(v_text) > 250 then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;
      if v_text <> '' and v_text !~ '^https://ipn\.eg(/[A-Za-z0-9._~:/?#\[\]@!$&''()*+,;=-]*)?$' then
        raise exception 'Invalid setting value' using errcode = '22023', hint = 'ADM-007';
      end if;

    when 'instapay_qr_path' then
      if jsonb_typeof(p_value) <> 'string' or char_length(p_value #>> '{}') = 0 or char_length(p_value #>> '{}') > 200 then
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

-- 3. Extend get_payment_instructions to include the private payment link
create or replace function public.get_payment_instructions(p_order_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid            uuid := auth.uid();
  v_order_uid      uuid;
  v_status         public.payment_status;
  v_total          numeric(10,2);
  v_deadline       timestamptz;
  v_qr_path        text;
  v_handle         text;
  v_link           text;
begin
  if v_uid is null then
    raise exception 'Authentication required'
      using errcode = '42501', hint = 'AUTH-004';
  end if;

  select user_id, payment_status, total, payment_deadline
    into v_order_uid, v_status, v_total, v_deadline
    from public.orders
   where id = p_order_id;

  if v_order_uid is null or v_order_uid <> v_uid then
    raise exception 'Not owner of order'
      using errcode = '42501', hint = 'ORD-009';
  end if;

  if v_status::text = 'awaiting_approval' then
    raise exception 'Order is awaiting store approval'
      using errcode = '22023', hint = 'PAY-007';
  end if;

  if v_status::text not in ('awaiting_proof', 'under_review', 'rejected') then
    raise exception 'Wrong payment status for instructions'
      using errcode = '22023', hint = 'PAY-004';
  end if;

  select value #>> '{}' into v_qr_path from public.shop_settings where key = 'instapay_qr_path';
  select value #>> '{}' into v_handle from public.shop_settings where key = 'instapay_handle';
  select value #>> '{}' into v_link from public.shop_settings where key = 'instapay_link';

  return jsonb_build_object(
    'qr_path', coalesce(v_qr_path, 'settings/instapay-qr-default.png'),
    'handle', coalesce(nullif(v_handle, ''), 'alaa.ahm9624@instapay'),
    'instapay_handle', coalesce(nullif(v_handle, ''), 'alaa.ahm9624@instapay'),
    'link', coalesce(nullif(v_link, ''), ''),
    'amount', v_total,
    'deadline', v_deadline
  );
end;
$$;

revoke all on function public.get_payment_instructions(bigint) from public, anon;
grant execute on function public.get_payment_instructions(bigint) to authenticated;

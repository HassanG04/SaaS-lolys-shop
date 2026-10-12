-- =====================================================================
-- 20261012044500_shop_settings.sql : T-1.17 Shop settings table, RLS,
-- admin_update_setting RPC and storage limits.
-- Scenario S22: Settings allow-list, typed validation, privacy RLS,
-- audited changes.
-- =====================================================================

-- 1. Create table shop_settings
create table public.shop_settings (
  key         text primary key,
  value       jsonb not null,
  is_public   boolean not null default false,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users (id)
);

-- 2. Seed default settings
insert into public.shop_settings (key, value, is_public) values
  ('shop_name_ar', '"Lolys'' Accessories & Home"'::jsonb, true),
  ('shop_name_en', '"Lolys'' Accessories & Home"'::jsonb, true),
  ('tagline_ar', '""'::jsonb, true),
  ('phone', '""'::jsonb, true),
  ('whatsapp', '""'::jsonb, true),
  ('instagram', '""'::jsonb, true),
  ('announcement_ar', '""'::jsonb, true),
  ('hero_title_ar', '"إكسسوارات صنعت بكل حب"'::jsonb, true),
  ('hero_subtitle_ar', '"قطع مميزة تناسب ذوقك وتضيف لمسة من الأناقة ليومك"'::jsonb, true),
  ('sale_percent', '50'::jsonb, true),
  ('payment_methods_enabled', '["cod", "instapay_qr"]'::jsonb, true),
  ('instapay_qr_path', '"settings/instapay-qr-default.png"'::jsonb, true),
  ('instapay_handle', '""'::jsonb, true),
  ('returns_text_ar', '"إمكانية الاسترجاع أو الاستبدال خلال 14 يوماً من الاستلام بشرط أن تكون المنتجات بحالتها الأصلية."'::jsonb, true),
  ('payment_window_hours', '24'::jsonb, false),
  ('pending_order_limit', '3'::jsonb, false)
on conflict (key) do nothing;

-- 3. RLS & Permissions
alter table public.shop_settings enable row level security;

create policy "public_read_shop_settings"
  on public.shop_settings
  for select
  using (is_public = true);

create policy "admin_read_all_shop_settings"
  on public.shop_settings
  for select
  using (public.is_admin());

revoke all on table public.shop_settings from public, anon;
grant select on table public.shop_settings to anon, authenticated;

-- 4. Update process_audit_log to support shop_settings (key instead of id)
create or replace function public.process_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_is_admin boolean := false;
  v_is_owner boolean := false;
  v_old_json jsonb;
  v_new_json jsonb;
  v_entity_id text;
  v_action text := tg_op;
begin
  if v_uid is not null then
    select role::text into v_role from public.profiles where id = v_uid;
    if v_role = 'admin' then
      v_is_admin := true;
    end if;
  else
    if current_user in ('postgres', 'supabase_admin')
       or session_user in ('postgres', 'supabase_admin') then
      v_is_owner := true;
      v_role := current_user;
    end if;
  end if;

  -- Only audit when actor is admin or database owner
  if not (v_is_admin or v_is_owner) then
    return coalesce(new, old);
  end if;

  -- If UPDATE, check if audited columns actually changed
  if tg_op = 'UPDATE' then
    if tg_table_name = 'products' then
      if not (
        new.name is distinct from old.name or
        new.price is distinct from old.price or
        new.discount_percent is distinct from old.discount_percent or
        new.stock_quantity is distinct from old.stock_quantity or
        new.is_active is distinct from old.is_active
      ) then
        return new;
      end if;
    elsif tg_table_name = 'orders' then
      if not (
        new.status is distinct from old.status or
        new.tracking_number is distinct from old.tracking_number or
        new.rep_name is distinct from old.rep_name or
        new.rep_phone is distinct from old.rep_phone
      ) then
        return new;
      end if;
    elsif tg_table_name = 'profiles' then
      if not (new.role is distinct from old.role) then
        return new;
      end if;
    elsif tg_table_name = 'shop_settings' then
      if not (new.value is distinct from old.value or new.is_public is distinct from old.is_public) then
        return new;
      end if;
    end if;
  end if;

  if tg_op in ('UPDATE', 'DELETE') then
    v_old_json := to_jsonb(old);
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    v_new_json := to_jsonb(new);
  end if;

  if tg_table_name = 'delivery_fees' then
    v_entity_id := (case when tg_op = 'DELETE'
      then old.governorate_id::text || ':' || old.method::text
      else new.governorate_id::text || ':' || new.method::text
    end);
  elsif tg_table_name = 'shop_settings' then
    v_entity_id := (case when tg_op = 'DELETE' then old.key else new.key end);
  else
    v_entity_id := (case when tg_op = 'DELETE' then old.id::text else new.id::text end);
  end if;

  insert into public.audit_log (actor, actor_role, action, entity, entity_id, old, new)
  values (
    v_uid,
    coalesce(v_role, 'unknown'),
    v_action,
    tg_table_name,
    v_entity_id,
    v_old_json,
    v_new_json
  );

  return coalesce(new, old);
end;
$$;

-- 5. Attach audit trigger to shop_settings
drop trigger if exists audit_shop_settings on public.shop_settings;
create trigger audit_shop_settings
  after insert or update or delete on public.shop_settings
  for each row execute function public.process_audit_log();

-- 6. admin_update_setting RPC function
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
    'returns_text_ar', 'payment_window_hours', 'pending_order_limit'
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

revoke all on function public.admin_update_setting(text, jsonb) from public, anon;
grant execute on function public.admin_update_setting(text, jsonb) to authenticated;

-- 7. Configure product-images bucket size and mime limits (3 MB; JPEG, PNG, WebP)
update storage.buckets
   set file_size_limit = 3145728,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'product-images';

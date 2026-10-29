-- APPLY: this file SAVES the missing editor setup. Owner-run only after backup/rehearsal.
-- Use a NEW Supabase SQL query and run the WHOLE file. No edits needed.
-- Generated from storefront-editor-repair.sql with apply mode enabled.
-- The DO statement is atomic. The final SELECT is a read-only confirmation.
do $editor_repair$
declare
  v_apply constant boolean := true;
  v_preserved_settings jsonb;
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('statement_timeout', '60s', true);
  perform pg_advisory_xact_lock(261029, 310);
  lock table public.shop_settings in share row exclusive mode;
  if current_user <> 'postgres' then
    raise exception 'Run the reviewed content repair as postgres';
  end if;
  if exists (select 1 from public.shop_settings where key = 'storefront_content')
    or exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'admin_update_storefront_content') then
    raise exception 'Content setup already exists or changed. Stop and obtain a fresh diagnostic';
  end if;
  if md5(replace(pg_get_functiondef(to_regprocedure('public.is_admin()')), chr(13), ''))
       is distinct from '352ec1b537ad23124dd3f01516b05d2e'
    or md5(replace(pg_get_functiondef(to_regprocedure('public.require_admin()')), chr(13), ''))
       is distinct from 'd21b2ddedef282e186c5e95585f231b4' then
    raise exception 'MFA helpers differ from the reviewed definitions. Do not remove this guard';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.shop_settings'::regclass)
    or not has_table_privilege('authenticated', 'public.shop_settings', 'SELECT')
    or not has_table_privilege('anon', 'public.shop_settings', 'SELECT')
    or (select count(*) from pg_policies where schemaname = 'public' and tablename = 'shop_settings') <> 2
    or not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shop_settings'
      and policyname = 'public_read_shop_settings' and cmd = 'SELECT' and roles = '{public}'::name[]
      and qual = '(is_public = true)')
    or not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shop_settings'
      and policyname = 'admin_read_all_shop_settings' and cmd = 'SELECT' and roles = '{public}'::name[]
      and qual = 'is_admin()') then
    raise exception 'Settings visibility or write policies differ from the reviewed configuration';
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.shop_settings'::regclass
      and tgname = 'audit_shop_settings' and tgenabled = 'O' and tgtype = 29
      and tgfoid = to_regprocedure('public.process_audit_log()'))
    or not exists (select 1 from storage.buckets where id = 'product-images') then
    raise exception 'Required settings audit trigger or image bucket is missing';
  end if;
  select coalesce(jsonb_agg(to_jsonb(s) order by key), '[]'::jsonb)
    into v_preserved_settings from public.shop_settings s;

  -- This inner block is a subtransaction. The rehearsal signal rolls it back.
  begin
-- BEGIN UNCHANGED MIGRATION: 20261018100000_storefront_content.sql
-- T-3.10c: one audited, public, bilingual content document; payment settings
-- stay separate and private. Empty document preserves existing storefront copy.
insert into public.shop_settings (key, value, is_public)
values ('storefront_content', '{}'::jsonb, true)
on conflict (key) do nothing;

create or replace function public.admin_update_storefront_content(
  p_content jsonb, p_expected_updated_at timestamptz
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_revision timestamptz;
  v_key text;
  v_value jsonb;
  v_text text;
  v_base text;
  v_id bigint;
  v_seen text[];
  v_item jsonb;
  v_text_fields text[] := array[
    'hero_title', 'hero_subtitle', 'hero_caption', 'hero_badge',
    'brand_name', 'tagline', 'copyright', 'announcement',
    'about_title', 'about_body', 'delivery_title', 'delivery_body',
    'returns_title', 'returns_summary', 'returns_body',
    'terms_label', 'terms_body', 'privacy_label', 'privacy_body',
    'returns_label', 'shipping_label', 'shipping_body', 'contact_label', 'contact_body'
  ];
begin
  perform public.require_admin();
  if p_content is null or jsonb_typeof(p_content) <> 'object'
     or octet_length(p_content::text) > 160000 then
    raise exception 'Invalid storefront content' using errcode = '22023', hint = 'ADM-007';
  end if;

  for v_key, v_value in select key, value from jsonb_each(p_content) loop
    v_text := v_value #>> '{}';
    v_base := regexp_replace(v_key, '_(ar|en)$', '');
    if v_key ~ '_(ar|en)$' and v_base = any(v_text_fields) then
      if jsonb_typeof(v_value) <> 'string' or char_length(v_text) >
         (case when v_base like '%_body' then 12000 else 500 end) then
        raise exception 'Invalid localized content' using errcode = '22023', hint = 'ADM-007';
      end if;
    elsif v_key = 'hero_image_path' then
      if jsonb_typeof(v_value) <> 'string' or (v_text <> '' and (
        v_text !~ '^settings/hero-[0-9a-f-]{36}\.(webp|jpg|png)$' or not exists (
          select 1 from storage.objects where bucket_id = 'product-images' and name = v_text
        ))) then
        raise exception 'Invalid hero image' using errcode = '22023', hint = 'ADM-007';
      end if;
    elsif v_key = 'featured_product_id' then
      if v_value <> 'null'::jsonb then
        if jsonb_typeof(v_value) <> 'number' or v_text !~ '^[1-9][0-9]{0,14}$' then
          raise exception 'Invalid featured product' using errcode = '22023', hint = 'ADM-007';
        end if;
        if not exists (select 1 from public.products where id = v_text::bigint and is_active) then
          raise exception 'Featured product unavailable' using errcode = '22023', hint = 'ADM-007';
        end if;
      end if;
    elsif v_key in ('category_ids', 'footer_order') then
      if jsonb_typeof(v_value) <> 'array' then
        raise exception 'Invalid content list' using errcode = '22023', hint = 'ADM-007';
      end if;
      if jsonb_array_length(v_value) > 12 then
        raise exception 'Content list too long' using errcode = '22023', hint = 'ADM-007';
      end if;
      v_seen := array[]::text[];
      for v_item in select value from jsonb_array_elements(v_value) loop
        v_text := v_item #>> '{}';
        if v_text is null or v_text = any(v_seen) then
          raise exception 'Duplicate content item' using errcode = '22023', hint = 'ADM-007';
        end if;
        v_seen := array_append(v_seen, v_text);
        if v_key = 'category_ids' then
          if jsonb_typeof(v_item) <> 'number' or v_text !~ '^[1-9][0-9]{0,14}$' then
            raise exception 'Invalid category' using errcode = '22023', hint = 'ADM-007';
          end if;
          v_id := v_text::bigint;
          if not exists (select 1 from public.categories where id = v_id and is_active) then
            raise exception 'Category unavailable' using errcode = '22023', hint = 'ADM-007';
          end if;
        elsif jsonb_typeof(v_item) <> 'string' or v_text not in ('terms','privacy','returns','shipping','contact') then
          raise exception 'Invalid footer route' using errcode = '22023', hint = 'ADM-007';
        end if;
      end loop;
      if v_key = 'footer_order' and cardinality(v_seen) <> 5 then
        raise exception 'All policy links required' using errcode = '22023', hint = 'ADM-007';
      end if;
    elsif v_key in ('phone', 'whatsapp_url', 'instagram_url', 'tiktok_url') then
      if jsonb_typeof(v_value) <> 'string' or char_length(v_text) > 500 or (v_text <> '' and not (
        (v_key = 'phone' and v_text ~ '^\+?[0-9 ()-]{6,30}$') or
        (v_key = 'whatsapp_url' and v_text ~ '^https://(wa\.me|chat\.whatsapp\.com)/[A-Za-z0-9_/?=&%-]+$') or
        (v_key = 'instagram_url' and v_text ~ '^https://(www\.)?instagram\.com/[A-Za-z0-9_./?=&%-]+$') or
        (v_key = 'tiktok_url' and v_text ~ '^https://(www\.)?tiktok\.com/@[A-Za-z0-9_./?=&%-]+$')
      )) then
        raise exception 'Invalid public contact' using errcode = '22023', hint = 'ADM-007';
      end if;
    else
      raise exception 'Content field not allowed' using errcode = '22023', hint = 'ADM-008';
    end if;
  end loop;
  foreach v_base in array v_text_fields loop
    if (nullif(trim(p_content ->> (v_base || '_ar')), '') is null)
       <> (nullif(trim(p_content ->> (v_base || '_en')), '') is null) then
      raise exception 'Both translations required' using errcode = '22023', hint = 'ADM-007';
    end if;
  end loop;

  select updated_at into v_revision from public.shop_settings
    where key = 'storefront_content' for update;
  -- A stale revision is an expected editing conflict, not a raw database error.
  if v_revision is distinct from p_expected_updated_at then return null; end if;
  update public.shop_settings set value = p_content,
    updated_at = clock_timestamp(), updated_by = auth.uid()
    where key = 'storefront_content' returning updated_at into v_revision;
  return v_revision;
end;
$$;
revoke all on function public.admin_update_storefront_content(jsonb, timestamptz) from public, anon;
grant execute on function public.admin_update_storefront_content(jsonb, timestamptz) to authenticated;
-- END UNCHANGED MIGRATION

    if v_preserved_settings is distinct from (
      select coalesce(jsonb_agg(to_jsonb(s) order by key), '[]'::jsonb)
      from public.shop_settings s where key <> 'storefront_content'
    ) then raise exception 'Existing merchant settings changed; repair aborted'; end if;
  if not exists (select 1 from public.shop_settings where key = 'storefront_content'
      and value = '{}'::jsonb and is_public and updated_at is not null)
    or not exists (select 1 from public.audit_log where entity = 'shop_settings'
      and entity_id = 'storefront_content' and action = 'INSERT' and new->'value' = '{}'::jsonb)
    or has_function_privilege('anon', 'public.admin_update_storefront_content(jsonb,timestamptz)', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.admin_update_storefront_content(jsonb,timestamptz)', 'EXECUTE') then
    raise exception 'Content seed, audit or function permissions failed verification';
  end if;
    if not v_apply then
      raise exception using errcode = 'P310F', message = 'Internal successful-rehearsal rollback';
    end if;
    notify pgrst, 'reload schema';
  exception when sqlstate 'P310F' then
    -- Catch only our successful-rehearsal signal. Real errors abort the statement.
    null;
  end;

  if not v_apply then
    if exists (select 1 from public.shop_settings where key = 'storefront_content')
      or to_regprocedure('public.admin_update_storefront_content(jsonb,timestamptz)') is not null
      or v_preserved_settings is distinct from (
        select coalesce(jsonb_agg(to_jsonb(s) order by key), '[]'::jsonb) from public.shop_settings s
      ) then raise exception 'Rehearsal rollback verification failed'; end if;
    raise notice 'REHEARSAL PASSED: editor installation rolled back; no settings saved.';
  else
    raise notice 'REPAIR APPLIED: editor row and function installed; RLS retained. Run the read-only check.';
  end if;
end;
$editor_repair$;
select jsonb_build_object(
  'content_rows', (select count(*) from public.shop_settings where key = 'storefront_content'),
  'settings_rls', (select relrowsecurity from pg_class where oid = 'public.shop_settings'::regclass),
  'save_function_exists', to_regprocedure('public.admin_update_storefront_content(jsonb,timestamptz)') is not null
) as editor_repair_result;

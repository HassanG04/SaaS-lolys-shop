-- =====================================================================
-- 20261018160000_customer_profile_photo.sql
-- Customer Profile Photo (T-2.11)
-- Implements user-owned validated avatar storage, replacement cleanup,
-- folder security triggers, RLS policies, and GDPR erasure support.
-- =====================================================================

-- 1. Add avatar_url column to profiles
alter table public.profiles
  add column if not exists avatar_url text;

-- 2. Constraints on profiles.avatar_url
alter table public.profiles
  drop constraint if exists profiles_avatar_url_length;
alter table public.profiles
  add constraint profiles_avatar_url_length
  check (avatar_url is null or char_length(avatar_url) <= 300);

alter table public.profiles
  drop constraint if exists profiles_avatar_url_path;
alter table public.profiles
  add constraint profiles_avatar_url_path
  check (avatar_url is null or avatar_url ~ '^[0-9a-fA-F-]{36}/[A-Za-z0-9/_-]+\.(webp|jpg|jpeg|png)$');

-- 3. Grant column update permissions to authenticated role
grant update (avatar_url) on public.profiles to authenticated;

-- 4. User folder integrity trigger:
-- Ensures avatar_url belongs to the profile's own user ID folder
create or replace function public.validate_profile_avatar()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.avatar_url is not null then
    if split_part(new.avatar_url, '/', 1) <> new.id::text then
      raise exception 'Avatar path must match user ID: %', new.id
        using errcode = '23514', hint = 'SEC-001';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_profile_avatar on public.profiles;
create trigger trg_validate_profile_avatar
  before insert or update on public.profiles
  for each row
  execute function public.validate_profile_avatar();

-- 5. Storage bucket 'avatars' with 2 MB limit and allowed image MIME types
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152, -- 2 MB limit
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = true,
      file_size_limit = 2097152,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- 6. Storage RLS policies for 'avatars' bucket
-- 6a. Public read access
drop policy if exists "public read avatars" on storage.objects;
create policy "public read avatars" on storage.objects
  for select
  using (bucket_id = 'avatars');

-- 6b. User-owned upload (INSERT)
drop policy if exists "user upload avatar" on storage.objects;
create policy "user upload avatar" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- 6c. User-owned update (UPDATE)
drop policy if exists "user update avatar" on storage.objects;
create policy "user update avatar" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- 6d. User delete avatar (DELETE) - owner or admin
drop policy if exists "user delete avatar" on storage.objects;
create policy "user delete avatar" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or public.is_admin()
    )
  );

-- 7. Automated replacement cleanup trigger:
-- When a user changes or removes their avatar_url, purge the old storage object
create or replace function public.cleanup_old_avatar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.avatar_url is not null and (new.avatar_url is null or new.avatar_url <> old.avatar_url) then
    delete from storage.objects
     where bucket_id = 'avatars'
       and name = old.avatar_url;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_cleanup_old_avatar on public.profiles;
create trigger trg_cleanup_old_avatar
  after update on public.profiles
  for each row
  execute function public.cleanup_old_avatar();

-- 8. Automated profile deletion cleanup trigger
create or replace function public.cleanup_deleted_profile_avatar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.avatar_url is not null then
    delete from storage.objects
     where bucket_id = 'avatars'
       and name = old.avatar_url;
  end if;
  return old;
end;
$$;

drop trigger if exists trg_cleanup_deleted_profile_avatar on public.profiles;
create trigger trg_cleanup_deleted_profile_avatar
  after delete on public.profiles
  for each row
  execute function public.cleanup_deleted_profile_avatar();

-- 9. Update admin_anonymize_customer to clear avatar_url and purge storage objects
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
         email = null,
         postal_code = null,
         avatar_url = null,
         governorate_id = null,
         city = null,
         address = null,
         district = null,
         floor = null,
         apartment = null,
         landmark = null
   where id = p_user_id;

  -- 5. Delete customer avatar from storage
  delete from storage.objects
   where bucket_id = 'avatars'
     and (storage.foldername(name))[1] = p_user_id::text;

  -- 6. Anonymize personal delivery and contact info on all orders belonging to user
  update public.orders
     set ship_name = 'عميل مجهول',
         ship_phone = '00000000000',
         ship_address = 'عنوان ممسوح',
         ship_city = 'مدينة ممسوحة',
         ship_postal_code = '00000',
         ship_district = null,
         ship_floor = null,
         ship_apartment = null,
         ship_landmark = null
   where user_id = p_user_id;

  -- 7. Audit log the anonymization action with metadata
  insert into public.audit_log (
    actor,
    actor_role,
    action,
    entity,
    entity_id,
    old,
    new
  ) values (
    auth.uid(),
    'admin',
    'anonymize_customer',
    'profiles',
    p_user_id::text,
    jsonb_build_object('orders_count', v_orders_count),
    jsonb_build_object('anonymized', true, 'avatar_purged', true)
  );
end;
$$;

revoke all on function public.admin_anonymize_customer(uuid) from public, anon;
grant execute on function public.admin_anonymize_customer(uuid) to authenticated;

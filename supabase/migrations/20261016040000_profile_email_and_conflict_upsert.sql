-- Migration: Add email column to profiles, update handle_new_user with email sync, and backfill
-- Purpose:
--   1. Add 'email' column to public.profiles so registered emails are directly connected,
--      visible in Table Editor, and accessible for direct admin role updates without subqueries.
--   2. Update handle_new_user() trigger to save the registered email on new user creation
--      and handle conflicts by updating email and profile info rather than failing or dropping.
--   3. Backfill all existing profiles with their corresponding email from auth.users.

-- 1. Add email column to profiles
alter table public.profiles
  add column if not exists email text;

-- Index email for fast admin queries and lookups
create index if not exists idx_profiles_email on public.profiles(email);

-- 2. Update handle_new_user() to persist email and upsert on conflict
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, email)
  values (
    new.id,
    substring(coalesce(new.raw_user_meta_data ->> 'full_name', '') from 1 for 100),
    substring(new.raw_user_meta_data ->> 'phone' from 1 for 20),
    new.email
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = case
      when public.profiles.full_name is null or public.profiles.full_name = ''
      then excluded.full_name
      else public.profiles.full_name
    end,
    phone = coalesce(public.profiles.phone, excluded.phone);
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated, service_role;

-- 3. Backfill: update all profiles that lack an email using auth.users
update public.profiles p
   set email = u.email
  from auth.users u
 where p.id = u.id
   and (p.email is null or p.email <> u.email);

-- 4. Backfill any missing profile records entirely
insert into public.profiles (id, full_name, phone, email)
select
  u.id,
  substring(coalesce(u.raw_user_meta_data ->> 'full_name', '') from 1 for 100),
  substring(u.raw_user_meta_data ->> 'phone' from 1 for 20),
  u.email
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do update set
  email = excluded.email;

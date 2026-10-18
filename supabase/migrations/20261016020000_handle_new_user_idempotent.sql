-- Migration: handle_new_user idempotent insert + profile backfill
-- Purpose:
--   1. Replace the plain INSERT in handle_new_user with ON CONFLICT (id) DO NOTHING
--      so that re-registration of an already-authenticated user (e.g. after a public
--      schema reset that wiped public.profiles but left auth.users intact) no longer
--      raises a duplicate-key error or silently drops the profile row.
--   2. Backfill any auth.users rows that exist but are missing a public.profiles row
--      (happens when public schema was dropped/recreated while auth schema was kept).

-- 1. Harden handle_new_user with ON CONFLICT DO NOTHING
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    substring(coalesce(new.raw_user_meta_data ->> 'full_name', '') from 1 for 100),
    substring(new.raw_user_meta_data ->> 'phone' from 1 for 20)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Re-apply existing security grants (append-only; do not remove prior revokes)
revoke all on function public.handle_new_user() from public, anon, authenticated, service_role;

-- 2. Backfill: insert a profile row for every auth user that lacks one.
--    Sets role to 'customer' by default; the owner can promote admins separately.
insert into public.profiles (id, full_name, phone)
select
  u.id,
  substring(coalesce(u.raw_user_meta_data ->> 'full_name', '') from 1 for 100),
  substring(u.raw_user_meta_data ->> 'phone' from 1 for 20)
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- Lolys development reset (OWNER REVIEW REQUIRED; DO NOT RUN UNEDITED)
--
-- This is intentionally a preview transaction. It deletes every order and every
-- auth account, including admins, when the preflight checks are clear. Profiles
-- and order_items follow their documented foreign keys. Audit history is kept.
-- Product stock is NOT rebuilt, because stock_movements is append-only.
--
-- Before using a COMMIT version:
-- 1. Export anything you need. Remove every owned object from Storage through
--    the Storage API/Dashboard; deleting storage.objects with SQL leaves files
--    orphaned and can block auth.users deletion.
-- 2. Confirm this is the intended Supabase project and take a database backup.
-- 3. Resolve any preflight exception with an owner-reviewed migration. Never
--    disable RLS, audit triggers, or the stock ledger trigger to force a reset.

begin;

do $$
begin
  if exists (
    select 1
    from public.stock_movements sm
    join public.orders o on o.id = sm.order_id
  ) then
    raise exception 'Reset blocked: stock_movements references orders; preserve the append-only stock ledger.';
  end if;

  if exists (
    select 1
    from public.stock_movements sm
    join auth.users u on u.id = sm.actor
  ) then
    raise exception 'Reset blocked: stock_movements references user actors; preserve the append-only stock ledger.';
  end if;

  if to_regclass('storage.objects') is not null and exists (
    select 1
    from storage.objects so
    join auth.users u on so.owner_id = u.id::text
  ) then
    raise exception 'Reset blocked: Storage objects still belong to users; remove them through Storage API first.';
  end if;
end
$$;

select 'orders before' as check, count(*)::bigint as count from public.orders
union all
select 'auth users before', count(*)::bigint from auth.users;

-- Keep settings usable after deleting the admin who last edited them.
update public.shop_settings set updated_by = null where updated_by is not null;

delete from public.orders;
delete from auth.users;

select 'orders after preview' as check, count(*)::bigint as count from public.orders
union all
select 'auth users after preview', count(*)::bigint from auth.users;

-- Change only this final statement after reviewing both result sets and the
-- preflight output. COMMIT is intentionally not the default.
rollback;

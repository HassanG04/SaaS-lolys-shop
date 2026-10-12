-- =====================================================================
-- 20261012043500_audit_log.sql : T-1.16 Audit log & triggers
-- Scenario S21: Audit log records admin & owner changes, append-only,
-- unreadable by customers, protected against update and delete.
-- =====================================================================

-- 1. Create table audit_log
create table public.audit_log (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  actor       uuid,
  actor_role  text not null,
  action      text not null,
  entity      text not null,
  entity_id   text not null,
  old         jsonb,
  new         jsonb
);

create index audit_log_at_idx on public.audit_log (at desc);
create index audit_log_entity_idx on public.audit_log (entity, entity_id);

-- 2. RLS & Permissions
alter table public.audit_log enable row level security;

create policy "admin_read_audit_log"
  on public.audit_log
  for select
  using (public.is_admin());

revoke all on table public.audit_log from public, anon;
grant select on table public.audit_log to authenticated;

-- 3. Immutability trigger: blocks update and delete for everyone
create or replace function public.audit_log_immutable()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_log is append-only; update and delete are prohibited'
    using errcode = '42501', hint = 'SEC-019';
end;
$$;

drop trigger if exists audit_log_immutable_trigger on public.audit_log;
create trigger audit_log_immutable_trigger
  before update or delete on public.audit_log
  for each row execute function public.audit_log_immutable();

-- 4. audit_event() helper for functions
create or replace function public.audit_event(
  p_action text,
  p_entity text,
  p_entity_id text,
  p_old jsonb default null,
  p_new jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
begin
  if v_uid is not null then
    select role::text into v_role from public.profiles where id = v_uid;
  else
    v_role := current_user;
  end if;

  insert into public.audit_log (actor, actor_role, action, entity, entity_id, old, new)
  values (v_uid, coalesce(v_role, 'unknown'), p_action, p_entity, p_entity_id, p_old, p_new);
end;
$$;

revoke all on function public.audit_event(text, text, text, jsonb, jsonb) from public, anon;
grant execute on function public.audit_event(text, text, text, jsonb, jsonb) to authenticated;

-- 5. Trigger function process_audit_log()
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

-- 6. Attach triggers
drop trigger if exists audit_products on public.products;
create trigger audit_products
  after insert or update or delete on public.products
  for each row execute function public.process_audit_log();

drop trigger if exists audit_categories on public.categories;
create trigger audit_categories
  after insert or update or delete on public.categories
  for each row execute function public.process_audit_log();

drop trigger if exists audit_delivery_fees on public.delivery_fees;
create trigger audit_delivery_fees
  after insert or update or delete on public.delivery_fees
  for each row execute function public.process_audit_log();

drop trigger if exists audit_orders on public.orders;
create trigger audit_orders
  after insert or update or delete on public.orders
  for each row execute function public.process_audit_log();

drop trigger if exists audit_profiles on public.profiles;
create trigger audit_profiles
  after update of role on public.profiles
  for each row execute function public.process_audit_log();

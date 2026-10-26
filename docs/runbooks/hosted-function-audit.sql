-- Targeted follow-up to the owner's 2026-10-26 schema export.
-- Run the WHOLE query in the same Supabase SQL Editor; export function_audit.
-- Read-only: returns the TWO unresolved functions and effective permissions.
-- Does not call these functions or read accounts, orders or setting values.
-- Review function source before sharing if you have embedded private literals.
with app_functions as (
  select p.oid, n.nspname as schema_name, p.proname
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where p.oid in (
    to_regprocedure('public.place_order(jsonb,public.delivery_method,public.payment_method,jsonb)'),
    to_regprocedure('public.get_payment_instructions(bigint)')
  )
), api_roles as (
  select oid, rolname from pg_catalog.pg_roles
  where rolname in ('anon', 'authenticated', 'analytics_reader', 'analytics_writer')
)
select jsonb_build_object(
  'functions', coalesce((select jsonb_agg(jsonb_build_object(
    'schema', schema_name, 'name', proname,
    'arguments', pg_catalog.pg_get_function_identity_arguments(oid),
    'definition', pg_catalog.pg_get_functiondef(oid)
  ) order by schema_name, proname, pg_catalog.pg_get_function_identity_arguments(oid))
  from app_functions), '[]'::jsonb),
  'public_schema_permissions', (select jsonb_agg(jsonb_build_object(
    'role', rolname,
    'usage', pg_catalog.has_schema_privilege(oid, 'public', 'USAGE'),
    'create', pg_catalog.has_schema_privilege(oid, 'public', 'CREATE')
  ) order by rolname) from api_roles),
  'sequence_permissions', coalesce((select jsonb_agg(jsonb_build_object(
    'sequence', c.relname, 'role', r.rolname,
    'usage', pg_catalog.has_sequence_privilege(r.oid, c.oid, 'USAGE'),
    'select', pg_catalog.has_sequence_privilege(r.oid, c.oid, 'SELECT'),
    'update', pg_catalog.has_sequence_privilege(r.oid, c.oid, 'UPDATE')
  ) order by c.relname, r.rolname)
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  cross join api_roles r where n.nspname = 'public' and c.relkind = 'S'), '[]'::jsonb)
) as function_audit;

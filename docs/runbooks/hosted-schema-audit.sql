-- Read-only schema inventory for an existing shop without migration history.
-- Run the entire SELECT in the target Supabase SQL Editor as the project owner.
-- Returns ONE result row, so the editor's 100-row limit cannot truncate sections.
-- No customer rows, credentials, setting values, file paths or function bodies.
-- Fingerprints identify definitions to compare; they are NOT migration proof.
with app_relations as (
  select c.*, n.nspname as schema_name
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'analytics')
    and c.relkind in ('r', 'p', 'v', 'm', 'S')
    and not exists (
      select 1 from pg_catalog.pg_depend d
      where d.classid = 'pg_catalog.pg_class'::regclass
        and d.objid = c.oid and d.deptype = 'e'
    )
), app_functions as (
  select p.*, n.nspname as schema_name
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'analytics')
    and p.prokind in ('f', 'p')
    and not exists (
      select 1 from pg_catalog.pg_depend d
      where d.classid = 'pg_catalog.pg_proc'::regclass
        and d.objid = p.oid and d.deptype = 'e'
    )
), app_columns as (
  select c.schema_name, c.relname, a.attnum,
    jsonb_build_object(
      'name', a.attname,
      'type', pg_catalog.format_type(a.atttypid, a.atttypmod),
      'not_null', a.attnotnull,
      'identity', a.attidentity,
      'generated', a.attgenerated,
      'default_md5', md5(pg_catalog.pg_get_expr(d.adbin, d.adrelid)),
      'acl', a.attacl::text
    ) as definition
  from app_relations c
  join pg_catalog.pg_attribute a on a.attrelid = c.oid
  left join pg_catalog.pg_attrdef d on d.adrelid = c.oid and d.adnum = a.attnum
  where a.attnum > 0 and not a.attisdropped and c.relkind <> 'S'
), report as (
  select 'meta' as section, jsonb_build_object(
    'format_version', 1,
    'server_version_num', current_setting('server_version_num'),
    'migration_history_present', to_regclass('supabase_migrations.schema_migrations') is not null,
    'analytics_schema_present', exists (
      select 1 from pg_catalog.pg_namespace where nspname = 'analytics'
    )
  ) as details
  union all
  select 'schemas', coalesce(jsonb_agg(jsonb_build_object(
    'name', n.nspname, 'owner', pg_catalog.pg_get_userbyid(n.nspowner),
    'acl', n.nspacl::text
  ) order by n.nspname), '[]'::jsonb)
  from pg_catalog.pg_namespace n where n.nspname in ('public', 'analytics')
  union all
  select 'relations', coalesce(jsonb_agg(jsonb_build_object(
    'schema', c.schema_name, 'name', c.relname, 'kind', c.relkind,
    'owner', pg_catalog.pg_get_userbyid(c.relowner),
    'rls_enabled', c.relrowsecurity, 'rls_forced', c.relforcerowsecurity,
    'options', c.reloptions, 'acl', c.relacl::text,
    'view_md5', case when c.relkind in ('v', 'm')
      then md5(pg_catalog.pg_get_viewdef(c.oid, false)) else null end,
    'columns', coalesce((
      select jsonb_agg(a.definition order by a.attnum)
      from app_columns a
      where a.schema_name = c.schema_name and a.relname = c.relname
    ), '[]'::jsonb)
  ) order by c.schema_name, c.relname), '[]'::jsonb)
  from app_relations c
  union all
  select 'enums', coalesce(jsonb_agg(jsonb_build_object(
    'schema', n.nspname, 'name', t.typname,
    'labels', (
      select jsonb_agg(e.enumlabel order by e.enumsortorder)
      from pg_catalog.pg_enum e where e.enumtypid = t.oid
    )
  ) order by n.nspname, t.typname), '[]'::jsonb)
  from pg_catalog.pg_type t
  join pg_catalog.pg_namespace n on n.oid = t.typnamespace
  where n.nspname in ('public', 'analytics') and t.typtype = 'e'
  union all
  select 'constraints', coalesce(jsonb_agg(jsonb_build_object(
    'schema', c.schema_name, 'table', c.relname, 'name', k.conname,
    'type', k.contype, 'validated', k.convalidated,
    'definition_md5', md5(pg_catalog.pg_get_constraintdef(k.oid, false))
  ) order by c.schema_name, c.relname, k.conname), '[]'::jsonb)
  from pg_catalog.pg_constraint k join app_relations c on c.oid = k.conrelid
  union all
  select 'indexes', coalesce(jsonb_agg(jsonb_build_object(
    'schema', c.schema_name, 'table', c.relname, 'name', idx.relname,
    'valid', i.indisvalid, 'definition_md5', md5(pg_catalog.pg_get_indexdef(i.indexrelid))
  ) order by c.schema_name, c.relname, idx.relname), '[]'::jsonb)
  from pg_catalog.pg_index i
  join app_relations c on c.oid = i.indrelid
  join pg_catalog.pg_class idx on idx.oid = i.indexrelid
  union all
  select 'policies', coalesce(jsonb_agg(jsonb_build_object(
    'schema', p.schemaname, 'table', p.tablename, 'name', p.policyname,
    'permissive', p.permissive, 'roles', p.roles, 'command', p.cmd,
    'using_md5', md5(p.qual), 'check_md5', md5(p.with_check)
  ) order by p.schemaname, p.tablename, p.policyname), '[]'::jsonb)
  from pg_catalog.pg_policies p
  where p.schemaname in ('public', 'analytics', 'storage')
  union all
  select 'functions', coalesce(jsonb_agg(jsonb_build_object(
    'schema', p.schema_name, 'name', p.proname,
    'arguments', pg_catalog.pg_get_function_identity_arguments(p.oid),
    'result', pg_catalog.pg_get_function_result(p.oid),
    'owner', pg_catalog.pg_get_userbyid(p.proowner),
    'security_definer', p.prosecdef, 'volatility', p.provolatile,
    'search_path', (
      select setting from unnest(p.proconfig) as setting
      where setting like 'search_path=%' limit 1
    ),
    'acl', p.proacl::text,
    'definition_md5', md5(pg_catalog.pg_get_functiondef(p.oid)),
    'can_execute', (
      select jsonb_object_agg(r.rolname, pg_catalog.has_function_privilege(r.oid, p.oid, 'EXECUTE'))
      from pg_catalog.pg_roles r
      where r.rolname in ('anon', 'authenticated', 'analytics_reader', 'analytics_writer')
    )
  ) order by p.schema_name, p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid)), '[]'::jsonb)
  from app_functions p
  union all
  select 'triggers', coalesce(jsonb_agg(jsonb_build_object(
    'schema', n.nspname, 'table', c.relname, 'name', t.tgname,
    'enabled', t.tgenabled, 'function_schema', fn.nspname, 'function_name', p.proname,
    'definition_md5', md5(pg_catalog.pg_get_triggerdef(t.oid, false))
  ) order by n.nspname, c.relname, t.tgname), '[]'::jsonb)
  from pg_catalog.pg_trigger t
  join pg_catalog.pg_class c on c.oid = t.tgrelid
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  join pg_catalog.pg_proc p on p.oid = t.tgfoid
  join pg_catalog.pg_namespace fn on fn.oid = p.pronamespace
  where not t.tgisinternal and (
    n.nspname in ('public', 'analytics') or (
      n.nspname in ('auth', 'storage') and fn.nspname in ('public', 'analytics')
    )
  )
  union all
  select 'roles', coalesce(jsonb_agg(jsonb_build_object(
    'name', r.rolname, 'superuser', r.rolsuper, 'bypass_rls', r.rolbypassrls,
    'can_login', r.rolcanlogin
  ) order by r.rolname), '[]'::jsonb)
  from pg_catalog.pg_roles r
  where r.rolname in ('anon', 'authenticated', 'analytics_reader', 'analytics_writer')
  union all
  select 'default_privileges', coalesce(jsonb_agg(jsonb_build_object(
    'schema', n.nspname, 'owner', pg_catalog.pg_get_userbyid(d.defaclrole),
    'object_type', d.defaclobjtype, 'acl', d.defaclacl::text
  ) order by n.nspname, d.defaclrole, d.defaclobjtype), '[]'::jsonb)
  from pg_catalog.pg_default_acl d
  left join pg_catalog.pg_namespace n on n.oid = d.defaclnamespace
  where n.nspname in ('public', 'analytics') or d.defaclnamespace = 0
  union all
  select 'storage_buckets', coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'public', public, 'file_size_limit', file_size_limit,
    'allowed_mime_types', allowed_mime_types
  ) order by id), '[]'::jsonb)
  from storage.buckets
  where id in ('product-images', 'payment-proofs', 'avatars')
  union all
  select 'setting_keys', coalesce(jsonb_agg(jsonb_build_object(
    'key', key, 'is_public', is_public
  ) order by key), '[]'::jsonb)
  from public.shop_settings
)
select jsonb_object_agg(section, details order by section) as schema_audit
from report;

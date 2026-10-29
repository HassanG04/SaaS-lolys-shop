// Local-only rehearsal: schema clone, synthetic records, then drop the clone.
// Never runs db:reset and never connects to a hosted database.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { buildHostedFeatures, section } from './build-hosted-features.mjs'

const container = 'supabase_db_lolys-ci-auth-repair'
const fixture = 'lolys_features_rehearsal_20261029'
const read = (path) => readFileSync(path, 'utf8').replaceAll('\r\n', '\n')
const run = (args, input) =>
  execFileSync('docker', args, {
    input,
    encoding: 'utf8',
    windowsHide: true,
    timeout: 120_000,
    maxBuffer: 24 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim()
const endpoint =
  process.env.DOCKER_HOST || run(['context', 'inspect', '--format', '{{.Endpoints.docker.Host}}'])
assert(
  endpoint.startsWith('npipe:////./pipe/') || endpoint.startsWith('unix:///'),
  'Only local Docker is permitted',
)
const query = (db, sql, user = 'postgres') =>
  run(
    ['exec', '-i', container, 'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-U', user, '-d', db],
    sql,
  )
const sql = (statement) => query(fixture, statement)
assert.equal(
  query('postgres', `select count(*) from pg_database where datname = '${fixture}'`),
  '0',
  'Disposable fixture already exists; inspect it before retrying',
)
const dump = run([
  'exec',
  container,
  'pg_dump',
  '--schema-only',
  '--no-publications',
  '--no-subscriptions',
  '-U',
  'postgres',
  '-d',
  'postgres',
])
query('postgres', `create database ${fixture} template template0`)
try {
  query(fixture, dump, 'supabase_admin')
  sql(`create extension if not exists pgtap with schema extensions;
    drop table public.customer_notifications, public.customer_suggestions, public.admin_occasion_reminders cascade;
    drop function public.guard_order_postal_code(), public.guard_profile_postal_code(),
      public.validate_profile_avatar(), public.cleanup_old_avatar(), public.cleanup_deleted_profile_avatar(),
      public.notify_on_order_approved(), public.notify_on_wishlist_sale(), public.mark_all_notifications_read(),
      public.submit_customer_suggestion(text,text), public.admin_review_suggestion(uuid,text,text),
      public.admin_broadcast_sale_notification(text,text,text,text,text), public.admin_get_wishlist_demand(),
      public.admin_get_upcoming_occasions(integer), public.admin_generate_occasion_reminders(integer),
      public.admin_get_occasion_reminders(), public.admin_dismiss_occasion_reminder(uuid) cascade;
    drop function if exists public.admin_get_forecast_export(boolean);
    alter table public.profiles drop column avatar_url;
    alter table public.orders alter column ship_postal_code drop not null;
    drop schema if exists supabase_migrations cascade;
    drop policy if exists "public read avatars" on storage.objects;
    drop policy if exists "user upload avatar" on storage.objects;
    drop policy if exists "user update avatar" on storage.objects;
    drop policy if exists "user delete avatar" on storage.objects;
    insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
      ('product-images','product-images',true,3145728,array['image/jpeg','image/png','image/webp']),
      ('payment-proofs','payment-proofs',false,5242880,array['image/jpeg','image/png','image/webp']);`)
  for (const [name, file] of [
    ['admin_anonymize_customer', '20261014170000_customer_anonymization'],
    ['admin_update_setting', '20261014023000_order_approval_and_saved_address'],
  ]) {
    sql(
      section(
        read(`supabase/migrations/${file}.sql`),
        `create or replace function public.${name}(`,
        '\n$$;',
      ) + '$$;',
    )
  }
  const settings = read('supabase/migrations/20261012044500_shop_settings.sql').match(
    /insert into public\.shop_settings[\s\S]+?on conflict \(key\) do nothing;/,
  )[0]
  const calendar = read('supabase/migrations/20261014230000_analytics_foundation.sql').match(
    /insert into analytics\.calendar[\s\S]+?;/,
  )[0]
  sql(`${settings}
    ${calendar}
    ${read('supabase/migrations/20261010232051_reference_data.sql')}
    ${read('supabase/seed.sql')}
    insert into public.shop_settings(key,value,is_public) values
      ('storefront_content','{"hero_title_en":"Existing merchant heading","hero_title_ar":"عنوان المتجر"}',true),
      ('occasion_reminder_advance_days','14',false),
      ('instapay_link','"https://ipn.eg/S/fixture"',false),
      ('instapay_handle','"alaa.ahm9624@instapay"',false),
      ('require_order_approval','true',true),('approval_window_hours','24',false)
    on conflict(key) do nothing;
    update public.shop_settings set is_public = false
      where key in ('instapay_handle','instapay_qr_path','instapay_link');
    insert into auth.users(id,email,raw_user_meta_data)
      values ('10000000-0000-4000-8000-000000000001','feature-fixture@example.invalid','{}');
    update public.profiles set address = 'Historical address', governorate_id = 1
      where id = '10000000-0000-4000-8000-000000000001';
    insert into public.orders(user_id,delivery_method,subtotal,shipping_fee,total,ship_name,ship_phone,ship_governorate,ship_address)
      values ('10000000-0000-4000-8000-000000000001','representative',100,37,137,'Historic','01000000000','Cairo','Historical address');
    alter table public.orders add constraint orders_ship_postal_code_not_null
      check (ship_postal_code is not null and ship_postal_code ~ '^[0-9]{5}$') not valid;
    alter table public.profiles add constraint profiles_address_postal_code_required
      check ((address is null and governorate_id is null) or (postal_code is not null and postal_code ~ '^[0-9]{5}$')) not valid;
    -- Simulate permissive hosted table defaults; the installer must remove them.
    alter default privileges for role postgres in schema public grant all on tables to anon, authenticated;`)

  const snapshot = () =>
    sql(`select jsonb_build_object(
    'profiles',(select jsonb_agg(to_jsonb(t)-'avatar_url' order by id) from public.profiles t),
    'orders',(select jsonb_agg(to_jsonb(t) order by id) from public.orders t),
    'products',(select jsonb_agg(to_jsonb(t) order by id) from public.products t),
    'settings',(select jsonb_agg(to_jsonb(t) order by key) from public.shop_settings t),
    'users',(select count(*) from auth.users))`)
  const before = snapshot()
  const installer = buildHostedFeatures()
  // A changed MFA function, unknown settings function, missing RLS or partial install
  // must fail before mutations. The connection closes, rolling back each test probe.
  for (const [label, change, pattern] of [
    [
      'MFA drift',
      'alter function public.require_admin() set search_path = public, pg_temp;',
      /MFA helpers differ/,
    ],
    [
      'unknown settings implementation',
      'create or replace function public.admin_update_setting(p_key text,p_value jsonb) returns void language plpgsql security definer set search_path=public as $$ begin null; end; $$;',
      /Unrecognized admin_update_setting/,
    ],
    ['missing RLS', 'alter table public.profiles disable row level security;', /RLS is missing/],
    [
      'partial feature installation',
      'alter table public.profiles add column avatar_url text;',
      /already or partly installed/,
    ],
  ]) {
    assert.throws(
      () => sql(installer.replace('do $preflight$', () => `${change}\ndo $preflight$`)),
      pattern,
    )
    assert.equal(snapshot(), before)
    console.log(`PASS: refused ${label} and rolled back`)
  }
  // Inject a failure AFTER all DDL to prove atomic rollback, not merely preflight rejection.
  assert.throws(
    () =>
      sql(
        installer.replace(
          "notify pgrst, 'reload schema';",
          () => "do $$ begin raise exception 'injected postflight failure'; end; $$;",
        ),
      ),
    /injected postflight failure/,
  )
  assert.equal(snapshot(), before)
  assert.equal(sql("select to_regclass('public.customer_notifications') is null"), 't')
  console.log(
    'PASS: failed final check rolled back every schema change and preserved existing records',
  )

  const check = JSON.parse(sql(installer))
  assert(
    Object.values(check).every((value) => value === true),
    'Every installation check must be true',
  )
  assert.equal(snapshot(), before)
  console.log(
    'PASS: committed installer preserved existing accounts, orders, stock, settings and editor',
  )
  assert.throws(() => sql(installer), /already or partly installed/)
  assert.equal(snapshot(), before)
  console.log('PASS: second application refused without changes')
  sql(`update public.orders set status = 'shipped' where user_id = '10000000-0000-4000-8000-000000000001';
    update public.profiles set full_name = 'Still editable' where id = '10000000-0000-4000-8000-000000000001';`)
  assert.equal(
    sql(
      "select ship_postal_code is null from public.orders where user_id = '10000000-0000-4000-8000-000000000001'",
    ),
    't',
  )
  console.log('PASS: historical missing postal codes remain unchanged and do not block fulfillment')

  // Reset only synthetic content to the existing regression suites' fixture assumptions.
  sql(`delete from public.orders where user_id = '10000000-0000-4000-8000-000000000001';
    delete from auth.users where id = '10000000-0000-4000-8000-000000000001';
    update public.shop_settings set value = '{}' where key = 'storefront_content';`)
  const selected = /^(00000|16_|18_|19_|20_|21_|22_|24_)/
  let assertions = 0
  for (const file of readdirSync('supabase/tests/database')
    .filter((f) => selected.test(f))
    .sort()) {
    let regression = read(`supabase/tests/database/${file}`)
    if (file === '21_notifications_and_suggestions.test.sql') {
      // Main's original test assumes Supabase's default anonymous SELECT grant.
      // This repair revokes it: require 42501, which is stricter than empty rows.
      // Same reviewed expectation as the earlier hosted-schema repair branch.
      const oldAssertion =
        "SELECT is(\n  (SELECT count(*)::integer FROM public.customer_notifications),\n  0,\n  'Anonymous sees no customer notifications'\n);"
      assert(regression.includes(oldAssertion), 'Reconcile updated notification test before replay')
      regression = regression.replace(
        oldAssertion,
        () =>
          "SELECT throws_ok(\n  $$SELECT * FROM public.customer_notifications$$,\n  '42501', NULL,\n  'Anonymous cannot read the private notification table'\n);",
      )
    }
    const output = sql(`set search_path=public,extensions;\n${regression}`)
    assert(
      !/^not ok\b|Looks like you (?:failed|planned)|No plan found/m.test(output),
      `${file}\n${output}`,
    )
    assertions += (output.match(/^ok \d+/gm) || []).length
    console.log(`PASS: ${file}`)
  }
  const csv = sql(
    `set search_path=public,extensions;\n${read('docs/runbooks/hosted-features/forecast-export.test.sql')}`,
  )
  assert(!/^not ok\b|Looks like you (?:failed|planned)|No plan found/m.test(csv), csv)
  assertions += (csv.match(/^ok \d+/gm) || []).length
  console.log(
    `PASS: ${assertions} database assertions including CSV authorization, readiness and aggregate correctness`,
  )
} finally {
  query('postgres', `drop database ${fixture}`)
  console.log('Removed only the disposable rehearsal database')
}

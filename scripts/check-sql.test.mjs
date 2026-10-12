import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ALLOW_LISTED_ANON_TABLES,
  checkMigrations,
  checkSql,
  removeCommentsPreservingLines,
  splitStatements,
} from './check-sql.mjs'

const scriptPath = fileURLToPath(new URL('./check-sql.mjs', import.meta.url))

test('removeCommentsPreservingLines strips SQL comments while preserving line count', () => {
  const sql = `-- Line 1 comment\nSELECT 1;\n/* Line 3\nLine 4 */\nSELECT 2;`
  const cleaned = removeCommentsPreservingLines(sql)
  assert.equal(cleaned.split('\n').length, 5)
  assert.ok(!cleaned.includes('Line 1 comment'))
  assert.ok(!cleaned.includes('Line 3'))
  assert.ok(cleaned.includes('SELECT 1;'))
  assert.ok(cleaned.includes('SELECT 2;'))
})

test('removeCommentsPreservingLines does not strip comment tokens inside string literals', () => {
  const sql = `SELECT '-- not a comment' AS val;`
  const cleaned = removeCommentsPreservingLines(sql)
  assert.ok(cleaned.includes("'-- not a comment'"))
})

test('splitStatements handles dollar-quoted blocks without splitting internal semicolons', () => {
  const sql = `
CREATE OR REPLACE FUNCTION public.demo() RETURNS void AS $$
BEGIN
  SELECT 1;
  SELECT 2;
END;
$$ LANGUAGE plpgsql;
SELECT 3;
`
  const stmts = splitStatements(sql)
  assert.equal(stmts.length, 2)
  assert.ok(stmts[0].text.includes('CREATE OR REPLACE FUNCTION'))
  assert.ok(stmts[0].text.includes('SELECT 1;'))
  assert.ok(stmts[1].text.includes('SELECT 3;'))
})

test('Rule 1: Fails on dynamic EXECUTE with string concatenation (||)', () => {
  const bad1 = `
CREATE OR REPLACE FUNCTION public.bad_dyn1(tbl text) RETURNS void AS $$
BEGIN
  EXECUTE 'SELECT * FROM ' || tbl;
END;
$$ LANGUAGE plpgsql;
`
  const violations1 = checkSql(bad1)
  assert.equal(violations1.length, 1)
  assert.equal(violations1[0].rule, 'EXECUTE_STRING_CONCAT')

  const bad2 = `
CREATE OR REPLACE FUNCTION public.bad_dyn2(q text) RETURNS void AS $$
BEGIN
  EXECUTE q || ' WHERE id = 1';
END;
$$ LANGUAGE plpgsql;
`
  const violations2 = checkSql(bad2)
  assert.equal(violations2.length, 1)
  assert.equal(violations2[0].rule, 'EXECUTE_STRING_CONCAT')

  const bad3 = `
CREATE OR REPLACE FUNCTION public.bad_dyn3(tbl text, val text) RETURNS void AS $$
BEGIN
  EXECUTE format('SELECT * FROM ' || tbl) USING val;
END;
$$ LANGUAGE plpgsql;
`
  const violations3 = checkSql(bad3)
  assert.equal(violations3.length, 1)
  assert.equal(violations3[0].rule, 'EXECUTE_STRING_CONCAT')
})

test('Rule 1: Passes safe EXECUTE with format(%I), %L, USING, triggers, and grants', () => {
  const safe = `
CREATE OR REPLACE FUNCTION public.safe_dyn(tbl text, val text) RETURNS void AS $$
BEGIN
  EXECUTE format('SELECT * FROM %I WHERE id = %L', tbl, val);
  EXECUTE 'SELECT * FROM products WHERE id = $1' USING val;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER t AFTER INSERT ON products FOR EACH ROW EXECUTE FUNCTION public.safe_dyn('a', 'b');
GRANT EXECUTE ON FUNCTION public.safe_dyn(text, text) TO authenticated;
`
  const violations = checkSql(safe)
  assert.equal(violations.filter((v) => v.rule === 'EXECUTE_STRING_CONCAT').length, 0)
})

test('Rule 2: Fails when SECURITY DEFINER function lacks set search_path', () => {
  const bad = `
CREATE OR REPLACE FUNCTION public.insecure_fn()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NULL;
END;
$$;
`
  const violations = checkSql(bad)
  assert.equal(violations.length, 1)
  assert.equal(violations[0].rule, 'SECURITY_DEFINER_NO_SEARCH_PATH')
  assert.ok(violations[0].message.includes('public.insecure_fn'))
})

test('Rule 2: Passes when SECURITY DEFINER has set search_path or when not SECURITY DEFINER', () => {
  const safe = `
CREATE OR REPLACE FUNCTION public.safe_fn()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.invoker_fn()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  NULL;
END;
$$;
`
  const violations = checkSql(safe)
  assert.equal(violations.filter((v) => v.rule === 'SECURITY_DEFINER_NO_SEARCH_PATH').length, 0)
})

test('Rule 3: Fails when a public table has no RLS enabled', () => {
  const bad = `
CREATE TABLE public.unprotected_table (
  id bigint primary key,
  name text
);
`
  const violations = checkSql(bad)
  assert.equal(violations.length, 1)
  assert.equal(violations[0].rule, 'PUBLIC_TABLE_NO_RLS')
  assert.ok(violations[0].message.includes('unprotected_table'))
})

test('Rule 3: Passes when public table has RLS enabled in the same migration', () => {
  const safe = `
CREATE TABLE public.protected_table (
  id bigint primary key
);
ALTER TABLE public.protected_table ENABLE ROW LEVEL SECURITY;
`
  const violations = checkSql(safe)
  assert.equal(violations.filter((v) => v.rule === 'PUBLIC_TABLE_NO_RLS').length, 0)
})

test('Rule 3: Passes when non-public schema table is created without RLS', () => {
  const safe = `
CREATE TABLE auth.internal_cache (
  id text primary key
);
`
  const violations = checkSql(safe)
  assert.equal(violations.filter((v) => v.rule === 'PUBLIC_TABLE_NO_RLS').length, 0)
})

test('Rule 3: Passes across multiple migration files when RLS is enabled in later migration', (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'lolys-test-migrations-rls-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))

  writeFileSync(
    path.join(dir, '01_create.sql'),
    `CREATE TABLE public.deferred_table (id bigint primary key);\n`,
  )
  writeFileSync(
    path.join(dir, '02_rls.sql'),
    `ALTER TABLE public.deferred_table ENABLE ROW LEVEL SECURITY;\n`,
  )

  const violations = checkMigrations(dir)
  assert.equal(violations.filter((v) => v.rule === 'PUBLIC_TABLE_NO_RLS').length, 0)
})

test('Rule 4: Fails when table outside allow-list is granted to anon', () => {
  const badOrders = `GRANT SELECT ON public.orders TO anon;`
  const v1 = checkSql(badOrders)
  assert.equal(v1.length, 1)
  assert.equal(v1[0].rule, 'ANON_TABLE_GRANT_FORBIDDEN')
  assert.ok(v1[0].message.includes('orders'))

  const badAll = `GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;`
  const v2 = checkSql(badAll)
  assert.equal(v2.length, 1)
  assert.equal(v2[0].rule, 'ANON_TABLE_GRANT_FORBIDDEN')

  const badMixed = `GRANT SELECT ON public.categories, public.profiles TO anon;`
  const v3 = checkSql(badMixed)
  assert.equal(v3.length, 1)
  assert.equal(v3[0].rule, 'ANON_TABLE_GRANT_FORBIDDEN')
  assert.ok(v3[0].message.includes('profiles'))
})

test('Rule 4: Passes when allow-listed tables are granted to anon, or non-allow-listed to authenticated', () => {
  assert.deepEqual([...ALLOW_LISTED_ANON_TABLES].sort(), [
    'categories',
    'delivery_fees',
    'governorates',
    'products',
    'shop_settings',
  ])

  const safe = `
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.categories, public.products, public.governorates, public.delivery_fees TO anon, authenticated;
GRANT SELECT ON TABLE public.shop_settings TO anon, authenticated;
GRANT SELECT, INSERT ON public.orders TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
`
  const violations = checkSql(safe)
  assert.equal(violations.filter((v) => v.rule === 'ANON_TABLE_GRANT_FORBIDDEN').length, 0)
})

test('Real repository migrations pass all SQL guard rules with zero violations', () => {
  const violations = checkMigrations('supabase/migrations')
  assert.deepEqual(violations, [], `Expected 0 violations but got: ${JSON.stringify(violations)}`)
})

test('CLI exits 0 on valid migrations and 1 with errors on violations', (t) => {
  const runReal = spawnSync(process.execPath, [scriptPath], { encoding: 'utf8' })
  assert.equal(runReal.status, 0)
  assert.match(runReal.stdout, /All migrations passed SQL guard rules/)

  const badDir = mkdtempSync(path.join(tmpdir(), 'lolys-test-cli-bad-'))
  t.after(() => rmSync(badDir, { recursive: true, force: true }))

  writeFileSync(
    path.join(badDir, '01_violations.sql'),
    `
CREATE TABLE public.bad_table (id bigint);
GRANT SELECT ON public.bad_table TO anon;
CREATE OR REPLACE FUNCTION public.bad_fn() RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  EXECUTE 'SELECT * FROM ' || tbl;
END;
$$;
`,
  )

  const runBad = spawnSync(process.execPath, [scriptPath, badDir], { encoding: 'utf8' })
  assert.equal(runBad.status, 1)
  assert.match(runBad.stderr, /EXECUTE_STRING_CONCAT/)
  assert.match(runBad.stderr, /SECURITY_DEFINER_NO_SEARCH_PATH/)
  assert.match(runBad.stderr, /PUBLIC_TABLE_NO_RLS/)
  assert.match(runBad.stderr, /ANON_TABLE_GRANT_FORBIDDEN/)
})

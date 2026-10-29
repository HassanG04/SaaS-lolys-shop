import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { splitStatements, removeCommentsPreservingLines } from './check-sql.mjs'
const read = (file) =>
  readFileSync(new URL(`../${file}`, import.meta.url), 'utf8').replace(/\r/g, '')
const repair = read('docs/runbooks/storefront-editor-repair.sql')
test('owner content repair embeds the unchanged reviewed migration', () => {
  const body = repair
    .split('-- BEGIN UNCHANGED MIGRATION: 20261018100000_storefront_content.sql\n')[1]
    ?.split('\n-- END UNCHANGED MIGRATION')[0]
  assert.equal(body, read('supabase/migrations/20261018100000_storefront_content.sql').trimEnd())
})
test('owner content repair defaults to rollback and retains its reviewed scope', () => {
  assert.equal(splitStatements(removeCommentsPreservingLines(repair)).length, 1)
  assert.match(repair, /v_apply constant boolean := false;/)
  assert.match(repair, /exception when sqlstate 'P310F'/)
  assert.doesNotMatch(repair, /create temporary table/i)
  assert.doesNotMatch(repair, /^\s*(commit|drop|delete|truncate|alter)\b/im)
  assert.doesNotMatch(
    repair,
    /supabase_migrations|create or replace function public\.(?!admin_update_storefront_content)/,
  )
  assert.match(repair, /352ec1b537ad23124dd3f01516b05d2e/)
  assert.match(repair, /d21b2ddedef282e186c5e95585f231b4/)
  assert.match(repair, /v_preserved_settings/)
  assert.match(repair, /audit_shop_settings/)
})

test('explicit apply file uses the same atomic repair and returns setup metadata', () => {
  const apply = read('docs/runbooks/storefront-editor-APPLY.sql')
  const expected = repair
    .slice(repair.indexOf('do $editor_repair$'))
    .replace('v_apply constant boolean := false;', 'v_apply constant boolean := true;')
  assert.equal(
    apply.slice(apply.indexOf('do $editor_repair$')).split('select jsonb_build_object(\n')[0],
    expected,
  )
  assert.equal(splitStatements(removeCommentsPreservingLines(apply)).length, 2)
  assert.match(apply, /as editor_repair_result;/)
  assert.match(apply, /'settings_rls'/)
  assert.match(apply, /'save_function_exists'/)
})

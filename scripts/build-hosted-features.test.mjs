import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import test from 'node:test'
import { buildHostedFeatures, section } from './build-hosted-features.mjs'

test('owner installer stays reproducible from reviewed migration sections', () => {
  const actual = readFileSync('docs/runbooks/hosted-features-APPLY.sql', 'utf8').replaceAll(
    '\r\n',
    '\n',
  )
  assert.equal(actual, buildHostedFeatures(), 'Run node scripts/build-hosted-features.mjs')
})

test('section drift fails closed rather than silently generating incomplete SQL', () => {
  assert.throws(() => section('start\nbody', 'start', 'missing'), /Missing SQL section/)
  assert.throws(() => section('body\nend', 'start', 'end'), /Missing SQL section/)
})

test('repair does not replace working editor, checkout, MFA or payment instruction functions', () => {
  const sql = buildHostedFeatures()
  for (const name of [
    'place_order',
    'get_payment_instructions',
    'is_admin',
    'require_admin',
    'admin_update_storefront_content',
  ]) {
    assert(!sql.includes(`create or replace function public.${name}(`), name)
  }
  // Match statements, not the word TRUNCATE in a privilege-denial assertion.
  assert(
    !/^\s*(?:alter table[^;]*disable row level security|truncate\s|drop table\s|drop schema\s|create temp\s)/im.test(
      sql,
    ),
  )
  assert(sql.includes('begin;\nset local lock_timeout'))
  assert(sql.includes("notify pgrst, 'reload schema';\ncommit;"))
})

test('CSV SQL copy agrees with its migration when the export PR is present', () => {
  const copy = readFileSync('docs/runbooks/hosted-features/forecast-export.sql', 'utf8')
  const digest = createHash('sha256').update(copy.replaceAll('\r\n', '\n')).digest('hex')
  assert.equal(digest, 'd652bf2ef8ac614b62a590455f54d7db322859a1b090ab348b0dd2a938692092')
  const path = 'supabase/migrations/20261029120000_forecast_dataset_export.sql'
  if (existsSync(path)) {
    assert.equal(
      readFileSync(path, 'utf8').replaceAll('\r\n', '\n'),
      readFileSync('docs/runbooks/hosted-features/forecast-export.sql', 'utf8').replaceAll(
        '\r\n',
        '\n',
      ),
    )
  }
})

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { buildHostedRepair, repairSources } from './build-hosted-repair.mjs'

test('owner repair is reproducible and rolls back unless explicitly changed by owner', () => {
  const sql = buildHostedRepair()
  assert.equal(
    readFileSync(
      new URL('../docs/runbooks/hosted-repair-2026-10-26.sql', import.meta.url),
      'utf8',
    ).replace(/\r/g, ''),
    sql,
  )
  assert.match(sql, /\nrollback;\n$/)
  assert.doesNotMatch(sql, /^commit;/m)
  assert.match(sql, /Checkout\/payment definitions differ/)
  assert.match(sql, /Recovery changed an existing merchant setting/)
})

test('repair includes the reviewed migrations in order, without bootstrap data or fabricated history', () => {
  const sql = buildHostedRepair()
  assert.deepEqual(repairSources, [...repairSources].sort())
  for (const file of repairSources) {
    const source = readFileSync(
      new URL(`../supabase/migrations/${file}`, import.meta.url),
      'utf8',
    ).replace(/\r/g, '')
    assert(sql.includes(source), `Missing unchanged source: ${file}`)
  }
  assert.doesNotMatch(
    sql,
    /insert into (?:supabase_migrations\.|auth\.users|public\.delivery_fees)/i,
  )
  assert.doesNotMatch(sql, /update public\.delivery_fees|delete from public\.delivery_fees/i)
})

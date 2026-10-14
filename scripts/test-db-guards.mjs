import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { assertLocalTarget, query, root } from './local-db.mjs'

assertLocalTarget()
// Every probe and its test data share a transaction which the suite rolls back.
// Never modify migration files or persist a deliberately weakened policy.
const probes = [
  [
    'RLS disabled',
    'alter table public.categories disable row level security;',
    '01_rls_enabled.test.sql',
  ],
  [
    'inactive product visible',
    'alter policy "read active products" on public.products using (true);',
    '02_auth_visibility.test.sql',
  ],
  [
    'favorites visible across accounts',
    'alter policy "manage own favorites" on public.favorites using (true);',
    '02_auth_visibility.test.sql',
  ],
  [
    'role trigger bypass',
    'alter function public.protect_profile_role() security definer;',
    '10_integration_security.test.sql',
  ],
  [
    'audit helper exposed',
    'grant execute on function public.audit_event(text,text,text,jsonb,jsonb) to authenticated;',
    '10_integration_security.test.sql',
  ],
]
for (const [name, mutation, file] of probes) {
  const suite = readFileSync(resolve(root, 'supabase/tests/database', file), 'utf8').replace(
    /^\s*begin;/i,
    '',
  )
  assert.match(suite, /rollback;\s*$/i)
  const result = query(
    `begin;\ncreate extension if not exists pgtap with schema extensions;\nset local search_path = public, extensions;\n${mutation}\n${suite}`,
  )
  assert.match(result, /not ok \d+/, `The ${name} probe must make its security tests fail`)
  console.log(`Negative probe rejected and rolled back: ${name}.`)
}

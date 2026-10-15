import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { checkWorkflowPinning } from './check-supply-chain.mjs'

const ROOT_DIR = process.cwd()
const KEEPALIVE_WORKFLOW_PATH = path.join(ROOT_DIR, '.github', 'workflows', 'keepalive.yml')

test('keep-alive workflow file exists and is properly structured', () => {
  assert.ok(fs.existsSync(KEEPALIVE_WORKFLOW_PATH), '.github/workflows/keepalive.yml must exist')
  const content = fs.readFileSync(KEEPALIVE_WORKFLOW_PATH, 'utf8')

  // Owner launch hold: automatic scheduling must stay disabled.
  assert.doesNotMatch(
    content,
    /^ {2}schedule:/m,
    'Scheduled workflows must remain manual-only until launch',
  )

  // Must support manual workflow_dispatch
  assert.match(
    content,
    /workflow_dispatch:/,
    'keepalive.yml must support manual workflow_dispatch trigger',
  )

  // Must target Supabase REST API
  assert.match(
    content,
    /\/rest\/v1\//,
    'keepalive.yml must target Supabase REST endpoint (/rest/v1/)',
  )

  // Must pass public anon key via apikey and Authorization Bearer headers
  assert.match(
    content,
    /apikey:\s*\$\{?PRODUCTION_ANON_KEY\}?/,
    'keepalive.yml must send apikey header',
  )
  assert.match(
    content,
    /Authorization:\s*Bearer\s*\$\{?PRODUCTION_ANON_KEY\}?/,
    'keepalive.yml must send Authorization Bearer header',
  )

  // Must declare contents: read permissions
  assert.match(
    content,
    /permissions:\s*(?:\r?\n\s*#[^\n]*)*\r?\n\s*contents:\s*read/,
    'keepalive.yml must declare restricted contents: read permissions',
  )
})

test('keep-alive workflow documents free-tier pausing behavior and open decision O-11', () => {
  const content = fs.readFileSync(KEEPALIVE_WORKFLOW_PATH, 'utf8')

  assert.ok(content.includes('T-8.05'), 'keepalive.yml must reference task T-8.05')
  assert.ok(content.includes('O-11'), 'keepalive.yml must reference open decision O-11')
  assert.match(
    content,
    /pause|inactivity/i,
    'keepalive.yml must document Supabase project pausing behavior on inactivity',
  )
  assert.match(
    content,
    /paid|Pro/i,
    'keepalive.yml must document that a paid plan avoids pausing and keep-alive requirement',
  )
})

test('keep-alive workflow gracefully handles missing or unconfigured secrets', () => {
  const content = fs.readFileSync(KEEPALIVE_WORKFLOW_PATH, 'utf8')

  // Must check if secrets are set before attempting curl
  assert.match(
    content,
    /if\s*\[\s*-z\s*"\$\{?PRODUCTION_URL/i,
    'keepalive.yml must guard against unconfigured PRODUCTION_URL',
  )
  assert.match(
    content,
    /PRODUCTION_ANON_KEY/i,
    'keepalive.yml must reference PRODUCTION_ANON_KEY secret',
  )
  // Must exit cleanly (exit 0) when secrets are missing so CI does not report false errors
  assert.match(
    content,
    /exit 0/,
    'keepalive.yml must exit 0 cleanly when secrets are not yet configured',
  )
})

test('keepalive.yml satisfies supply-chain action pinning rules', () => {
  const violations = checkWorkflowPinning(path.join(ROOT_DIR, '.github', 'workflows'))
  const keepaliveViolations = violations.filter((v) => v.file === 'keepalive.yml')
  assert.deepEqual(
    keepaliveViolations,
    [],
    'keepalive.yml must have zero unpinned actions or missing version comments',
  )
})

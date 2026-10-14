import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const ROOT_DIR = process.cwd()
const MONITORING_PATH = path.join(ROOT_DIR, 'docs', 'runbooks', 'monitoring.md')
const README_PATH = path.join(ROOT_DIR, 'docs', 'runbooks', 'README.md')

test('monitoring runbook exists and is registered in runbooks README', () => {
  assert.ok(fs.existsSync(MONITORING_PATH), 'docs/runbooks/monitoring.md must exist')
  assert.ok(fs.existsSync(README_PATH), 'docs/runbooks/README.md must exist')

  const readmeContent = fs.readFileSync(README_PATH, 'utf8')
  assert.match(
    readmeContent,
    /monitoring\.md\s*\|\s*T-8\.07/,
    'docs/runbooks/README.md must list monitoring.md for task T-8.07',
  )
})

test('runbook documents external uptime checks on storefront and REST endpoint', () => {
  const content = fs.readFileSync(MONITORING_PATH, 'utf8')

  assert.ok(content.includes('T-8.07'), 'Runbook must reference task T-8.07')
  assert.match(
    content,
    /External Synthetic Uptime Monitoring/i,
    'Runbook must document external uptime checks',
  )
  assert.match(content, /Storefront Frontend/i, 'Runbook must specify storefront check (Monitor 1)')
  assert.match(
    content,
    /\/rest\/v1\/categories\?select=id&limit=1/,
    'Runbook must specify light REST endpoint check (Monitor 2)',
  )
  assert.match(
    content,
    /apikey:\s*<PRODUCTION_ANON_KEY>/,
    'Runbook must specify apikey header for REST endpoint monitor',
  )
})

test('runbook documents all 5 operational alert categories', () => {
  const content = fs.readFileSync(MONITORING_PATH, 'utf8')

  // 1. Site / API down
  assert.match(content, /Site or API Down/i, 'Runbook must cover site down alerts')
  // 2. Supabase usage > 80%
  assert.match(content, /80%/i, 'Runbook must cover Supabase usage above 80% of plan limits')
  // 3. Analytics / Forecast job failure
  assert.match(
    content,
    /forecast_runs|Analytics \/ Cron Failure/i,
    'Runbook must cover forecast / cron job failure alerts',
  )
  // 4. Dependabot security alerts
  assert.match(content, /Dependabot/i, 'Runbook must cover Dependabot security alerts')
  // 5. Expired / Stale InstaPay orders
  assert.match(
    content,
    /awaiting_approval|InstaPay/i,
    'Runbook must cover stale / unreviewed InstaPay orders',
  )
})

test('runbook documents maintenance mode and announcement_ar setting', () => {
  const content = fs.readFileSync(MONITORING_PATH, 'utf8')

  assert.match(content, /announcement_ar/, 'Runbook must reference announcement_ar setting')
  assert.match(
    content,
    /Soft Maintenance Mode/i,
    'Runbook must describe soft maintenance via announcement bar',
  )
  assert.match(
    content,
    /Hard Maintenance Mode|503/i,
    'Runbook must describe hard maintenance mode via Cloudflare Pages',
  )
})

test('runbook documents decision O-09 (no client error upload at launch)', () => {
  const content = fs.readFileSync(MONITORING_PATH, 'utf8')

  assert.ok(content.includes('O-09'), 'Runbook must reference open decision O-09')
  assert.match(
    content,
    /bundle budget|200,?000 gzip bytes/i,
    'Runbook must explain bundle budget rationale for O-09',
  )
  assert.match(content, /privacy/i, 'Runbook must explain customer privacy rationale for O-09')
})

test('runbook contains plan-decision memo for O-11 with current pricing and recommendation', () => {
  const content = fs.readFileSync(MONITORING_PATH, 'utf8')

  assert.ok(content.includes('O-11'), 'Runbook must contain plan-decision memo for O-11')
  assert.match(content, /\$0/, 'Memo must list Free plan price ($0)')
  assert.match(content, /\$25/, 'Memo must list Pro plan price ($25/mo)')
  assert.match(content, /auto-paus/i, 'Memo must evaluate auto-pausing behavior')
  assert.match(content, /backup/i, 'Memo must evaluate automated backups')
  assert.match(
    content,
    /Recommendation/i,
    'Memo must provide clear recommendation for production tier',
  )
  assert.match(content, /Pro Plan/i, 'Memo must recommend Pro Plan for production')
})

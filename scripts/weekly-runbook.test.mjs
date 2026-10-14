import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const ROOT_DIR = process.cwd()
const WEEKLY_RUNBOOK_PATH = path.join(ROOT_DIR, 'docs', 'runbooks', 'weekly.md')
const README_PATH = path.join(ROOT_DIR, 'README.md')
const RUNBOOKS_README_PATH = path.join(ROOT_DIR, 'docs', 'runbooks', 'README.md')

test('weekly operations runbook exists and is linked from README and runbooks index', () => {
  assert.ok(fs.existsSync(WEEKLY_RUNBOOK_PATH), 'docs/runbooks/weekly.md must exist')
  assert.ok(fs.existsSync(README_PATH), 'README.md must exist')
  assert.ok(fs.existsSync(RUNBOOKS_README_PATH), 'docs/runbooks/README.md must exist')

  const readmeContent = fs.readFileSync(README_PATH, 'utf8')
  assert.match(
    readmeContent,
    /docs\/runbooks\/weekly\.md/,
    'README.md must link to docs/runbooks/weekly.md',
  )

  const runbooksReadme = fs.readFileSync(RUNBOOKS_README_PATH, 'utf8')
  assert.match(
    runbooksReadme,
    /weekly\.md\s*\|\s*T-8\.11/,
    'docs/runbooks/README.md must list weekly.md for task T-8.11',
  )
})

test('weekly runbook covers dashboard, revenue, and daily report', () => {
  const content = fs.readFileSync(WEEKLY_RUNBOOK_PATH, 'utf8')

  assert.ok(content.includes('T-8.11'), 'Runbook must reference task T-8.11')
  assert.match(content, /\/admin\b/, 'Runbook must reference admin dashboard')
  assert.match(
    content,
    /Revenue|AOV|Average Order Value/i,
    'Runbook must cover financial review metrics',
  )
})

test('weekly runbook covers pending and expired InstaPay orders', () => {
  const content = fs.readFileSync(WEEKLY_RUNBOOK_PATH, 'utf8')

  assert.match(content, /awaiting_approval/, 'Runbook must cover orders awaiting approval')
  assert.match(content, /awaiting_proof/, 'Runbook must cover orders awaiting proof')
  assert.match(
    content,
    /expire_unpaid_orders|24-hour/i,
    'Runbook must cover order expiration handling',
  )
  assert.match(content, /\/admin\/payments/, 'Runbook must reference payment review queue')
})

test('weekly runbook covers audit log review', () => {
  const content = fs.readFileSync(WEEKLY_RUNBOOK_PATH, 'utf8')

  assert.match(content, /\/admin\/audit/, 'Runbook must reference audit log view')
  assert.match(content, /INSTAPAY_QR_CHANGE/, 'Runbook must audit INSTAPAY_QR_CHANGE events')
  assert.match(content, /SETTING_UPDATE/, 'Runbook must audit SETTING_UPDATE events')
})

test('weekly runbook covers forecasts, low stock, and reorder export', () => {
  const content = fs.readFileSync(WEEKLY_RUNBOOK_PATH, 'utf8')

  assert.match(
    content,
    /low_stock|stock\s*<=?\s*5/i,
    'Runbook must describe low-stock product identification',
  )
  assert.match(content, /forecast/i, 'Runbook must reference demand forecasts')
  assert.match(content, /CSV/i, 'Runbook must reference CSV reorder sheet export')
})

test('weekly runbook covers Supabase platform limits and backups', () => {
  const content = fs.readFileSync(WEEKLY_RUNBOOK_PATH, 'utf8')

  assert.match(content, /80%/i, 'Runbook must monitor resource limits against 80% threshold')
  assert.match(content, /backup-restore\.md/i, 'Runbook must link to backup-restore.md')
})

test('weekly runbook covers dependency security alerts and emergency triage', () => {
  const content = fs.readFileSync(WEEKLY_RUNBOOK_PATH, 'utf8')

  assert.match(content, /Dependabot/i, 'Runbook must monitor GitHub Dependabot alerts')
  assert.match(
    content,
    /What to Do When Something Breaks|Emergency/i,
    'Runbook must include emergency triage guide',
  )
  assert.match(
    content,
    /incident-response\.md/i,
    'Runbook must cross-reference incident-response.md',
  )
})

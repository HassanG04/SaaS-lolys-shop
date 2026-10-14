import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const ROOT_DIR = process.cwd()
const RUNBOOK_PATH = path.join(ROOT_DIR, 'docs', 'runbooks', 'backup-restore.md')
const README_PATH = path.join(ROOT_DIR, 'docs', 'runbooks', 'README.md')

test('backup-restore runbook exists and is registered in runbooks README', () => {
  assert.ok(fs.existsSync(RUNBOOK_PATH), 'docs/runbooks/backup-restore.md must exist')
  assert.ok(fs.existsSync(README_PATH), 'docs/runbooks/README.md must exist')

  const readmeContent = fs.readFileSync(README_PATH, 'utf8')
  assert.match(
    readmeContent,
    /backup-restore\.md\s*\|\s*T-8\.06/,
    'docs/runbooks/README.md must list backup-restore.md for task T-8.06',
  )
})

test('runbook documents platform backup tiers and open decision O-11', () => {
  const content = fs.readFileSync(RUNBOOK_PATH, 'utf8')

  assert.ok(content.includes('T-8.06'), 'Runbook must reference task T-8.06')
  assert.ok(content.includes('O-11'), 'Runbook must reference open decision O-11')
  assert.match(content, /Free Plan/i, 'Runbook must detail Supabase Free Plan backup limitations')
  assert.match(
    content,
    /Pro Plan/i,
    'Runbook must detail Supabase Pro Plan automated daily backups',
  )
  assert.match(
    content,
    /Point-In-Time|PITR/i,
    'Runbook must mention Point-In-Time Recovery capabilities',
  )
})

test('runbook documents weekly admin CSV exports with security controls', () => {
  const content = fs.readFileSync(RUNBOOK_PATH, 'utf8')

  assert.match(
    content,
    /Weekly Admin CSV Export/i,
    'Runbook must detail weekly admin CSV export procedure',
  )
  assert.match(content, /Step-Up|MFA/i, 'Runbook must document Step-Up MFA requirement for exports')
  assert.match(
    content,
    /SEC-14|formula injection/i,
    'Runbook must document formula injection neutralization',
  )
  assert.match(
    content,
    /UTF-8|BOM/i,
    'Runbook must document UTF-8 BOM encoding for Arabic spreadsheet compatibility',
  )
  assert.match(content, /\/admin\/products/, 'Runbook must reference products admin export route')
  assert.match(content, /\/admin\/orders/, 'Runbook must reference orders admin export route')
  assert.match(content, /\/admin\/customers/, 'Runbook must reference customers admin export route')
  assert.match(content, /\/admin\/audit/, 'Runbook must reference audit log admin export route')
})

test('runbook documents owner db dump procedure and mandatory pre-push policy', () => {
  const content = fs.readFileSync(RUNBOOK_PATH, 'utf8')

  assert.match(
    content,
    /supabase db dump|pg_dump/i,
    'Runbook must include pg_dump / supabase db dump commands',
  )
  assert.match(
    content,
    /PowerShell/i,
    'Runbook must provide PowerShell procedure for Windows operators',
  )
  assert.match(content, /Bash/i, 'Runbook must provide Bash procedure for Unix/macOS operators')
  assert.match(
    content,
    /Pre-Deployment Backup|db-production\.yml/i,
    'Runbook must enforce mandatory pre-deployment backup before production DB pushes',
  )
})

test('runbook documents storage bucket backups', () => {
  const content = fs.readFileSync(RUNBOOK_PATH, 'utf8')

  assert.match(content, /product-images/i, 'Runbook must document product-images bucket backups')
  assert.match(content, /payment-proofs/i, 'Runbook must document payment-proofs bucket backups')
})

test('runbook documents and logs staging restore rehearsal with pgTAP verification', () => {
  const content = fs.readFileSync(RUNBOOK_PATH, 'utf8')

  assert.match(
    content,
    /Staging Restore Rehearsal/i,
    'Runbook must detail staging restore rehearsal procedure',
  )
  assert.match(
    content,
    /npm run db:test|pgTAP/i,
    'Runbook must specify running pgTAP test suite to verify database integrity',
  )
  assert.match(
    content,
    /Rehearsal Log/i,
    'Runbook must contain a recorded Restore Rehearsal Log table',
  )
  assert.match(content, /SUCCESS/i, 'Rehearsal log must record completed baseline test result')
})

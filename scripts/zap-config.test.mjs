import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { checkWorkflowPinning } from './check-supply-chain.mjs'

const ROOT_DIR = process.cwd()
const ZAP_WORKFLOW_PATH = path.join(ROOT_DIR, '.github', 'workflows', 'zap.yml')
const ZAP_RULES_PATH = path.join(ROOT_DIR, '.zap', 'rules.tsv')
const ZAP_README_PATH = path.join(ROOT_DIR, '.zap', 'README.md')

test('OWASP ZAP workflow file exists and is properly structured', () => {
  assert.ok(fs.existsSync(ZAP_WORKFLOW_PATH), '.github/workflows/zap.yml must exist')
  const content = fs.readFileSync(ZAP_WORKFLOW_PATH, 'utf8')

  // Owner launch hold: automatic scheduling must stay disabled.
  assert.doesNotMatch(
    content,
    /^ {2}schedule:/m,
    'Scheduled workflows must remain manual-only until launch',
  )

  // Must have manual dispatch trigger
  assert.match(content, /workflow_dispatch:/, 'zap.yml must support manual workflow_dispatch')

  // Must enforce passive checks / baseline scan
  assert.match(content, /zaproxy\/action-baseline/, 'zap.yml must use zaproxy/action-baseline')

  // Must specify the rules file
  assert.match(content, /\.zap\/rules\.tsv/, 'zap.yml must specify .zap/rules.tsv configuration')

  // Must upload report artifact
  assert.match(content, /actions\/upload-artifact/, 'zap.yml must upload the report as an artifact')
})

test('OWASP ZAP workflow contains strict guard refusing production scans', () => {
  const content = fs.readFileSync(ZAP_WORKFLOW_PATH, 'utf8')

  // Must contain staging target validation
  assert.ok(
    content.includes('Validate Staging Target'),
    'zap.yml must include a staging validation step',
  )
  assert.match(
    content,
    /strictly prohibited against production|appears to be production/i,
    'zap.yml must reject production targets',
  )
})

test('All actions in zap.yml satisfy supply-chain SHA pinning rules', () => {
  const violations = checkWorkflowPinning(path.join(ROOT_DIR, '.github', 'workflows'))
  const zapViolations = violations.filter((v) => v.file === 'zap.yml')
  assert.deepEqual(
    zapViolations,
    [],
    'zap.yml must have zero unpinned actions or missing version comments',
  )
})

test('.zap/rules.tsv exists and follows valid ZAP configuration format', () => {
  assert.ok(fs.existsSync(ZAP_RULES_PATH), '.zap/rules.tsv must exist')
  const content = fs.readFileSync(ZAP_RULES_PATH, 'utf8')
  const lines = content.split(/\r?\n/)

  const validActions = new Set(['IGNORE', 'INFO', 'WARN', 'FAIL', 'DEFAULT'])
  const ruleEntries = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line || line.startsWith('#')) continue

    const parts = lines[i].split('\t')
    assert.ok(
      parts.length >= 2,
      `Line ${i + 1} in .zap/rules.tsv must have at least 2 tab-separated fields: "${lines[i]}"`,
    )

    const [ruleId, action, comment] = parts
    assert.match(ruleId.trim(), /^\d+$/, `Rule ID on line ${i + 1} must be numeric: "${ruleId}"`)
    assert.ok(
      validActions.has(action.trim()),
      `Action "${action}" on line ${i + 1} must be one of ${[...validActions].join(', ')}`,
    )
    assert.ok(
      comment && comment.trim().length > 0,
      `Rule ${ruleId} on line ${i + 1} must have a documented triage comment`,
    )

    ruleEntries.push({
      ruleId: Number(ruleId.trim()),
      action: action.trim(),
      comment: comment.trim(),
    })
  }

  assert.ok(ruleEntries.length >= 5, 'Must have at least 5 configured rules in .zap/rules.tsv')

  // Verify critical headers fail on absence
  const failRules = new Set(ruleEntries.filter((r) => r.action === 'FAIL').map((r) => r.ruleId))
  assert.ok(failRules.has(10021), 'Rule 10021 (X-Content-Type-Options) must be set to FAIL')
  assert.ok(failRules.has(10035), 'Rule 10035 (HSTS) must be set to FAIL')
  assert.ok(failRules.has(10038), 'Rule 10038 (CSP) must be set to FAIL')
  assert.ok(failRules.has(90022), 'Rule 90022 (Application Error Disclosure) must be set to FAIL')

  // Verify anti-csrf rules for SPA are documented and ignored
  const ignoreRules = new Set(ruleEntries.filter((r) => r.action === 'IGNORE').map((r) => r.ruleId))
  assert.ok(
    ignoreRules.has(10020),
    'Rule 10020 (Anti-CSRF Tokens) must be triaged as IGNORE for SPA',
  )
  assert.ok(
    ignoreRules.has(10202),
    'Rule 10202 (Absence of Anti-CSRF Tokens) must be triaged as IGNORE for SPA',
  )
})

test('.zap/README.md documents scope, triage and local Docker execution', () => {
  assert.ok(fs.existsSync(ZAP_README_PATH), '.zap/README.md must exist')
  const content = fs.readFileSync(ZAP_README_PATH, 'utf8')
  assert.ok(content.includes('T-7.07'), 'README must reference task T-7.07')
  assert.ok(content.includes('staging'), 'README must mention staging scope')
  assert.ok(content.includes('docker run'), 'README must include local docker command')
  assert.ok(content.includes('rules.tsv'), 'README must document rules.tsv')
})

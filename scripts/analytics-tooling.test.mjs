import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

test('Analytics project layout and configuration structure', () => {
  const pyprojectPath = path.join(rootDir, 'analytics', 'pyproject.toml')
  assert.ok(existsSync(pyprojectPath), 'analytics/pyproject.toml must exist')

  const pyproject = readFileSync(pyprojectPath, 'utf-8')
  assert.ok(pyproject.includes('[tool.ruff]'), 'pyproject.toml must configure ruff')
  assert.ok(pyproject.includes('[tool.pytest.ini_options]'), 'pyproject.toml must configure pytest')
  assert.ok(pyproject.includes('numpy'), 'pyproject.toml must declare numpy dependency')

  const configPath = path.join(rootDir, 'analytics', 'config.toml')
  assert.ok(existsSync(configPath), 'analytics/config.toml must exist')

  const config = readFileSync(configPath, 'utf-8')
  assert.ok(config.includes('[gates]'), 'config.toml must declare [gates] section')
  assert.ok(config.includes('shop_min_days = 56'), 'config.toml must declare shop_min_days')
  assert.ok(config.includes('[reorder]'), 'config.toml must declare [reorder] section')
  assert.ok(config.includes('[cleaning]'), 'config.toml must declare [cleaning] section')
  assert.ok(
    config.includes('winsorize_percentile = 0.99'),
    'config.toml must declare winsorize_percentile',
  )
  assert.ok(
    config.includes('poison_threshold_rejected_or_expired = 3'),
    'config.toml must declare poison threshold',
  )
})

test('Analytics runner script and package.json integration', () => {
  const runnerPath = path.join(rootDir, 'scripts', 'run-analytics.mjs')
  assert.ok(existsSync(runnerPath), 'scripts/run-analytics.mjs must exist')

  const pkgJsonPath = path.join(rootDir, 'package.json')
  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'))

  assert.equal(
    pkgJson.scripts['analytics:install'],
    'node scripts/run-analytics.mjs install',
    'analytics:install must be wired to run-analytics.mjs',
  )
  assert.equal(
    pkgJson.scripts['analytics:test'],
    'node scripts/run-analytics.mjs test',
    'analytics:test must be wired to run-analytics.mjs',
  )
})

test('Analytics CI workflow configuration and pinned action', () => {
  const ciPath = path.join(rootDir, '.github', 'workflows', 'ci.yml')
  assert.ok(existsSync(ciPath), 'ci.yml must exist')

  const ciContent = readFileSync(ciPath, 'utf-8')
  assert.ok(ciContent.includes('analytics:'), 'ci.yml must define analytics job')
  assert.ok(ciContent.includes('actions/setup-python@'), 'analytics job must use setup-python')
  assert.ok(ciContent.includes('npm run analytics:test'), 'analytics job must run analytics:test')
})

test('Analytics ADR-0004 documentation integrity', () => {
  const adrPath = path.join(rootDir, 'docs', 'adr', '0004-analytics-stack.md')
  assert.ok(existsSync(adrPath), 'ADR-0004 must exist')

  const adrContent = readFileSync(adrPath, 'utf-8')
  assert.ok(adrContent.includes('ADR-0004'), 'ADR-0004 header must exist')
  assert.ok(adrContent.includes('statsforecast'), 'ADR-0004 must document statsforecast')
})

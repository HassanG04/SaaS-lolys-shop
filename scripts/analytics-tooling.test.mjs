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

test('Weekly forecast workflow and writes configuration (T-9.08)', () => {
  const forecastYmlPath = path.join(rootDir, '.github', 'workflows', 'forecast.yml')
  assert.ok(existsSync(forecastYmlPath), '.github/workflows/forecast.yml must exist')

  const content = readFileSync(forecastYmlPath, 'utf-8')
  assert.ok(content.includes('0 21 * * 0'), 'forecast.yml must schedule weekly run on Sunday night')
  assert.ok(content.includes('workflow_dispatch:'), 'forecast.yml must support manual triggers')
  assert.ok(content.includes('timeout-minutes: 30'), 'forecast.yml must enforce 30-minute timeout')
  assert.ok(content.includes('ANALYTICS_DB_URL_STAGING'), 'forecast.yml must pass staging secret')
  assert.ok(
    content.includes('ANALYTICS_DB_URL_PRODUCTION'),
    'forecast.yml must pass production secret',
  )
  assert.ok(content.includes('use_synthetic'), 'forecast.yml must support synthetic input option')

  const writePyPath = path.join(rootDir, 'analytics', 'src', 'lolys_analytics', 'write.py')
  assert.ok(existsSync(writePyPath), 'write.py must exist')
  const writeContent = readFileSync(writePyPath, 'utf-8')
  assert.ok(writeContent.includes('write_forecast_run'), 'write.py must define write_forecast_run')
  assert.ok(
    writeContent.includes('DELETE FROM analytics.forecast_runs'),
    'write.py must implement idempotent delete',
  )

  const dbPyPath = path.join(rootDir, 'analytics', 'src', 'lolys_analytics', 'db.py')
  assert.ok(existsSync(dbPyPath), 'db.py must exist')
  const dbContent = readFileSync(dbPyPath, 'utf-8')
  assert.ok(dbContent.includes('sslmode=require'), 'db.py must enforce TLS require')

  const forecastPyPath = path.join(rootDir, 'analytics', 'src', 'lolys_analytics', 'forecast.py')
  assert.ok(existsSync(forecastPyPath), 'forecast.py must exist')
})

test('Accuracy tracking and drift alert configuration (T-9.09)', () => {
  const accuracyPyPath = path.join(rootDir, 'analytics', 'src', 'lolys_analytics', 'accuracy.py')
  assert.ok(existsSync(accuracyPyPath), 'accuracy.py must exist')

  const accContent = readFileSync(accuracyPyPath, 'utf-8')
  assert.ok(accContent.includes('compute_wape'), 'accuracy.py must define compute_wape')
  assert.ok(
    accContent.includes('evaluate_accuracy_window'),
    'accuracy.py must define evaluate_accuracy_window',
  )
  assert.ok(accContent.includes('evaluate_drift'), 'accuracy.py must define evaluate_drift')
  assert.ok(
    accContent.includes('simulate_drift_and_recovery_timeline'),
    'accuracy.py must define simulate_drift_and_recovery_timeline',
  )

  const configPath = path.join(rootDir, 'analytics', 'config.toml')
  const config = readFileSync(configPath, 'utf-8')
  assert.ok(config.includes('[monitoring]'), 'config.toml must define [monitoring] section')
  assert.ok(
    config.includes('rolling_window_days = 28'),
    'config.toml must define rolling_window_days = 28',
  )
  assert.ok(
    config.includes('drift_relative_wape_threshold = 0.20'),
    'config.toml must define drift threshold',
  )
  assert.ok(
    config.includes('consecutive_drift_weeks_to_alert = 2'),
    'config.toml must define consecutive drift alert requirement',
  )

  const cliPath = path.join(rootDir, 'analytics', 'src', 'lolys_analytics', 'cli.py')
  const cliContent = readFileSync(cliPath, 'utf-8')
  assert.ok(cliContent.includes('check-drift'), 'cli.py must register check-drift subcommand')
})

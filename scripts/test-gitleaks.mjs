import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scanner = fileURLToPath(new URL('./check-history-secrets.mjs', import.meta.url))
function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'lolys-gitleaks-'))
  t.after(() => {
    if (!root.startsWith(path.join(tmpdir(), 'lolys-gitleaks-'))) throw new Error('Unsafe cleanup')
    rmSync(root, { recursive: true, force: true })
  })
  const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'pipe' })
  git('init', '--quiet')
  git('config', 'user.name', 'Scanner Test')
  git('config', 'user.email', 'scanner@example.invalid')
  const put = (file, text) => writeFileSync(path.join(root, file), text)
  const commit = () => {
    git('add', '--all')
    git('commit', '--quiet', '--no-verify', '-m', 'synthetic test data')
  }
  put('sample.txt', 'A clean repository.\n')
  commit()
  const scan = (env = process.env) =>
    spawnSync(process.execPath, [scanner], { cwd: root, env, encoding: 'utf8' })
  return { put, commit, scan }
}

test('real Gitleaks rejects a synthetic token, including after deletion from HEAD', (t) => {
  const f = fixture(t)
  assert.equal(f.scan().status, 0, 'clean history must pass')
  // Construct synthetic data at runtime; no working credential is ever used.
  const fake = ['ghp', 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8'].join('_')
  f.put('sample.txt', `token = "${fake}" // gitleaks:allow\n`)
  f.commit()
  const detected = f.scan()
  assert.equal(detected.status, 1, 'planted credential must fail')
  assert.ok(!`${detected.stdout}${detected.stderr}`.includes(fake))
  f.put('sample.txt', 'The token was removed.\n')
  f.commit()
  assert.equal(f.scan().status, 1, 'history must still fail after deletion')
})

test('environment filenames fail without reading or printing their contents', (t) => {
  const f = fixture(t)
  f.put('.env', 'DO_NOT_READ_TEST_VALUE\n')
  f.commit()
  const result = f.scan()
  assert.equal(result.status, 1)
  assert.match(result.stderr, /environment file/)
  assert.ok(!result.stderr.includes('DO_NOT_READ_TEST_VALUE'))
})

test('missing scanner fails closed', (t) => {
  const f = fixture(t)
  assert.equal(f.scan({ ...process.env, GITLEAKS_BIN: 'missing-scanner-command' }).status, 2)
})

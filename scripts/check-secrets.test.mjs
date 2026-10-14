import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { inspectText } from './check-secrets.mjs'

const script = fileURLToPath(new URL('./check-secrets.mjs', import.meta.url))
const role = ['service', 'role'].join('_')
const secret = ['sb', 'secret', 'deliberately_fake_not_a_real_key'].join('_')
const token = (value) =>
  [JSON.stringify({ alg: 'none' }), JSON.stringify({ role: value })]
    .map((part) => Buffer.from(part).toString('base64url'))
    .join('.') + '.'

test('privileged keys are rejected even in documentation, tests and binary-like content', () => {
  for (const file of ['src/app.ts', 'docs/example.md', 'scripts/example.test.mjs', 'image.jpeg']) {
    assert.ok(inspectText(`\0${secret}\0`, file).includes('SECRET_KEY'))
    assert.ok(inspectText(token(role), file).includes('PRIVILEGED_JWT'))
  }
  assert.ok(inspectText(token(role) + 'fake_signature', 'src/app.ts').includes('PRIVILEGED_JWT'))
})

test('only role mentions may be allowed; production paths cannot masquerade as docs/tests', () => {
  for (const file of ['roadmap.md', 'docs/spec/example.md', 'scripts/example.test.mjs'])
    assert.deepEqual(inspectText(role, file), [])
  for (const file of ['src/app.ts', 'dist/docs/example.md', 'dist/example.test.js'])
    assert.deepEqual(inspectText(role, file), ['PRIVILEGED_ROLE'])
  assert.deepEqual(inspectText(token('anon'), 'dist/app.js'), [])
  assert.deepEqual(inspectText('malformed.token.value', 'dist/app.js'), [])
  assert.deepEqual(inspectText(['sb', 'secret', ''].join('_'), 'roadmap.md'), [])
})

test('environment example permits names only', () => {
  assert.deepEqual(inspectText('# Public names\nVITE_EXAMPLE=\n', '.env.example'), [])
  assert.deepEqual(inspectText('VITE_EXAMPLE=not-an-empty-value', '.env.example'), [
    'ENV_TEMPLATE_VALUE',
  ])
})

test('only literal privilege revocations may name the privileged role in migrations', () => {
  const file = 'supabase/migrations/20261012043500_audit_log.sql'
  const revoke = `revoke all on function public.audit_event(text, text, text, jsonb, jsonb) from public, anon, authenticated, ${role};`
  assert.deepEqual(inspectText(revoke, file), [])
  for (const object of ['table public.audit_log', 'sequence public.audit_log_id_seq']) {
    assert.deepEqual(
      inspectText(`revoke all on ${object} from public, anon, authenticated, ${role};`, file),
      [],
    )
  }
  for (const value of [
    `grant all on table public.audit_log to ${role};`,
    `${revoke}\nselect '${role}';`,
    `select '${revoke}';`,
  ]) {
    assert.deepEqual(inspectText(value, file), ['PRIVILEGED_ROLE'])
  }
  assert.ok(inspectText(`${revoke}\n${secret}`, file).includes('SECRET_KEY'))
  assert.ok(inspectText(`${revoke}\n${token(role)}`, file).includes('PRIVILEGED_JWT'))
  for (const path of [
    'src/app.ts',
    'dist/supabase/migrations/20261012043500_audit_log.sql',
    'scripts/arbitrary.sql',
  ]) {
    assert.deepEqual(inspectText(revoke, path), ['PRIVILEGED_ROLE'])
  }
})

test('CLI rejects staged source and nested build leaks without exposing their values', (t) => {
  const root = mkdtempSync(path.join(tmpdir(), 'lolys-secret-guard-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const put = (file, value) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true })
    writeFileSync(path.join(root, file), value)
  }
  const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'pipe' })
  const run = () => spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' })
  git('init', '--quiet')
  put('src/file with spaces.js', token('anon'))
  git('add', '--', 'src/file with spaces.js')
  put('dist/assets/nested/app.js', token('anon'))
  assert.equal(run().status, 0)
  for (const [file, value] of [
    ['src/file with spaces.js', secret],
    ['dist/assets/nested/app.js', token(role)],
    ['docs/sample.md', secret],
  ]) {
    put(file, value)
    if (!file.startsWith('dist/')) git('add', '--', file)
    const result = run()
    assert.equal(result.status, 1)
    assert.match(result.stderr, /SECRETS/)
    assert.ok(!`${result.stdout}${result.stderr}`.includes(value))
    put(file, token('anon'))
    assert.equal(run().status, 0)
  }
  put('.env.local', secret)
  git('add', '--', '.env.local')
  assert.match(run().stderr, /ENV_FILE/)
  git('rm', '--cached', '--', '.env.local')
  rmSync(path.join(root, 'dist'), { recursive: true })
  assert.equal(run().status, 1, 'missing build cannot silently pass')
  mkdirSync(path.join(root, 'dist'))
  assert.equal(run().status, 1, 'empty build cannot silently pass')
  put('dist/app.js', 'safe')
  rmSync(path.join(root, 'src/file with spaces.js'))
  assert.equal(run().status, 1, 'missing tracked file cannot silently pass')
})

test('CLI fails closed outside a Git repository', (t) => {
  const root = mkdtempSync(path.join(tmpdir(), 'lolys-no-git-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const result = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /could not be scanned/)
})

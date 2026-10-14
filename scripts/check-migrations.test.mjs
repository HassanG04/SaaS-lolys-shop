import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const script = fileURLToPath(new URL('./check-migrations.mjs', import.meta.url))
const migration = 'supabase/migrations/20261011000000_first schema.sql'
function fixture(t, withMigration = true) {
  const root = mkdtempSync(path.join(tmpdir(), 'lolys-migrations-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const git = (...args) =>
    execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: 'pipe' }).trim()
  const put = (file, content) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true })
    writeFileSync(path.join(root, file), content)
  }
  git('init', '--quiet')
  git('config', 'user.name', 'Migration Test')
  git('config', 'user.email', 'migration-test@example.invalid')
  put('.gitattributes', '* text=auto eol=lf\n')
  if (withMigration) put(migration, 'select 1;\n')
  const commit = () => {
    git('add', '--all')
    git('commit', '--quiet', '--no-verify', '-m', 'test fixture')
    return git('rev-parse', 'HEAD')
  }
  const base = commit()
  git('update-ref', 'refs/remotes/origin/main', base)
  return {
    root,
    put,
    git,
    commit,
    base,
    run: (baseline) => {
      const env = { ...process.env }
      delete env.MIGRATION_BASE_SHA
      if (baseline !== undefined) env.MIGRATION_BASE_SHA = baseline
      return spawnSync(process.execPath, [script], { cwd: root, env, encoding: 'utf8' })
    },
  }
}

test('new migrations remain editable until merged; an empty baseline is valid', (t) => {
  const f = fixture(t, false)
  f.put(migration, 'select 1;\n')
  f.commit()
  f.put(migration, 'select 2;\n')
  assert.equal(f.run().status, 0)
})

test('rejects unstaged, staged and committed rewrites without printing SQL', (t) => {
  const f = fixture(t)
  f.put('supabase/migrations/20261012000000_next.sql', 'select 2;\n')
  f.commit()
  assert.equal(f.run().status, 0)
  f.put(migration, 'select 987654321;\n')
  const result = f.run()
  assert.equal(result.status, 1)
  assert.match(result.stderr, /first schema.sql/)
  assert.ok(!result.stderr.includes('987654321'))
  f.git('add', '--', migration)
  f.put(migration, 'select 1;\n')
  assert.equal(f.run().status, 1, 'a safe working copy cannot hide a staged rewrite')
  f.put(migration, 'select 987654321;\n')
  f.commit()
  f.put('unrelated.txt', 'later commit')
  f.commit()
  f.put(migration, 'select 1;\n')
  assert.equal(f.run().status, 1, 'checks the whole branch, not just its last commit')
  f.commit()
  assert.equal(f.run().status, 0, 'restoring the original migration passes')
})

test('rejects deletion and renaming, including staged rename detection', (t) => {
  const f = fixture(t)
  f.git('mv', migration, 'supabase/migrations/20261011000000_renamed.sql')
  assert.equal(f.run().status, 1)
  f.git('mv', 'supabase/migrations/20261011000000_renamed.sql', migration)
  assert.equal(f.run().status, 0)
  rmSync(path.join(f.root, migration))
  assert.equal(f.run().status, 1)
})

test('pre-push baseline detects a main rewrite after origin/main has moved', (t) => {
  const f = fixture(t)
  f.put(migration, 'select 2;\n')
  f.git('update-ref', 'refs/remotes/origin/main', f.commit())
  assert.equal(f.run().status, 0)
  assert.equal(f.run(f.base).status, 1)
})

test('missing history and invalid baseline fail closed; normal line endings do not fail', (t) => {
  const f = fixture(t)
  f.put(migration, 'select 1;\r\n')
  assert.equal(f.run().status, 0)
  for (const baseline of ['', '--help', 'HEAD', '0'.repeat(40)])
    assert.equal(f.run(baseline).status, 1)
  f.git('update-ref', '-d', 'refs/remotes/origin/main')
  assert.equal(f.run().status, 1)
  assert.equal(f.run(f.base).status, 0)
})

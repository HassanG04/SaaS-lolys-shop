import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export function checkMigrations(root = process.cwd(), baseSha = process.env.MIGRATION_BASE_SHA) {
  // CI may select the pre-push commit; arbitrary refs/options are not accepted.
  if (baseSha !== undefined && !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(baseSha))
    throw new Error('Invalid migration baseline')
  const git = (...args) =>
    execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  const base = git(
    'rev-parse',
    '--verify',
    `${baseSha ?? 'refs/remotes/origin/main'}^{commit}`,
  ).trim()
  const failures = new Map()
  // Check all three states: restoring the working file must not hide a staged
  // or committed rewrite, including a rewrite in an earlier branch commit.
  for (const target of [['HEAD'], ['--cached'], []]) {
    const fields = git(
      'diff',
      '--no-ext-diff',
      '--no-textconv',
      '--no-renames',
      '--name-status',
      '-z',
      '--diff-filter=DMRTUXB',
      base,
      ...target,
      '--',
      'supabase/migrations/',
    ).split('\0')
    for (let index = 0; index < fields.length - 1; index += 2)
      failures.set(fields[index + 1], fields[index])
  }
  return { base, failures: [...failures].map(([file, status]) => ({ file, status })) }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if (process.argv.length !== 2) throw new Error('Unexpected arguments')
    const { failures } = checkMigrations()
    for (const { file, status } of failures)
      process.stderr.write(
        `[MIGRATIONS] ${status}: ${JSON.stringify(file)}; add a new migration.\n`,
      )
    process.exitCode = failures.length ? 1 : 0
    if (!failures.length) process.stdout.write('[MIGRATIONS] Existing migrations are unchanged.\n')
  } catch {
    process.stderr.write(
      '[MIGRATIONS] Cannot verify history; fetch origin/main and check the baseline and Git state.\n',
    )
    process.exitCode = 1
  }
}

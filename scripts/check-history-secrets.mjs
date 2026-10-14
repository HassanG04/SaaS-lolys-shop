import { spawnSync } from 'node:child_process'

// Never read environment values, including historical blobs. Inspect names first.
const history = spawnSync('git', ['log', '--all', '--format=', '--name-only', '-z'], {
  encoding: 'utf8',
  timeout: 60_000,
  maxBuffer: 16 * 1024 * 1024,
})
if (history.status !== 0) {
  process.stderr.write('Secret scan failed: Git history unavailable.\n')
  process.exit(2)
}
const paths = history.stdout.split('\0').map((file) => file.trim())
if (
  paths.some((file) => {
    const name = file.split('/').at(-1)
    return name?.startsWith('.env') && name !== '.env.example'
  })
) {
  process.stderr.write('Secret scan failed: environment file found in Git history.\n')
  process.exit(1)
}
const result = spawnSync(
  process.env.GITLEAKS_BIN ?? 'gitleaks',
  [
    'git',
    '--log-opts=--all -- . :(exclude,glob)**/.env* :(exclude).env*',
    '--redact=100',
    '--no-banner',
    '--no-color',
    '--ignore-gitleaks-allow',
    '--log-level=error',
    '.',
  ],
  { encoding: 'utf8', timeout: 180_000, maxBuffer: 16 * 1024 * 1024 },
)
// Do not forward scanner output: even diagnostic context may contain secrets.
if (result.status !== 0) {
  process.stderr.write(
    result.status === 1
      ? 'Secret scan failed: Gitleaks detected a credential in Git history.\n'
      : 'Secret scan failed: Gitleaks could not complete.\n',
  )
  process.exit(result.status === 1 ? 1 : 2)
}
process.stdout.write('Git history secret scan passed.\n')

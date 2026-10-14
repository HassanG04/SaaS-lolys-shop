import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export function scan(root = process.cwd(), maintained = true) {
  const args = [
    'scan',
    '--config',
    fileURLToPath(new URL('../.semgrep/project.yml', import.meta.url)),
    ...(maintained ? ['--config', 'p/typescript', '--config', 'p/react'] : []),
    '--severity',
    'ERROR',
    '--error',
    '--strict',
    '--oss-only',
    '--disable-nosem',
    '--metrics',
    'off',
    '--disable-version-check',
    '--no-rewrite-rule-ids',
    '--no-git-ignore',
    '--max-target-bytes',
    '0',
    '--json',
    '--exclude',
    '*.test.*',
    '--exclude',
    '.env*',
    'src',
  ]
  const result = spawnSync(process.env.SEMGREP_BIN || 'semgrep', args, {
    cwd: root,
    encoding: 'utf8',
    timeout: 240_000,
    maxBuffer: 20 * 1024 * 1024,
    env: { ...process.env, SEMGREP_SEND_METRICS: 'off', SEMGREP_ENABLE_VERSION_CHECK: '0' },
  })
  if (result.error || ![0, 1].includes(result.status))
    throw new Error('SAST scanner failed or is unavailable')
  const report = JSON.parse(result.stdout)
  if (report.errors?.length || !report.paths?.scanned?.length || !Array.isArray(report.results)) {
    throw new Error('SAST did not complete a clean, nonempty scan')
  }
  if (result.status === 1 && report.results.length === 0)
    throw new Error('SAST failed without findings')
  if (report.results.length && result.status !== 1)
    throw new Error('SAST failed to reject findings')
  return report.results.map((finding) => ({
    rule: finding.check_id,
    path: finding.path,
    line: finding.start.line,
  }))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const findings = scan()
    // Never echo source snippets or scanner diagnostics (they may contain secrets).
    console.log(`SAST: ${findings.length} high-severity finding(s).`)
    for (const finding of findings) console.error(`${finding.path}:${finding.line} ${finding.rule}`)
    process.exitCode = findings.length ? 1 : 0
  } catch {
    console.error(
      'SAST could not complete. Check scanner installation, configuration and registry access.',
    )
    process.exitCode = 2
  }
}

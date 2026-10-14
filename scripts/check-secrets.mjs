import { execFileSync } from 'node:child_process'
import { lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const privilegedRole = ['service', 'role'].join('_')
const keyPrefix = ['sb', 'secret', ''].join('_')
const jwt = /[A-Za-z0-9_-]+={0,2}\.[A-Za-z0-9_-]+={0,2}\.[A-Za-z0-9_-]*/g

export function inspectText(source, file) {
  const findings = new Set()
  for (const [token] of source.matchAll(jwt)) {
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
      if (payload?.role === privilegedRole) findings.add('PRIVILEGED_JWT')
    } catch {
      // A malformed token is not a decoded privileged JWT.
    }
  }
  if (new RegExp(`${keyPrefix}[A-Za-z0-9_-]+`).test(source)) findings.add('SECRET_KEY')
  const documentationOrTest =
    !file.startsWith('dist/') &&
    (file.endsWith('.md') ||
      file.startsWith('docs/') ||
      file.startsWith('.semgrep/') ||
      /(^|\/)(?:tests|__tests__)\//.test(file) ||
      /\.(?:test|spec)\.(?:[cm]?[jt]sx?|sql)$/.test(file))
  if (!documentationOrTest && source.includes(privilegedRole)) findings.add('PRIVILEGED_ROLE')
  if (
    path.posix.basename(file) === '.env.example' &&
    source.split(/\r?\n/).some((line) => !/^(?:#.*|[A-Z][A-Z0-9_]*=?)?$/.test(line.trim()))
  )
    findings.add('ENV_TEMPLATE_VALUE')
  return [...findings]
}

export function checkRepository(root) {
  const boundary = realpathSync(root) + path.sep
  const tracked = execFileSync('git', ['ls-files', '--cached', '-z'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
    .split('\0')
    .filter(Boolean)
  if (!tracked.length) throw new Error('No tracked inputs')
  const files = new Set(tracked)
  let builtFiles = 0
  function visit(relative) {
    const absolute = path.join(root, relative)
    const info = lstatSync(absolute)
    if (info.isSymbolicLink()) throw new Error('Linked input')
    if (info.isDirectory()) {
      for (const name of readdirSync(absolute)) visit(`${relative}/${name}`)
    } else if (info.isFile()) {
      files.add(relative)
      builtFiles++
    } else throw new Error('Unsupported input')
  }
  visit('dist')
  if (!builtFiles) throw new Error('Empty build')
  const findings = []
  for (const file of files) {
    // Reject environment files by name without opening their values.
    if (path.posix.basename(file).startsWith('.env') && file !== '.env.example') {
      findings.push({ file, rules: ['ENV_FILE'] })
      continue
    }
    const absolute = path.resolve(root, file)
    if (!realpathSync(absolute).startsWith(boundary) || !lstatSync(absolute).isFile())
      throw new Error('Unsafe or missing input')
    const rules = inspectText(readFileSync(absolute).toString('utf8'), file)
    if (rules.length) findings.push({ file, rules })
  }
  return findings
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const findings = checkRepository(process.cwd())
    for (const { file, rules } of findings) {
      const label = inspectText(file, 'filename').length
        ? '[redacted filename]'
        : JSON.stringify(file)
      process.stderr.write(`[SECRETS] ${label}: ${rules.join(', ')}\n`)
    }
    process.exitCode = findings.length ? 1 : 0
    if (!findings.length) process.stdout.write('[SECRETS] Tracked files and build passed.\n')
  } catch {
    process.stderr.write(
      '[SECRETS] Required inputs could not be scanned; check Git, files and dist.\n',
    )
    process.exitCode = 1
  }
}

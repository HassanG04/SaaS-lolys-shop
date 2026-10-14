import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export const EXPECTED_REGISTRY = 'https://registry.npmjs.org/'

export const ALLOWED_LICENSES = new Set([
  '0BSD',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'BlueOak-1.0.0',
  'CC-BY-4.0',
  'CC0-1.0',
  'ISC',
  'MIT',
  'MIT-0',
  'MPL-2.0',
  'Python-2.0',
  'Unlicense',
])

export const ALLOWED_INSTALL_SCRIPTS = new Set(['fsevents'])

function evaluateBooleanExpression(expr) {
  const tokens = expr.match(/\(|\)|&&|\|\||true|false/g) || []
  let pos = 0

  function parsePrimary() {
    const token = tokens[pos++]
    if (token === '(') {
      const val = parseOr()
      pos++ // skip ')'
      return val
    }
    return token === 'true'
  }

  function parseAnd() {
    let val = parsePrimary()
    while (pos < tokens.length && tokens[pos] === '&&') {
      pos++
      val = val && parsePrimary()
    }
    return val
  }

  function parseOr() {
    let val = parseAnd()
    while (pos < tokens.length && tokens[pos] === '||') {
      pos++
      val = val || parseAnd()
    }
    return val
  }

  return parseOr()
}

/**
 * Validates a license expression (handles SPDX expressions with AND, OR, parentheses).
 */
export function isLicenseAllowed(expression, allowedSet = ALLOWED_LICENSES) {
  if (!expression) return false
  const raw = typeof expression === 'string' ? expression : expression.type
  if (!raw || typeof raw !== 'string' || !raw.trim()) return false

  const tokens = raw.trim().match(/\(|\)|AND|OR|[A-Za-z0-9_.\-+]+/g)
  if (!tokens) return false

  let boolExpr = ''
  for (const token of tokens) {
    if (token === '(' || token === ')') {
      boolExpr += token
    } else if (token === 'AND') {
      boolExpr += ' && '
    } else if (token === 'OR') {
      boolExpr += ' || '
    } else {
      boolExpr += allowedSet.has(token) ? 'true' : 'false'
    }
  }

  try {
    return evaluateBooleanExpression(boolExpr)
  } catch {
    return false
  }
}

/**
 * Validates that every resolved URL in package-lock.json points to the expected registry.
 */
export function checkLockfileRegistries(lockfileData, expectedRegistry = EXPECTED_REGISTRY) {
  const violations = []
  if (!lockfileData || typeof lockfileData !== 'object' || !lockfileData.packages) {
    violations.push({
      type: 'INVALID_LOCKFILE',
      message: 'package-lock.json is missing or lacks "packages" property',
    })
    return violations
  }

  for (const [pkgPath, pkg] of Object.entries(lockfileData.packages)) {
    if (!pkg || typeof pkg !== 'object') continue
    if (pkg.resolved) {
      if (!pkg.resolved.startsWith(expectedRegistry)) {
        violations.push({
          type: 'UNEXPECTED_REGISTRY',
          package: pkgPath,
          resolved: pkg.resolved,
          message: `Package "${pkgPath}" resolves to unexpected registry "${pkg.resolved}" (expected prefix "${expectedRegistry}")`,
        })
      }
    }
  }

  return violations
}

/**
 * Validates that dependencies in package-lock.json use approved licenses.
 */
export function checkLockfileLicenses(lockfileData, allowedSet = ALLOWED_LICENSES) {
  const violations = []
  if (!lockfileData || typeof lockfileData !== 'object' || !lockfileData.packages) {
    violations.push({
      type: 'INVALID_LOCKFILE',
      message: 'package-lock.json is missing or lacks "packages" property',
    })
    return violations
  }

  for (const [pkgPath, pkg] of Object.entries(lockfileData.packages)) {
    if (!pkgPath || !pkg || typeof pkg !== 'object') continue // skip root package ("")

    const license = pkg.license
    if (!license) {
      violations.push({
        type: 'MISSING_LICENSE',
        package: pkgPath,
        message: `Package "${pkgPath}" does not specify a license`,
      })
    } else if (!isLicenseAllowed(license, allowedSet)) {
      const licenseStr = typeof license === 'string' ? license : JSON.stringify(license)
      violations.push({
        type: 'DISALLOWED_LICENSE',
        package: pkgPath,
        license: licenseStr,
        message: `Package "${pkgPath}" has disallowed or unapproved license "${licenseStr}"`,
      })
    }
  }

  return violations
}

/**
 * Validates that only allow-listed dependencies declare install/lifecycle scripts.
 */
export function checkLockfileInstallScripts(
  lockfileData,
  allowedScripts = ALLOWED_INSTALL_SCRIPTS,
) {
  const violations = []
  if (!lockfileData || typeof lockfileData !== 'object' || !lockfileData.packages) {
    violations.push({
      type: 'INVALID_LOCKFILE',
      message: 'package-lock.json is missing or lacks "packages" property',
    })
    return violations
  }

  for (const [pkgPath, pkg] of Object.entries(lockfileData.packages)) {
    if (!pkgPath || !pkg || typeof pkg !== 'object') continue

    if (pkg.hasInstallScript) {
      const baseName = pkgPath.split('node_modules/').pop()
      if (!allowedScripts.has(baseName)) {
        violations.push({
          type: 'UNAUTHORIZED_INSTALL_SCRIPT',
          package: pkgPath,
          message: `Package "${pkgPath}" specifies an install script but is not in the allowlist`,
        })
      }
    }
  }

  return violations
}

const ACTION_USES_REGEX = /^\s*(?:-\s+)?uses:\s*([^\s#]+)(?:\s*#\s*(.*))?$/

/**
 * Validates that all GitHub Actions used in workflow files are pinned to 40-character SHAs with version comments.
 */
export function checkWorkflowPinning(workflowsDir) {
  const violations = []
  let files = []
  try {
    files = readdirSync(workflowsDir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
  } catch (error) {
    violations.push({
      type: 'WORKFLOW_DIR_ERROR',
      message: `Failed to read workflow directory "${workflowsDir}": ${error.message}`,
    })
    return violations
  }

  for (const file of files) {
    const filePath = path.join(workflowsDir, file)
    let content = ''
    try {
      content = readFileSync(filePath, 'utf8')
    } catch (error) {
      violations.push({
        type: 'WORKFLOW_FILE_READ_ERROR',
        file,
        message: `Failed to read "${filePath}": ${error.message}`,
      })
      continue
    }

    const lines = content.split(/\r?\n/)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const match = line.match(ACTION_USES_REGEX)
      if (!match) continue

      const actionRef = match[1]
      const comment = match[2]?.trim() || ''

      // Local action references like ./.github/actions/foo are exempt from SHA pinning
      if (actionRef.startsWith('./') || actionRef.startsWith('../')) {
        continue
      }

      if (!actionRef.includes('@')) {
        violations.push({
          type: 'UNPINNED_ACTION',
          file,
          line: i + 1,
          action: actionRef,
          message: `Action "${actionRef}" in ${file}:${i + 1} is missing a version/SHA pin`,
        })
        continue
      }

      const [actionName, ref] = actionRef.split('@')
      const isFullSha = /^[0-9a-fA-F]{40}$/.test(ref)

      if (!isFullSha) {
        violations.push({
          type: 'UNPINNED_ACTION',
          file,
          line: i + 1,
          action: actionRef,
          message: `Action "${actionName}" in ${file}:${i + 1} is pinned to "${ref}", not a 40-character commit SHA`,
        })
      }

      if (!comment) {
        violations.push({
          type: 'MISSING_ACTION_COMMENT',
          file,
          line: i + 1,
          action: actionRef,
          message: `Action "${actionRef}" in ${file}:${i + 1} is missing a version comment (e.g. # v1.2.3)`,
        })
      }
    }
  }

  return violations
}

/**
 * Master check function for repository supply chain.
 */
export function checkSupplyChain(rootDir = process.cwd()) {
  const lockfilePath = path.join(rootDir, 'package-lock.json')
  const workflowsDir = path.join(rootDir, '.github', 'workflows')

  let lockfileData
  const lockfileViolations = []
  try {
    const raw = readFileSync(lockfilePath, 'utf8')
    lockfileData = JSON.parse(raw)
  } catch (error) {
    lockfileViolations.push({
      type: 'LOCKFILE_READ_ERROR',
      message: `Failed to read or parse "${lockfilePath}": ${error.message}`,
    })
  }

  const registryViolations = lockfileData ? checkLockfileRegistries(lockfileData) : []
  const licenseViolations = lockfileData ? checkLockfileLicenses(lockfileData) : []
  const scriptViolations = lockfileData ? checkLockfileInstallScripts(lockfileData) : []
  const workflowViolations = checkWorkflowPinning(workflowsDir)

  return [
    ...lockfileViolations,
    ...registryViolations,
    ...licenseViolations,
    ...scriptViolations,
    ...workflowViolations,
  ]
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const violations = checkSupplyChain(process.cwd())
  if (violations.length > 0) {
    process.stderr.write(
      `[SUPPLY-CHAIN] Found ${violations.length} supply chain security violation(s):\n`,
    )
    for (const v of violations) {
      process.stderr.write(`  - [${v.type}] ${v.message}\n`)
    }
    process.exit(1)
  } else {
    process.stdout.write(
      '[SUPPLY-CHAIN] Lockfile registries, licenses, lifecycle scripts, and workflow action pins passed.\n',
    )
  }
}

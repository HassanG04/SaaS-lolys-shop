import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  checkLockfileRegistries,
  checkLockfileLicenses,
  checkLockfileInstallScripts,
  checkWorkflowPinning,
  checkSupplyChain,
  isLicenseAllowed,
  EXPECTED_REGISTRY,
} from './check-supply-chain.mjs'

const scriptPath = fileURLToPath(new URL('./check-supply-chain.mjs', import.meta.url))

test('license expression evaluator correctly handles permissive, compound, and copyleft licenses', () => {
  // Permissive
  assert.equal(isLicenseAllowed('MIT'), true)
  assert.equal(isLicenseAllowed('Apache-2.0'), true)
  assert.equal(isLicenseAllowed('ISC'), true)
  assert.equal(isLicenseAllowed('BSD-3-Clause'), true)
  assert.equal(isLicenseAllowed('0BSD'), true)
  assert.equal(isLicenseAllowed('CC0-1.0'), true)
  assert.equal(isLicenseAllowed('MPL-2.0'), true)
  assert.equal(isLicenseAllowed({ type: 'MIT' }), true)

  // Compound expressions
  assert.equal(isLicenseAllowed('MIT AND ISC'), true)
  assert.equal(isLicenseAllowed('(MIT OR Apache-2.0)'), true)
  assert.equal(isLicenseAllowed('(MIT OR GPL-3.0)'), true) // Dual-licensed with permissive option

  // Copyleft and non-permissive
  assert.equal(isLicenseAllowed('GPL-3.0'), false)
  assert.equal(isLicenseAllowed('AGPL-3.0'), false)
  assert.equal(isLicenseAllowed('LGPL-3.0'), false)
  assert.equal(isLicenseAllowed('SSPL-1.0'), false)
  assert.equal(isLicenseAllowed('Proprietary'), false)
  assert.equal(isLicenseAllowed('MIT AND GPL-3.0'), false)
  assert.equal(isLicenseAllowed('(GPL-2.0 OR GPL-3.0)'), false)

  // Invalid or missing
  assert.equal(isLicenseAllowed(null), false)
  assert.equal(isLicenseAllowed(''), false)
  assert.equal(isLicenseAllowed('   '), false)
  assert.equal(isLicenseAllowed('INVALID / MALFORMED :::'), false)
})

test('lockfile registry check accepts expected registry and rejects foreign or unencrypted registries', () => {
  const validLockfile = {
    packages: {
      '': {},
      'node_modules/foo': {
        resolved: 'https://registry.npmjs.org/foo/-/foo-1.0.0.tgz',
      },
      'node_modules/bar': {
        resolved: 'https://registry.npmjs.org/@scope/bar/-/bar-2.0.0.tgz',
      },
      'node_modules/local': {}, // No resolved field (e.g. workspace or local)
    },
  }

  assert.deepEqual(checkLockfileRegistries(validLockfile, EXPECTED_REGISTRY), [])

  const rogueLockfile = {
    packages: {
      'node_modules/safe': {
        resolved: 'https://registry.npmjs.org/safe/-/safe-1.0.0.tgz',
      },
      'node_modules/insecure': {
        resolved: 'http://registry.npmjs.org/insecure/-/insecure-1.0.0.tgz',
      },
      'node_modules/compromised': {
        resolved: 'https://attacker.evil.com/packages/compromised.tgz',
      },
    },
  }

  const violations = checkLockfileRegistries(rogueLockfile)
  assert.equal(violations.length, 2)
  assert.equal(violations[0].type, 'UNEXPECTED_REGISTRY')
  assert.equal(violations[0].package, 'node_modules/insecure')
  assert.equal(violations[1].type, 'UNEXPECTED_REGISTRY')
  assert.equal(violations[1].package, 'node_modules/compromised')

  // Malformed lockfile
  assert.equal(checkLockfileRegistries(null)[0].type, 'INVALID_LOCKFILE')
  assert.equal(checkLockfileRegistries({})[0].type, 'INVALID_LOCKFILE')
})

test('lockfile license check enforces permissive licenses across dependencies', () => {
  const validLockfile = {
    packages: {
      '': { license: 'UNLICENSED' }, // Root package is ignored
      'node_modules/pkg-mit': { license: 'MIT' },
      'node_modules/pkg-apache': { license: 'Apache-2.0' },
      'node_modules/pkg-dual': { license: '(MIT OR GPL-3.0)' },
    },
  }

  assert.deepEqual(checkLockfileLicenses(validLockfile), [])

  const invalidLockfile = {
    packages: {
      'node_modules/pkg-gpl': { license: 'GPL-3.0' },
      'node_modules/pkg-unlicensed': {},
      'node_modules/pkg-proprietary': { license: 'Commercial' },
    },
  }

  const violations = checkLockfileLicenses(invalidLockfile)
  assert.equal(violations.length, 3)
  assert.equal(violations[0].type, 'DISALLOWED_LICENSE')
  assert.equal(violations[0].package, 'node_modules/pkg-gpl')
  assert.equal(violations[1].type, 'MISSING_LICENSE')
  assert.equal(violations[1].package, 'node_modules/pkg-unlicensed')
  assert.equal(violations[2].type, 'DISALLOWED_LICENSE')
  assert.equal(violations[2].package, 'node_modules/pkg-proprietary')
})

test('lockfile install scripts check rejects unauthorized lifecycle scripts', () => {
  const validLockfile = {
    packages: {
      '': { hasInstallScript: true }, // Root is ignored
      'node_modules/fsevents': { hasInstallScript: true },
      'node_modules/normal-pkg': { version: '1.0.0' },
    },
  }

  assert.deepEqual(checkLockfileInstallScripts(validLockfile), [])

  const invalidLockfile = {
    packages: {
      'node_modules/fsevents': { hasInstallScript: true },
      'node_modules/evil-native-hook': { hasInstallScript: true },
      'node_modules/nested/node_modules/rogue-script': { hasInstallScript: true },
    },
  }

  const violations = checkLockfileInstallScripts(invalidLockfile)
  assert.equal(violations.length, 2)
  assert.equal(violations[0].package, 'node_modules/evil-native-hook')
  assert.equal(violations[1].package, 'node_modules/nested/node_modules/rogue-script')
})

test('workflow pinning check enforces 40-character SHAs and version comments on GitHub Actions', (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'workflow-pin-test-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))

  // Valid workflow
  writeFileSync(
    path.join(dir, 'valid.yml'),
    `name: CI
jobs:
  test:
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
      - uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0
      - uses: ./.github/actions/local-action
`,
  )

  assert.deepEqual(checkWorkflowPinning(dir), [])

  // Invalid workflow with various unpinned or malformed steps
  writeFileSync(
    path.join(dir, 'invalid.yml'),
    `name: Insecure
jobs:
  test:
    steps:
      - uses: actions/checkout@v4 # Tag instead of SHA
      - uses: actions/setup-node@main # Branch instead of SHA
      - uses: actions/cache@1234567 # Short SHA
      - uses: actions/upload-artifact@3d3c42e5aac5ba805825da76410c181273ba90b1
      - uses: actions/download-artifact
`,
  )

  const violations = checkWorkflowPinning(dir)
  assert.ok(
    violations.some(
      (v) => v.file === 'invalid.yml' && v.line === 5 && v.type === 'UNPINNED_ACTION',
    ),
  )
  assert.ok(
    violations.some(
      (v) => v.file === 'invalid.yml' && v.line === 6 && v.type === 'UNPINNED_ACTION',
    ),
  )
  assert.ok(
    violations.some(
      (v) => v.file === 'invalid.yml' && v.line === 7 && v.type === 'UNPINNED_ACTION',
    ),
  )
  assert.ok(
    violations.some(
      (v) => v.file === 'invalid.yml' && v.line === 8 && v.type === 'MISSING_ACTION_COMMENT',
    ),
  )
  assert.ok(
    violations.some(
      (v) => v.file === 'invalid.yml' && v.line === 9 && v.type === 'UNPINNED_ACTION',
    ),
  )
})

test('repository supply chain validation passes with zero violations', () => {
  const violations = checkSupplyChain(process.cwd())
  assert.deepEqual(
    violations,
    [],
    `Expected 0 violations, found: ${JSON.stringify(violations, null, 2)}`,
  )
})

test('CLI fails with exit code 1 when supply chain violations are present', (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'supply-chain-cli-test-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))

  mkdirSync(path.join(dir, '.github', 'workflows'), { recursive: true })
  writeFileSync(
    path.join(dir, '.github', 'workflows', 'test.yml'),
    'steps:\n  - uses: actions/checkout@v4\n',
  )
  writeFileSync(
    path.join(dir, 'package-lock.json'),
    JSON.stringify({
      packages: {
        'node_modules/bad': {
          resolved: 'https://evil.registry.com/bad.tgz',
          license: 'GPL-3.0',
        },
      },
    }),
  )

  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: dir,
    encoding: 'utf8',
  })

  assert.equal(result.status, 1)
  assert.match(result.stderr, /supply chain security violation/i)
  assert.match(result.stderr, /UNEXPECTED_REGISTRY/)
  assert.match(result.stderr, /DISALLOWED_LICENSE/)
  assert.match(result.stderr, /UNPINNED_ACTION/)
})

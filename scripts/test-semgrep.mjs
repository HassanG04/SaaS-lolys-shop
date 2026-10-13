import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { scan } from './check-sast.mjs'

test('real Semgrep rejects every project violation and permits safe recovery', (t) => {
  const root = mkdtempSync(path.join(tmpdir(), 'lolys-semgrep-'))
  t.after(() => {
    if (!root.startsWith(path.join(tmpdir(), 'lolys-semgrep-'))) throw new Error('Unsafe cleanup')
    rmSync(root, { recursive: true, force: true })
  })
  mkdirSync(path.join(root, 'src'))
  const file = path.join(root, 'src', 'fixture.tsx')
  const safe = 'export const Page = () => <p>{toAppError(error).code}</p>; fetch("/catalog.json");'
  writeFileSync(file, safe)
  assert.deepEqual(scan(root, false), [], 'safe code must pass')
  const fixtures = [
    ['lolys-no-react-html', 'const page = <div dangerouslySetInnerHTML={{ __html: input }} />;'],
    ['lolys-no-inner-html', 'element.innerHTML = input;'],
    ['lolys-no-eval', 'eval(input); // nosemgrep'],
    ['lolys-no-function-constructor', 'const run = new Function(input);'],
    [
      'lolys-no-raw-error-render',
      'function Page(error) { const text = error.message; return <p>{text}</p>; }',
    ],
    [
      'lolys-no-raw-error-render',
      'try { run(); } catch (problem) { element.textContent = problem.message; }',
    ],
    ['lolys-no-raw-error-render', 'const page = <ErrorPanel message={error.message} />;'],
    ['lolys-fetch-allowlist', 'fetch("https://outside.example.invalid/data");'],
    ['lolys-fetch-allowlist', 'fetch("//outside.example.invalid/data");'],
    ['lolys-fetch-allowlist', 'fetch(destination);'],
    ['lolys-fetch-allowlist', 'window.fetch("https://outside.example.invalid/data");'],
    ['lolys-no-service-role', `const role = "${['service', 'role'].join('_')}";`],
  ]
  for (const [id, source] of fixtures) {
    writeFileSync(file, source)
    assert.ok(
      scan(root, false).some((finding) => finding.rule === id),
      `${id} must reject its planted violation`,
    )
  }
  writeFileSync(file, safe)
  assert.deepEqual(scan(root, false), [], 'removing all violations must restore success')
  // Include a rule token so Semgrep parses rather than prefilters the malformed file.
  writeFileSync(file, 'eval(input); const broken = <p>{;')
  assert.throws(() => scan(root, false), 'partial parsing must fail, even alongside findings')
  const originalScanner = process.env.SEMGREP_BIN
  t.after(() => {
    if (originalScanner === undefined) delete process.env.SEMGREP_BIN
    else process.env.SEMGREP_BIN = originalScanner
  })
  process.env.SEMGREP_BIN = 'missing-lolys-semgrep-command'
  assert.throws(() => scan(root, false), 'missing scanner must fail')
})

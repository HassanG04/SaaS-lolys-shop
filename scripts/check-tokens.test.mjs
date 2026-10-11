import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { createChecker } from './check-tokens.mjs'

const tokens = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8')
const check = createChecker(tokens)
for (const value of [
  'bg-white',
  'text-black',
  'bg-red-500',
  'hover:text-blue-600/50',
  'rounded',
  'rounded-md',
  'rounded-t-full',
  'rounded-[12px]',
  'shadow',
  'shadow-lg',
  'hover:shadow-soft',
  'shadow-[0_2px_3px_red]',
  'bg-[#123456]',
  'text-[rgb(1,2,3)]',
  'ring-red-600',
  'bg-[var(--missing)]',
]) {
  test(`rejects ${value}`, () => assert.ok(check(`<div className="${value}"/>`).length))
}
for (const source of [
  'color: "red"',
  'backgroundColor: "#fff"',
  'borderRadius: 12',
  'boxShadow: "0 0 4px red"',
  'fill="#fff"',
  'stroke="black"',
]) {
  test(`rejects inline ${source}`, () => assert.ok(check(source).length))
}
for (const source of [
  'color: red;',
  'background: rgb(1 2 3);',
  'border-radius: 8px;',
  'box-shadow: 0 0 4px red;',
  'border: 1px solid pink;',
  'color: var(--missing);',
]) {
  test(`rejects CSS ${source}`, () => assert.ok(check(`.sample { ${source} }`, true).length))
}

test('accepts documented tokens and non-color utilities', () => {
  assert.deepEqual(
    check(
      'bg-brand text-text-muted rounded-pill shadow-pill border-border-input focus:ring-focus text-small text-start border-2 stroke-2',
    ),
    [],
  )
  assert.deepEqual(
    check('bg-[var(--color-brand-val)] shadow-(--shadow-card) fill="currentColor" stroke="none"'),
    [],
  )
  assert.deepEqual(
    check(
      '.sample { color: var(--color-text-val); border: 1px solid var(--color-border-input-val); border-radius: var(--radius-card); box-shadow: var(--card-depth); border-style: dashed; }',
      true,
    ),
    [],
  )
})

test('CLI scans nested CSS and JSX, exempts only the central token file, and fails on violations', (t) => {
  const root = mkdtempSync(path.join(tmpdir(), 'lolys-tokens-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  mkdirSync(path.join(root, 'src/styles'), { recursive: true })
  mkdirSync(path.join(root, 'src/feature'), { recursive: true })
  writeFileSync(path.join(root, 'src/styles/tokens.css'), tokens)
  const cli = fileURLToPath(new URL('./check-tokens.mjs', import.meta.url))
  const run = () => spawnSync(process.execPath, [cli], { cwd: root, encoding: 'utf8' })
  assert.equal(run().status, 0)
  for (const [file, content] of [
    ['feature/Bad.tsx', '<div className="shadow-soft"/>'],
    ['styles/bad.css', '.bad { color: pink; }'],
  ]) {
    const target = path.join(root, 'src', file)
    writeFileSync(target, content)
    const result = run()
    assert.equal(result.status, 1)
    assert.ok(result.stderr.includes(file))
    rmSync(target)
  }
  assert.equal(run().status, 0)
})

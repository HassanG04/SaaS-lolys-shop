import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import { build } from 'vite'
import { bundleGraph } from './bundle-graph.ts'
import { budgetBytes, checkBundle } from './check-bundle.mjs'

const script = fileURLToPath(new URL('./check-bundle.mjs', import.meta.url))
const chunk = (fileName, imports = [], modules = [], isEntry = false, dynamicImports = []) => ({
  fileName,
  imports,
  modules,
  isEntry,
  dynamicImports,
})
function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'lolys-bundle-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const put = (file, value) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true })
    writeFileSync(path.join(root, file), value)
  }
  return {
    root,
    put,
    dist: path.join(root, 'dist'),
    graph: (chunks) => put('dist/.vite/bundle-graph.json', JSON.stringify({ version: 1, chunks })),
    run: () => spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' }),
  }
}

test('counts transitive/shared/cyclic initial imports once and excludes lazy admin', async (t) => {
  const f = fixture(t)
  f.graph([
    chunk('entry.js', ['a.js', 'b.js'], ['src/main.ts'], true, ['lazy.js']),
    chunk('a.js', ['shared.js']),
    chunk('b.js', ['shared.js']),
    chunk('shared.js', ['entry.js']),
    chunk('lazy.js', [], ['src/features/admin/panel.ts']),
  ])
  const files = ['entry.js', 'a.js', 'b.js', 'shared.js']
  files.forEach((file) => f.put(`dist/${file}`, file))
  f.put('dist/lazy.js', randomBytes(budgetBytes + 1000))
  assert.deepEqual(await checkBundle(f.dist), {
    bytes: files.reduce((sum, file) => sum + gzipSync(file).length, 0),
    chunks: 4,
  })
  f.put('dist/shared.js', randomBytes(budgetBytes + 1000))
  const failure = f.run()
  assert.equal(failure.status, 1)
  assert.match(failure.stderr, /Initial JavaScript.*budget is 200000/)
  f.put('dist/shared.js', 'shared.js')
  assert.equal(f.run().status, 0, 'removing the budget breach restores a passing command')
})

test('admin detection uses module attribution even inside an innocently named shared chunk', async (t) => {
  const f = fixture(t)
  f.put('dist/entry.js', 'entry')
  f.put('dist/shared.js', 'shared')
  for (const module of [
    'src/pages/AdminPage.tsx',
    'src/features/admin/panel.ts',
    'src/components/admin/Sidebar.tsx',
    'node_modules/recharts/es6/index.js',
  ]) {
    f.graph([chunk('entry.js', ['shared.js'], [], true), chunk('shared.js', [], [module])])
    await assert.rejects(checkBundle(f.dist), /Admin\/chart code/)
  }
})

test('missing, malformed, incomplete and unsafe build inputs fail closed', async (t) => {
  const f = fixture(t)
  f.put('dist/entry.js', 'entry')
  const entry = chunk('entry.js', [], ['src/main.ts'], true)
  for (const chunks of [
    [],
    [null],
    [entry, entry],
    [chunk('entry.js')],
    [{ ...entry, imports: ['missing.js'] }],
    [{ ...entry, dynamicImports: ['missing.js'] }],
    [{ ...entry, fileName: '../outside.js' }],
    [{ ...entry, fileName: 'C:\\outside.js' }],
    [{ ...entry, imports: ['https://example.com/app.js'] }],
    [{ ...entry, modules: null }],
  ]) {
    f.graph(chunks)
    await assert.rejects(checkBundle(f.dist))
  }
  for (const text of ['invalid JSON', '{"version":2,"chunks":[]}', 'null']) {
    f.put('dist/.vite/bundle-graph.json', text)
    assert.equal(f.run().status, 1)
  }
  f.graph([entry])
  rmSync(path.join(f.dist, 'entry.js'))
  assert.equal(f.run().status, 1)
  rmSync(path.join(f.dist, '.vite/bundle-graph.json'))
  assert.equal(f.run().status, 1)
})

test('real Vite builds retain admin attribution and distinguish eager from lazy imports', async (t) => {
  const f = fixture(t)
  f.put('index.html', '<script type="module" src="/src/main.js"></script>')
  f.put('src/features/admin/panel.js', 'export function openPanel() { return "admin panel" }')
  const compile = () =>
    build({
      root: f.root,
      configFile: false,
      envFile: false,
      logLevel: 'silent',
      plugins: [bundleGraph()],
    })
  f.put(
    'src/main.js',
    'import {openPanel} from "./features/admin/panel.js"; globalThis.panel = openPanel',
  )
  await compile()
  await assert.rejects(checkBundle(f.dist), /Admin\/chart code/)
  f.put('src/main.js', 'globalThis.panel = () => import("./features/admin/panel.js")')
  await compile()
  assert.equal(f.run().status, 0)
})

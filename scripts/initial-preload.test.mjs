import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { build } from 'vite'
import { bundleGraph } from './bundle-graph.ts'
import { initialPreload } from './initial-preload.ts'

test('native preloads contain only budgeted static imports, never lazy admin code', async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), 'lolys-initial-preload-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await writeFile(path.join(root, 'index.html'), '<script type="module" src="/entry.js"></script>')
  await writeFile(
    path.join(root, 'entry.js'),
    'import { label } from "./shared.js"; globalThis.label = label; globalThis.openAdmin = () => import("./admin.js")',
  )
  await writeFile(path.join(root, 'shared.js'), 'export const label = "Store"')
  await writeFile(path.join(root, 'admin.js'), 'export const title = "Private workspace"')
  await build({
    root,
    base: '/shop/',
    configFile: false,
    envFile: false,
    logLevel: 'silent',
    plugins: [bundleGraph(), initialPreload()],
    build: {
      modulePreload: false,
      rollupOptions: {
        output: { manualChunks: (id) => (id.endsWith('/shared.js') ? 'shared' : undefined) },
      },
    },
  })
  const html = await readFile(path.join(root, 'dist/index.html'), 'utf8')
  const graph = JSON.parse(await readFile(path.join(root, 'dist/.vite/bundle-graph.json'), 'utf8'))
  const entry = graph.chunks.find((chunk) => chunk.isEntry)
  assert.ok(entry)
  assert.ok(entry.imports.length > 0, 'fixture must include a real static dependency')
  const staticFiles = new Set()
  const pending = [...entry.imports]
  while (pending.length) {
    const file = pending.pop()
    if (staticFiles.has(file) || file === entry.fileName) continue
    staticFiles.add(file)
    pending.push(...graph.chunks.find((chunk) => chunk.fileName === file).imports)
  }
  const preloads = [
    ...html.matchAll(/<link rel="modulepreload" crossorigin="" href="\/shop\/(.+?)">/g),
  ].map((match) => match[1])
  assert.deepEqual(preloads.sort(), [...staticFiles].sort())
  for (const lazyFile of entry.dynamicImports) assert.ok(!preloads.includes(lazyFile))
})

import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { checkUiBuild } from './check-ui-build.mjs'

test('rejects missing builds and catches nested preview routes, assets and both languages', async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), 'lolys-build-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await assert.rejects(checkUiBuild(root), /No built JavaScript/)
  await mkdir(path.join(root, 'assets'))
  const js = path.join(root, 'assets/app.js')
  await writeFile(js, 'production')
  assert.deepEqual(await checkUiBuild(root), [])
  for (const marker of [
    '__kit',
    'معاينة عناصر الواجهة',
    'UI Kit Preview',
    'OrnamentExamples',
    'test-turnstile-token',
    'e2e-turnstile-',
  ]) {
    await writeFile(js, marker)
    assert.equal((await checkUiBuild(root)).length, 1)
  }
  await writeFile(js, 'production')
  await writeFile(path.join(root, 'assets/card-placeholder.svg'), '<svg/>')
  assert.equal((await checkUiBuild(root)).length, 1)
})

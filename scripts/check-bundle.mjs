import { lstat, readFile, realpath } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { gzipSync } from 'node:zlib'

export const budgetBytes = 200_000
const localPath = (value) =>
  typeof value === 'string' &&
  !/[\\:\0]/.test(value) &&
  value.split('/').every((part) => part && part !== '.' && part !== '..')
const adminModule = (id) =>
  /^src\/(?:.*\/)?admin\//i.test(id) ||
  /^src\/.*\/Admin[^/]*\.[cm]?[jt]sx?$/.test(id) ||
  /(?:^|\/)node_modules\/recharts\//.test(id)
const invalid = () => new Error('Missing, unsafe or invalid bundle graph/assets; rebuild first.')

export async function checkBundle(directory = 'dist') {
  const root = await realpath(directory)
  const readLocal = async (file) => {
    if (!localPath(file)) throw invalid()
    const full = path.join(root, file)
    const resolved = await realpath(full)
    const relative = path.relative(root, resolved)
    if (relative.startsWith('..') || path.isAbsolute(relative) || !(await lstat(full)).isFile())
      throw invalid()
    return readFile(full)
  }
  const graph = JSON.parse((await readLocal('.vite/bundle-graph.json')).toString())
  if (graph?.version !== 1 || !Array.isArray(graph.chunks)) throw invalid()
  const chunks = new Map()
  for (const chunk of graph.chunks) {
    if (
      !chunk ||
      !localPath(chunk.fileName) ||
      !/\.m?js$/.test(chunk.fileName) ||
      chunks.has(chunk.fileName) ||
      typeof chunk.isEntry !== 'boolean' ||
      ![chunk.imports, chunk.dynamicImports, chunk.modules].every(
        (items) => Array.isArray(items) && items.every(localPath),
      )
    )
      throw invalid()
    chunks.set(chunk.fileName, chunk)
  }
  const contents = new Map()
  for (const chunk of chunks.values()) {
    if ([...chunk.imports, ...chunk.dynamicImports].some((file) => !chunks.has(file)))
      throw invalid()
    contents.set(chunk.fileName, await readLocal(chunk.fileName))
  }
  const pending = [...chunks.values()]
    .filter((chunk) => chunk.isEntry)
    .map((chunk) => chunk.fileName)
  if (!pending.length) throw invalid()
  const initial = new Set()
  let bytes = 0
  while (pending.length) {
    const file = pending.pop()
    if (initial.has(file)) continue
    initial.add(file)
    const chunk = chunks.get(file)
    if (chunk.modules.some(adminModule))
      throw new Error('Admin/chart code is in the initial download; use a lazy admin route.')
    bytes += gzipSync(contents.get(file)).length
    pending.push(...chunk.imports)
  }
  if (bytes > budgetBytes)
    throw new Error(`Initial JavaScript is ${bytes} gzip bytes; budget is ${budgetBytes}.`)
  return { bytes, chunks: initial.size }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const result = await checkBundle()
    console.log(
      `[BUNDLE] ${result.bytes}/${budgetBytes} gzip bytes in ${result.chunks} initial chunks.`,
    )
  } catch (error) {
    const message = /^(Admin\/chart code|Initial JavaScript is)/.test(error.message)
      ? error.message
      : invalid().message
    console.error(`[BUNDLE] ${message}`)
    process.exitCode = 1
  }
}

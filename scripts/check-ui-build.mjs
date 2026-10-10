import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const markers = [
  '__kit',
  'KitPage',
  'card-placeholder',
  'FeedbackExamples',
  'DialogExample',
  'OrnamentExamples',
  'معاينة عناصر الواجهة',
  'بطاقة تجريبية',
  'تفاصيل المعاينة',
  'UI Kit Preview',
  'Sample preview image',
  'Sample image in arch frame',
]

export async function checkUiBuild(root = 'dist') {
  const files = await readdir(root, { recursive: true })
  if (!files.some((file) => file.endsWith('.js'))) throw new Error('No built JavaScript found')
  const failures = []
  for (const file of files) {
    if (markers.some((marker) => file.includes(marker))) failures.push(file)
    if (!/\.(?:js|css|html|json|svg|map)$/.test(file)) continue
    const content = await readFile(path.join(root, file), 'utf8')
    for (const marker of markers) if (content.includes(marker)) failures.push(`${file}: ${marker}`)
  }
  return failures
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const failures = await checkUiBuild()
    if (failures.length) throw new Error(failures.join('\n'))
    console.log('[UI BUILD] Development preview code, fixtures and copy excluded.')
  } catch (error) {
    console.error(`[UI BUILD] ${error.message}`)
    process.exitCode = 1
  }
}

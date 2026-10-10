import fs from 'node:fs/promises'
import path from 'node:path'

export const BAD_REGEX =
  /\b(bg-white|bg-black|text-white|text-black|rounded-(sm|md|lg|xl|2xl|3xl|full)|shadow-(sm|md|lg|xl|2xl|inner|none)|border-(white|black))\b|\b(bg|text|border|shadow|rounded|ring)-\[[^\]]*#[0-9a-fA-F]+[^\]]*\]/g

export async function checkFile(filePath) {
  const content = await fs.readFile(filePath, 'utf8')
  const matches = content.match(BAD_REGEX)
  if (matches) {
    return matches
  }
  return null
}

async function walk(dir, out = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await walk(full, out)
    } else if (full.endsWith('.tsx') || full.endsWith('.ts')) {
      out.push(full)
    }
  }
  return out
}

async function run() {
  const files = await walk(path.join(process.cwd(), 'src'))
  let failed = false
  for (const file of files) {
    const matches = await checkFile(file)
    if (matches) {
      console.error(
        `[TOKENS] Violation in ${file}: Found hard-coded classes: ${matches.join(', ')}`,
      )
      failed = true
    }
  }
  if (failed) {
    process.exit(1)
  }
  console.log('[TOKENS] All files use design-system tokens.')
}

// Only run if executed directly
if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('check-tokens.mjs')
) {
  run().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}

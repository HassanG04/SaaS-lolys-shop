import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

function extractLeafPaths(obj, prefix = '') {
  const result = []
  if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      const next = prefix ? `${prefix}.${key}` : key
      if (typeof value === 'object' && value !== null) {
        result.push(...extractLeafPaths(value, next))
      } else {
        result.push(next)
      }
    }
  }
  return result
}

export async function checkI18n(root = process.cwd()) {
  const failures = []
  const arPath = path.join(root, 'src/i18n/ar.json')
  const enPath = path.join(root, 'src/i18n/en.json')
  const translationsPath = path.join(root, 'src/i18n/translations.ts')

  let ar, en
  try {
    ar = JSON.parse(await readFile(arPath, 'utf8'))
    en = JSON.parse(await readFile(enPath, 'utf8'))
  } catch (err) {
    return [`Failed to load dictionary files: ${err.message}`]
  }

  const arPaths = extractLeafPaths(ar)
  const enPaths = extractLeafPaths(en)
  const arSet = new Set(arPaths)
  const enSet = new Set(enPaths)

  // 1. Check dictionary key parity
  for (const p of arPaths) {
    if (!enSet.has(p)) {
      failures.push(`Key "${p}" present in ar.json but missing from en.json`)
    }
  }
  for (const p of enPaths) {
    if (!arSet.has(p)) {
      failures.push(`Key "${p}" present in en.json but missing from ar.json`)
    }
  }

  // 2. Kit keys must be development-only (never imported into production translations.ts)
  let translationsContent = ''
  try {
    translationsContent = await readFile(translationsPath, 'utf8')
  } catch {
    failures.push('Missing src/i18n/translations.ts')
  }

  const codeOnly = translationsContent.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '')
  if (/\b(?:import|export)\b[^;]*\bkit\b/i.test(codeOnly) || /\b(?:arKit|enKit)\b/.test(codeOnly)) {
    failures.push('src/i18n/translations.ts imports or exports development-only "kit" keys')
  }

  // Identify all production groups exported in translations.ts
  const exportedGroups = new Set()
  for (const match of translationsContent.matchAll(/ar([A-Z]\w+)/g)) {
    exportedGroups.add(match[1].toLowerCase())
  }
  for (const match of translationsContent.matchAll(/en([A-Z]\w+)/g)) {
    exportedGroups.add(match[1].toLowerCase())
  }

  // 3. Scan all source files in src/
  const srcDir = path.join(root, 'src')
  const files = await readdir(srcDir, { recursive: true })
  const usedKeys = new Set()

  for (const file of files) {
    if (!/\.(?:[jt]sx?)$/.test(file)) continue
    const relative = path.join('src', file).replaceAll(path.sep, '/')
    const isDevOnly =
      relative.includes('/dev/') || relative.endsWith('.test.ts') || relative.endsWith('.test.tsx')
    const content = await readFile(path.join(srcDir, file), 'utf8')

    // Check for kit leakage in production code
    if (!isDevOnly && !relative.endsWith('translations.ts')) {
      if (/\bt(?:\.kit|\(\s*['"]kit\.)/.test(content)) {
        failures.push(`Production file "${relative}" references development-only kit copy`)
      }
    }

    // Extract t('key') and t("key")
    for (const match of content.matchAll(/\bt\(\s*['"]([a-zA-Z0-9_.]+)['"]/g)) {
      usedKeys.add(match[1])
    }
    // Extract t.group.key
    for (const match of content.matchAll(/\bt\.([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)/g)) {
      usedKeys.add(`${match[1]}.${match[2]}`)
    }
  }

  // 4. Check that no key used in code is missing from dictionaries
  for (const usedKey of usedKeys) {
    // If it's a plural base key like 'items', it might match 'items_zero', etc.
    const isExact = arSet.has(usedKey) || enSet.has(usedKey)
    const isPlural = [...arSet].some((k) => k.startsWith(`${usedKey}_`))
    if (!isExact && !isPlural) {
      failures.push(`Translation key "${usedKey}" used in code is missing from locale files`)
    }
  }

  // 5. Check for unused production keys (keys defined outside 'kit' must belong to exported groups)
  const productionKeys = arPaths.filter((k) => !k.startsWith('kit.'))
  for (const prodKey of productionKeys) {
    const topGroup = prodKey.split('.')[0].toLowerCase()
    if (!exportedGroups.has(topGroup) && !usedKeys.has(prodKey)) {
      failures.push(
        `Unused production key "${prodKey}" is neither exported in translations.ts nor used in code`,
      )
    }
  }

  return [...new Set(failures)]
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const failures = await checkI18n()
    if (failures.length) {
      console.error('[I18N FAILURES]:\n' + failures.join('\n'))
      process.exitCode = 1
    } else {
      console.log('[I18N] All translation keys valid, synchronized, and isolated.')
    }
  } catch (error) {
    console.error(`[I18N ERROR] ${error.message}`)
    process.exitCode = 1
  }
}

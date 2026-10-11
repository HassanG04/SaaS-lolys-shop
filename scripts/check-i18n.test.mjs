import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { checkI18n } from './check-i18n.mjs'

test('checkI18n passes on valid project files', async () => {
  const failures = await checkI18n()
  assert.deepEqual(failures, [])
})

test('checkI18n detects dictionary parity mismatches', async (t) => {
  const root = mkdtempSync(path.join(tmpdir(), 'lolys-i18n-parity-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))

  mkdirSync(path.join(root, 'src/i18n'), { recursive: true })
  writeFileSync(
    path.join(root, 'src/i18n/ar.json'),
    JSON.stringify({ nav: { store: 'المتجر', extra: 'إضافي' } }),
  )
  writeFileSync(path.join(root, 'src/i18n/en.json'), JSON.stringify({ nav: { store: 'Store' } }))
  writeFileSync(
    path.join(root, 'src/i18n/translations.ts'),
    "import { nav as arNav } from './ar.json'; import { nav as enNav } from './en.json'; export const translations = { ar: { nav: arNav }, en: { nav: enNav } };",
  )

  const failures = await checkI18n(root)
  assert.ok(failures.some((f) => f.includes('missing from en.json')))
})

test('checkI18n detects kit import into translations.ts', async (t) => {
  const root = mkdtempSync(path.join(tmpdir(), 'lolys-i18n-kit-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))

  mkdirSync(path.join(root, 'src/i18n'), { recursive: true })
  writeFileSync(
    path.join(root, 'src/i18n/ar.json'),
    JSON.stringify({ nav: { store: 'المتجر' }, kit: { title: 'معاينة' } }),
  )
  writeFileSync(
    path.join(root, 'src/i18n/en.json'),
    JSON.stringify({ nav: { store: 'Store' }, kit: { title: 'Preview' } }),
  )
  writeFileSync(
    path.join(root, 'src/i18n/translations.ts'),
    "import { nav as arNav, kit as arKit } from './ar.json'; import { nav as enNav } from './en.json'; export const translations = { ar: { nav: arNav, kit: arKit }, en: { nav: enNav } };",
  )

  const failures = await checkI18n(root)
  assert.ok(failures.some((f) => f.includes('development-only "kit" keys')))
})

test('checkI18n detects missing translation key used in code', async (t) => {
  const root = mkdtempSync(path.join(tmpdir(), 'lolys-i18n-missing-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))

  mkdirSync(path.join(root, 'src/i18n'), { recursive: true })
  mkdirSync(path.join(root, 'src/components'), { recursive: true })
  writeFileSync(path.join(root, 'src/i18n/ar.json'), JSON.stringify({ nav: { store: 'المتجر' } }))
  writeFileSync(path.join(root, 'src/i18n/en.json'), JSON.stringify({ nav: { store: 'Store' } }))
  writeFileSync(
    path.join(root, 'src/i18n/translations.ts'),
    "import { nav as arNav } from './ar.json'; import { nav as enNav } from './en.json'; export const translations = { ar: { nav: arNav }, en: { nav: enNav } };",
  )
  writeFileSync(
    path.join(root, 'src/components/MyComp.tsx'),
    "export function MyComp({ t }) { return <span>{t('nonexistent.key')}</span> }",
  )

  const failures = await checkI18n(root)
  assert.ok(failures.some((f) => f.includes('nonexistent.key')))
})

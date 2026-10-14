import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import App from '../App'
import KitPage from '../dev/KitPage'
import { i18n } from './i18n'
import { LanguageProvider } from './LanguageProvider'
import ar from './ar.json'
import en from './en.json'

function device(language: string) {
  Object.defineProperty(navigator, 'language', { configurable: true, value: language })
}
beforeEach(() => {
  localStorage.clear()
  document.documentElement.lang = 'ar'
  document.documentElement.dir = 'rtl'
  device('ar-EG')
})
afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  device('ar')
  document.documentElement.lang = 'ar'
  document.documentElement.dir = 'rtl'
})

test.each([
  [null, 'ar-EG', 'ar'],
  [null, 'AR-SA', 'ar'],
  [null, 'en-US', 'en'],
  [null, 'fr-FR', 'en'],
  [null, 'arn-CL', 'en'],
  ['ar', 'en-US', 'ar'],
  ['en', 'ar-EG', 'en'],
  ['invalid', 'ar-EG', 'ar'],
] as const)('saved %s with device %s selects %s', (saved, language, expected) => {
  if (saved) localStorage.setItem('app-lang', saved)
  device(language)
  render(<App />)
  const copy = expected === 'ar' ? ar : en
  expect(document.documentElement).toHaveAttribute('lang', expected)
  expect(document.documentElement).toHaveAttribute('dir', expected === 'ar' ? 'rtl' : 'ltr')
  expect(screen.getByRole('button', { name: copy.theme.dark })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: copy.ui.switchLanguage })).toHaveAttribute(
    'lang',
    expected === 'ar' ? 'en' : 'ar',
  )
  expect(localStorage.getItem('app-lang')).toBe(expected)
})

test('keyboard selection persists across remounts, keeps focus and preserves the chosen theme', async () => {
  localStorage.setItem('theme', 'dark')
  const user = userEvent.setup()
  const view = render(<App />)
  const switchBtn = screen.getByRole('button', { name: ar.ui.switchLanguage })
  switchBtn.focus()
  expect(switchBtn).toHaveFocus()
  await user.keyboard('{Enter}')
  expect(screen.getByRole('button', { name: en.ui.switchLanguage })).toHaveFocus()
  expect(document.documentElement).toHaveAttribute('lang', 'en')
  expect(document.documentElement).toHaveAttribute('dir', 'ltr')
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  expect(localStorage.getItem('theme')).toBe('dark')
  view.unmount()
  render(<App />)
  expect(screen.getByRole('button', { name: en.theme.dark })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await user.click(screen.getByRole('button', { name: en.ui.switchLanguage }))
  expect(document.documentElement).toHaveAttribute('dir', 'rtl')
  expect(localStorage.getItem('app-lang')).toBe('ar')
})

test('blocked storage still allows device selection and manual switching', async () => {
  device('en-GB')
  for (const method of ['getItem', 'setItem'] as const) {
    vi.spyOn(Storage.prototype, method).mockImplementation(() => {
      throw new Error('Storage denied')
    })
  }
  render(<App />)
  expect(document.documentElement).toHaveAttribute('lang', 'en')
  await userEvent.setup().click(screen.getByRole('button', { name: en.ui.switchLanguage }))
  expect(screen.getByRole('button', { name: ar.theme.dark })).toBeInTheDocument()
  expect(document.documentElement).toHaveAttribute('lang', 'ar')
  expect(document.documentElement).toHaveAttribute('dir', 'rtl')
})

test('English kit labels switch together while catalogue error text and code remain Arabic', async () => {
  device('en-US')
  render(
    <LanguageProvider>
      <KitPage />
    </LanguageProvider>,
  )
  expect(screen.getByRole('heading', { name: en.kit.title })).toBeInTheDocument()
  expect(screen.getAllByLabelText(en.field.name)).toHaveLength(4)
  for (const input of screen.getAllByLabelText(en.kit.invalid)) {
    expect(input).toHaveAccessibleDescription(
      `${ar.kit.invalidMessage} ${ar.kit.errorCode} ADM-007`,
    )
  }
  await userEvent.setup().click(screen.getByRole('button', { name: en.ui.switchLanguage }))
  expect(screen.getByRole('heading', { name: ar.kit.title })).toBeInTheDocument()
  expect(screen.getAllByLabelText(ar.field.name)).toHaveLength(4)
})

test('both dictionaries have matching paths and nonempty translated strings', () => {
  function paths(value: unknown, prefix = ''): string[] {
    if (typeof value === 'object' && value !== null) {
      return Object.entries(value)
        .flatMap(([key, child]) => paths(child, `${prefix}.${key}`))
        .sort()
    }
    expect(typeof value).toBe('string')
    expect(String(value).trim()).not.toBe('')
    return [prefix]
  }
  expect(paths(en)).toEqual(paths(ar))
})

test('i18next plural rules resolve CLDR forms in Arabic and English', () => {
  expect(i18n.t('product.items', { count: 0, lng: 'ar' })).toBe('لا توجد عناصر')
  expect(i18n.t('product.items', { count: 1, lng: 'ar' })).toBe('عنصر واحد')
  expect(i18n.t('product.items', { count: 2, lng: 'ar' })).toBe('عنصران')
  expect(i18n.t('product.items', { count: 3, lng: 'ar' })).toBe('3 عناصر')
  expect(i18n.t('product.items', { count: 11, lng: 'ar' })).toBe('11 عنصرًا')
  expect(i18n.t('product.items', { count: 100, lng: 'ar' })).toBe('100 عنصر')

  expect(i18n.t('product.items', { count: 1, lng: 'en' })).toBe('1 item')
  expect(i18n.t('product.items', { count: 5, lng: 'en' })).toBe('5 items')
})

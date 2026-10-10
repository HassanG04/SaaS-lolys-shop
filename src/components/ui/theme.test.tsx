import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ThemeProvider, useTheme } from './ThemeProvider'
import { ThemeToggle } from './ThemeToggle'

let media: EventTarget & { matches: boolean }
const toggle = () => screen.getByRole('button', { name: 'المظهر الداكن' })
const renderTheme = () =>
  render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  )
function changeSystem(dark: boolean) {
  media.matches = dark
  act(() => media.dispatchEvent(Object.assign(new Event('change'), { matches: dark })))
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  media = Object.assign(new EventTarget(), { matches: false })
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => media),
  )
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})

it('uses system dark mode and toggles away from the resolved theme on the first click', async () => {
  media.matches = true
  renderTheme()
  expect(toggle()).toHaveAttribute('aria-pressed', 'true')
  await userEvent.click(toggle())
  expect(document.documentElement).toHaveAttribute('data-theme', 'light')
  expect(localStorage.getItem('theme')).toBe('light')
})

it.each(['light', 'dark'] as const)(
  'restores the saved %s theme over the system preference',
  (saved) => {
    localStorage.setItem('theme', saved)
    media.matches = saved !== 'dark'
    renderTheme()
    expect(document.documentElement).toHaveAttribute('data-theme', saved)
    changeSystem(!media.matches)
    expect(document.documentElement).toHaveAttribute('data-theme', saved)
  },
)

it('follows system changes when storage is missing or invalid', () => {
  localStorage.setItem('theme', 'invalid')
  renderTheme()
  expect(document.documentElement).toHaveAttribute('data-theme', 'light')
  changeSystem(true)
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
})

it('persists a keyboard choice through remounting', async () => {
  const view = renderTheme()
  toggle().focus()
  await userEvent.keyboard(' ')
  expect(localStorage.getItem('theme')).toBe('dark')
  view.unmount()
  renderTheme()
  expect(toggle()).toHaveAttribute('aria-pressed', 'true')
})

it('continues rendering and toggling when storage reads and writes are denied', async () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException()
  })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException()
  })
  media.matches = true
  renderTheme()
  await userEvent.click(toggle())
  expect(document.documentElement).toHaveAttribute('data-theme', 'light')
})

it('follows another tab and returns to system mode when storage is cleared', () => {
  renderTheme()
  localStorage.setItem('theme', 'dark')
  fireEvent(window, new StorageEvent('storage', { key: 'theme', newValue: 'dark' }))
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  localStorage.clear()
  fireEvent(window, new StorageEvent('storage', { key: null }))
  expect(document.documentElement).toHaveAttribute('data-theme', 'light')
})

it('removes the override when the provider selects system mode', async () => {
  function Reset() {
    const { setTheme } = useTheme()
    return <button onClick={() => setTheme('system')}>system</button>
  }
  localStorage.setItem('theme', 'light')
  media.matches = true
  render(
    <ThemeProvider>
      <Reset />
    </ThemeProvider>,
  )
  await userEvent.click(screen.getByRole('button', { name: 'system' }))
  expect(localStorage.getItem('theme')).toBeNull()
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
})

it('unsubscribes when the provider unmounts', () => {
  const removeMedia = vi.spyOn(media, 'removeEventListener')
  const removeStorage = vi.spyOn(window, 'removeEventListener')
  renderTheme().unmount()
  expect(removeMedia).toHaveBeenCalledWith('change', expect.any(Function))
  expect(removeStorage).toHaveBeenCalledWith('storage', expect.any(Function))
})

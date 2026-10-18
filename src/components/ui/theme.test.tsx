import { act, fireEvent, render, screen } from '../../test-utils'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ThemeProvider, useTheme } from './ThemeProvider'
import { ThemeToggle } from './ThemeToggle'

let media: EventTarget & { matches: boolean }
let reducedMotion = false
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
  reducedMotion = false
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) =>
      query === '(prefers-reduced-motion: reduce)' ? { matches: reducedMotion } : media,
    ),
  )
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  delete document.documentElement.dataset.motion
})

it('ends the color transition after the latest rapid toggle and cleans up on unmount', () => {
  vi.useFakeTimers()
  const view = renderTheme()
  fireEvent.click(toggle())
  expect(document.documentElement).toHaveClass('theme-transition')
  act(() => vi.advanceTimersByTime(200))
  fireEvent.click(toggle())
  act(() => vi.advanceTimersByTime(200))
  expect(document.documentElement).toHaveClass('theme-transition')
  act(() => vi.advanceTimersByTime(160))
  expect(document.documentElement).not.toHaveClass('theme-transition')
  fireEvent.click(toggle())
  view.unmount()
  expect(document.documentElement).not.toHaveClass('theme-transition')
  expect(vi.getTimerCount()).toBe(0)
})

it('changes theme immediately without color animation when reduced motion is enabled', () => {
  document.documentElement.dataset.motion = 'reduced'
  renderTheme()
  fireEvent.click(toggle())
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  expect(document.documentElement).not.toHaveClass('theme-transition')
})

it('animates theme transitions under default full motion even when device reduced motion is active (T-3.11)', () => {
  reducedMotion = true
  document.documentElement.dataset.motion = 'full'
  renderTheme()
  fireEvent.click(toggle())
  expect(document.documentElement).toHaveClass('theme-transition')
})

it('uses system dark mode and toggles away from the resolved theme on the first click', async () => {
  media.matches = true
  renderTheme()
  expect(toggle()).toHaveAttribute('aria-pressed', 'true')
  expect(toggle()).toHaveAttribute('title', 'التبديل إلى المظهر الفاتح')
  expect(toggle().textContent).toBe('')
  await userEvent.click(toggle())
  expect(document.documentElement).toHaveAttribute('data-theme', 'light')
  expect(localStorage.getItem('theme')).toBe('light')
  expect(toggle()).toHaveAccessibleName('المظهر الداكن')
  expect(toggle()).toHaveAttribute('title', 'التبديل إلى المظهر الداكن')
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

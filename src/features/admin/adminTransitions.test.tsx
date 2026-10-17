import { render, fireEvent, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AdminSidebar } from './AdminSidebar'
import { AdminFallback } from './AdminRoutes'
import { LanguageProvider } from '../../i18n/LanguageProvider'

const testQueryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
})

function renderSidebar(props: {
  isOpen: boolean
  onClose: () => void
  desktopCollapsed?: boolean
}) {
  return render(
    <QueryClientProvider client={testQueryClient}>
      <MemoryRouter>
        <LanguageProvider initialLanguage="ar">
          <AdminSidebar {...props} />
        </LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Admin Transitions and Modality (T-5.13e)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Mock HTMLDialogElement methods in jsdom if needed
    if (!HTMLDialogElement.prototype.showModal) {
      HTMLDialogElement.prototype.showModal = function () {
        this.open = true
      }
    }
    if (!HTMLDialogElement.prototype.close) {
      HTMLDialogElement.prototype.close = function () {
        this.open = false
      }
    }
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('renders desktop sidebar with smooth collapse classes and inert attribute', () => {
    const { rerender } = renderSidebar({
      isOpen: false,
      desktopCollapsed: false,
      onClose: vi.fn(),
    })

    const desktopSidebar = document.getElementById('admin-desktop-sidebar')
    expect(desktopSidebar).toHaveClass('admin-desktop-sidebar', 'is-expanded')
    expect(desktopSidebar).not.toHaveAttribute('inert')

    // Collapse desktop sidebar
    rerender(
      <QueryClientProvider client={testQueryClient}>
        <MemoryRouter>
          <LanguageProvider initialLanguage="ar">
            <AdminSidebar isOpen={false} desktopCollapsed={true} onClose={vi.fn()} />
          </LanguageProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(desktopSidebar).toHaveClass('is-collapsed')
    expect(desktopSidebar).toHaveAttribute('inert')
  })

  it('manages mobile drawer modal state and slide transition lifecycle', () => {
    const onClose = vi.fn()
    const { rerender } = renderSidebar({
      isOpen: false,
      desktopCollapsed: false,
      onClose,
    })

    const drawer = document.getElementById('admin-mobile-sidebar') as HTMLDialogElement
    expect(drawer).toHaveClass('is-closed')
    expect(drawer).toHaveAttribute('data-state', 'closed')

    // Open drawer
    rerender(
      <QueryClientProvider client={testQueryClient}>
        <MemoryRouter>
          <LanguageProvider initialLanguage="ar">
            <AdminSidebar isOpen={true} desktopCollapsed={false} onClose={onClose} />
          </LanguageProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(drawer.open).toBe(true)
    expect(drawer).toHaveClass('is-open')
    expect(drawer).toHaveAttribute('data-state', 'open')

    // Trigger close from parent
    rerender(
      <QueryClientProvider client={testQueryClient}>
        <MemoryRouter>
          <LanguageProvider initialLanguage="ar">
            <AdminSidebar isOpen={false} desktopCollapsed={false} onClose={onClose} />
          </LanguageProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    // During transition out, drawer remains open and has is-closing
    expect(drawer).toHaveClass('is-closing')
    expect(drawer).toHaveAttribute('data-state', 'closing')
    expect(drawer.open).toBe(true)

    // After animation timeout completes, drawer is closed
    act(() => {
      vi.advanceTimersByTime(360)
    })

    expect(drawer.open).toBe(false)
  })

  it('triggers onClose when user cancels with Escape or clicks backdrop', () => {
    const onClose = vi.fn()
    renderSidebar({
      isOpen: true,
      desktopCollapsed: false,
      onClose,
    })

    const drawer = document.getElementById('admin-mobile-sidebar') as HTMLDialogElement

    // Press Escape (fires cancel event)
    fireEvent(drawer, new Event('cancel', { cancelable: true }))
    expect(onClose).toHaveBeenCalledTimes(1)

    // Click backdrop
    fireEvent.click(drawer, { target: drawer })
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('handles rapid reversal when re-opened before closing transition finishes', () => {
    const onClose = vi.fn()
    const { rerender } = renderSidebar({
      isOpen: true,
      desktopCollapsed: false,
      onClose,
    })

    const drawer = document.getElementById('admin-mobile-sidebar') as HTMLDialogElement
    expect(drawer).toHaveClass('is-open')

    // Start close
    rerender(
      <QueryClientProvider client={testQueryClient}>
        <MemoryRouter>
          <LanguageProvider initialLanguage="ar">
            <AdminSidebar isOpen={false} desktopCollapsed={false} onClose={onClose} />
          </LanguageProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(drawer).toHaveClass('is-closing')

    // Advance 100ms (partially through transition)
    act(() => {
      vi.advanceTimersByTime(100)
    })

    // Rapid reversal: re-open before 350ms finish
    rerender(
      <QueryClientProvider client={testQueryClient}>
        <MemoryRouter>
          <LanguageProvider initialLanguage="ar">
            <AdminSidebar isOpen={true} desktopCollapsed={false} onClose={onClose} />
          </LanguageProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(drawer).toHaveClass('is-open')
    expect(drawer).not.toHaveClass('is-closing')
    expect(drawer.open).toBe(true)
  })

  it('restores focus to opener element upon drawer exit completion', () => {
    const opener = document.createElement('button')
    opener.textContent = 'Open'
    document.body.appendChild(opener)
    opener.focus()
    expect(document.activeElement).toBe(opener)

    const onClose = vi.fn()
    const { rerender } = renderSidebar({
      isOpen: true,
      desktopCollapsed: false,
      onClose,
    })

    const drawer = document.getElementById('admin-mobile-sidebar') as HTMLDialogElement
    expect(drawer.open).toBe(true)

    // Trigger close
    rerender(
      <QueryClientProvider client={testQueryClient}>
        <MemoryRouter>
          <LanguageProvider initialLanguage="ar">
            <AdminSidebar isOpen={false} desktopCollapsed={false} onClose={onClose} />
          </LanguageProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    // Complete exit animation
    act(() => {
      vi.advanceTimersByTime(360)
    })

    expect(drawer.open).toBe(false)
    expect(document.activeElement).toBe(opener)
    document.body.removeChild(opener)
  })

  it('renders localized AdminFallback with visible skeleton geometry in Arabic and English', () => {
    const { container: arContainer } = render(
      <LanguageProvider initialLanguage="ar">
        <AdminFallback />
      </LanguageProvider>,
    )

    const arStatus = arContainer.querySelector('[role="status"]')
    expect(arStatus).toHaveAttribute('aria-label', 'جارٍ التحميل')
    expect(arContainer.querySelectorAll('.ui-skeleton').length).toBeGreaterThan(0)

    const { container: enContainer } = render(
      <LanguageProvider initialLanguage="en">
        <AdminFallback />
      </LanguageProvider>,
    )

    const enStatus = enContainer.querySelector('[role="status"]')
    expect(enStatus).toHaveAttribute('aria-label', 'Loading')
    expect(enContainer.querySelectorAll('.ui-skeleton').length).toBeGreaterThan(0)
  })
})

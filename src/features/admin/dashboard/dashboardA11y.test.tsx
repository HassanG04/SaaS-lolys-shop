import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import axe from 'axe-core'
import { LanguageProvider } from '../../../i18n/LanguageProvider'
import { DashboardPage } from './DashboardPage'
import { DashboardChart } from './DashboardChart'
import { formatDailySeriesCsv, downloadDailySeriesCsv } from './exportCsv'
import * as hooks from './hooks'
import type { DashboardDailyItem, DashboardData } from './types'

const mockDaily: DashboardDailyItem[] = [
  {
    day: '2026-10-10',
    orders: 5,
    booked_total: 1500,
    delivered_total: 1200,
  },
  {
    day: '2026-10-11',
    orders: 8,
    booked_total: 2400.5,
    delivered_total: 2000,
  },
]

const fixtureData: DashboardData = {
  range: {
    from: '2026-09-12',
    to: '2026-10-11',
  },
  kpis: {
    orders: 42,
    pending: 3,
    booked_total: 12500,
    delivered_total: 9800,
    avg_order: 297.62,
    awaiting_review: 2,
    paid_total: 9800,
  },
  daily: mockDaily,
  by_status: {
    pending: 3,
    confirmed: 10,
    shipped: 12,
    delivered: 17,
  },
  by_method: [
    { method: 'egypt_post', orders: 25, total: 7500 },
    { method: 'representative', orders: 17, total: 5000 },
  ],
  by_governorate: [
    { governorate: 'القاهرة', orders: 20, total: 6000 },
    { governorate: 'الإسكندرية', orders: 15, total: 4500 },
  ],
  top_products: [
    { product_id: 1, name: 'سلسال لؤلؤ روز', units: 18, sales: 4500 },
    { product_id: 2, name: 'خاتم ذهبي مرصع', units: 12, sales: 3600 },
  ],
  top_customers: [
    { user_id: '00000000-0000-0000-0000-000000000001', name: 'سارة أحمد', orders: 6, total: 2400 },
    { user_id: '00000000-0000-0000-0000-000000000002', name: 'مريم علي', orders: 4, total: 1800 },
  ],
  low_stock: [
    { product_id: 3, name: 'أقراط عقيق', stock: 2 },
    { product_id: 4, name: 'سوار فراشة', stock: 0 },
  ],
}

function renderWithProviders(ui: ReactNode, defaultLang: 'ar' | 'en' = 'ar') {
  if (defaultLang === 'en') {
    window.localStorage.setItem('lolys_lang', 'en')
  } else {
    window.localStorage.setItem('lolys_lang', 'ar')
  }

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })

  return render(
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{ui}</MemoryRouter>
      </QueryClientProvider>
    </LanguageProvider>,
  )
}

describe('Chart accessibility and export (T-6.03)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    window.localStorage.clear()
    window.print = vi.fn()
  })

  describe('CSV Export helper (formatDailySeriesCsv & downloadDailySeriesCsv)', () => {
    it('prepends UTF-8 BOM and exports localized Arabic headers', () => {
      const csv = formatDailySeriesCsv(mockDaily, 'ar')
      expect(csv.startsWith('\uFEFF')).toBe(true)

      const lines = csv.replace('\uFEFF', '').split('\r\n')
      expect(lines[0]).toBe('التاريخ,عدد الطلبات,المبيعات المحجوزة (ج.م),المبيعات المسلّمة (ج.م)')
      expect(lines[1]).toBe('2026-10-10,5,1500.00,1200.00')
      expect(lines[2]).toBe('2026-10-11,8,2400.50,2000.00')
    })

    it('exports localized English headers when lang is en', () => {
      const csv = formatDailySeriesCsv(mockDaily, 'en')
      expect(csv.startsWith('\uFEFF')).toBe(true)

      const lines = csv.replace('\uFEFF', '').split('\r\n')
      expect(lines[0]).toBe('Date,Orders,Booked Revenue (EGP),Delivered Revenue (EGP)')
      expect(lines[1]).toBe('2026-10-10,5,1500.00,1200.00')
    })

    it('handles empty daily array gracefully', () => {
      const csv = formatDailySeriesCsv([], 'ar')
      expect(csv.startsWith('\uFEFF')).toBe(true)
      const lines = csv.replace('\uFEFF', '').split('\r\n')
      expect(lines.length).toBe(1)
      expect(lines[0]).toBe('التاريخ,عدد الطلبات,المبيعات المحجوزة (ج.م),المبيعات المسلّمة (ج.م)')
    })

    it('creates an anchor and triggers download when downloadDailySeriesCsv is called', () => {
      const createObjectURLMock = vi.fn(() => 'blob:https://mock-url')
      const revokeObjectURLMock = vi.fn()
      window.URL.createObjectURL = createObjectURLMock
      window.URL.revokeObjectURL = revokeObjectURLMock

      const clickSpy = vi.fn()
      const origCreateElement = document.createElement.bind(document)
      const createElementSpy = vi
        .spyOn(document, 'createElement')
        .mockImplementation((tag: string) => {
          const elem = origCreateElement(tag)
          if (tag === 'a') {
            elem.click = clickSpy
          }
          return elem
        })

      downloadDailySeriesCsv(mockDaily, { lang: 'ar', filename: 'daily-sales-test.csv' })

      expect(createObjectURLMock).toHaveBeenCalledTimes(1)
      expect(clickSpy).toHaveBeenCalledTimes(1)
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:https://mock-url')

      createElementSpy.mockRestore()
    })
  })

  describe('DashboardChart Accessibility & Table Fallback', () => {
    it('provides accessible text summary and fallback data table', () => {
      const { container } = renderWithProviders(<DashboardChart daily={mockDaily} />)

      // Summary region
      const summaryRegion = screen.getByRole('region', { name: 'ملخص المبيعات للفترة' })
      expect(summaryRegion).toBeInTheDocument()
      expect(summaryRegion).toHaveTextContent('13') // 5 + 8 orders
      expect(summaryRegion).toHaveTextContent('3,900.50') // booked total
      expect(summaryRegion).toHaveTextContent('3,200.00') // delivered total

      // Fallback data table
      const fallbackTable = screen.getByRole('table', { name: 'جدول بيانات المبيعات اليومية' })
      expect(fallbackTable).toBeInTheDocument()
      expect(container.querySelectorAll('th[scope="col"]').length).toBe(4)

      // Export CSV button
      const exportButton = screen.getByRole('button', { name: 'تصدير CSV' })
      expect(exportButton).toBeInTheDocument()
      expect(exportButton).toHaveAttribute('title', 'تنزيل بيانات المبيعات اليومية بصيغة CSV')
    })

    it('clicking Export CSV triggers file download', async () => {
      const user = userEvent.setup()
      const createObjectURLMock = vi.fn(() => 'blob:https://mock-url')
      const revokeObjectURLMock = vi.fn()
      window.URL.createObjectURL = createObjectURLMock
      window.URL.revokeObjectURL = revokeObjectURLMock

      const clickSpy = vi.fn()
      const origCreateElement = document.createElement.bind(document)
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const elem = origCreateElement(tag)
        if (tag === 'a') {
          elem.click = clickSpy
        }
        return elem
      })

      renderWithProviders(<DashboardChart daily={mockDaily} />)

      const exportButton = screen.getByRole('button', { name: 'تصدير CSV' })
      await user.click(exportButton)

      expect(clickSpy).toHaveBeenCalledTimes(1)
    })

    it('passes axe accessibility audit on DashboardChart with zero serious/critical issues', async () => {
      const { container } = renderWithProviders(<DashboardChart daily={mockDaily} />)

      const results = await axe.run(container)
      const seriousOrCritical = results.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
      )
      expect(seriousOrCritical).toEqual([])
    })
  })

  describe('Full Dashboard Accessibility & Print Features', () => {
    const mockDashboardState = {
      data: fixtureData,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      preset: '30d' as const,
      setPreset: vi.fn(),
      activeRange: fixtureData.range,
      customRange: undefined,
      setCustomRange: vi.fn(),
    }

    it('renders print report button and triggers window.print on click', async () => {
      const user = userEvent.setup()
      vi.spyOn(hooks, 'useAdminDashboard').mockReturnValue(
        mockDashboardState as unknown as ReturnType<typeof hooks.useAdminDashboard>,
      )

      renderWithProviders(<DashboardPage />)

      const printButton = screen.getByRole('button', { name: 'طباعة التقرير' })
      expect(printButton).toBeInTheDocument()

      await user.click(printButton)
      expect(window.print).toHaveBeenCalledTimes(1)
    })

    it('passes axe accessibility audit on full Arabic Dashboard with zero serious/critical issues', async () => {
      vi.spyOn(hooks, 'useAdminDashboard').mockReturnValue(
        mockDashboardState as unknown as ReturnType<typeof hooks.useAdminDashboard>,
      )

      const { container } = renderWithProviders(<DashboardPage />, 'ar')

      const results = await axe.run(container)
      const seriousOrCritical = results.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
      )
      expect(seriousOrCritical).toEqual([])
    })

    it('passes axe accessibility audit on full English Dashboard with zero serious/critical issues', async () => {
      vi.spyOn(hooks, 'useAdminDashboard').mockReturnValue(
        mockDashboardState as unknown as ReturnType<typeof hooks.useAdminDashboard>,
      )

      const { container } = renderWithProviders(<DashboardPage />, 'en')

      const results = await axe.run(container)
      const seriousOrCritical = results.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
      )
      expect(seriousOrCritical).toEqual([])
    })

    it('contains print utility classes to ensure clean print view', () => {
      vi.spyOn(hooks, 'useAdminDashboard').mockReturnValue(
        mockDashboardState as unknown as ReturnType<typeof hooks.useAdminDashboard>,
      )

      const { container } = renderWithProviders(<DashboardPage />)

      // Header actions have print:hidden
      const printHiddenElements = container.querySelectorAll('.print\\:hidden')
      expect(printHiddenElements.length).toBeGreaterThan(0)

      // Cards have ui-print-card
      const printCardElements = container.querySelectorAll('.ui-print-card')
      expect(printCardElements.length).toBeGreaterThan(0)
    })
  })
})

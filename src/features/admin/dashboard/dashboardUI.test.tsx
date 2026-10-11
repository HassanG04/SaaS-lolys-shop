import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { LanguageProvider } from '../../../i18n/LanguageProvider'
import { DashboardKpis } from './DashboardKpis'
import { DashboardRangeSelector } from './DashboardRangeSelector'
import { DashboardBreakdowns } from './DashboardBreakdowns'
import { DashboardTopLists } from './DashboardTopLists'
import { DashboardLowStock } from './DashboardLowStock'
import { DashboardPage } from './DashboardPage'
import * as hooks from './hooks'
import type { DashboardData } from './types'

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
  daily: [
    {
      day: '2026-10-10',
      orders: 5,
      booked_total: 1500,
      delivered_total: 1200,
    },
    {
      day: '2026-10-11',
      orders: 8,
      booked_total: 2400,
      delivered_total: 2000,
    },
  ],
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

function renderWithProviders(ui: ReactNode) {
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

describe('Dashboard UI components (T-6.02)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('DashboardKpis', () => {
    it('renders all 7 KPI cards with titles and figures', () => {
      renderWithProviders(<DashboardKpis kpis={fixtureData.kpis} />)

      expect(screen.getByText('إجمالي الطلبات')).toBeInTheDocument()
      expect(screen.getByText('طلبات قيد الانتظار')).toBeInTheDocument()
      expect(screen.getByText('المبيعات المحجوزة')).toBeInTheDocument()
      expect(screen.getByText('المبيعات المسلّمة')).toBeInTheDocument()
      expect(screen.getByText('متوسط قيمة الطلب')).toBeInTheDocument()
      expect(screen.getByText('بانتظار المراجعة')).toBeInTheDocument()
      expect(screen.getByText('إجمالي المدفوع')).toBeInTheDocument()

      expect(screen.getByText('42')).toBeInTheDocument()
      expect(screen.getByText('3 طلب')).toBeInTheDocument()
    })
  })

  describe('DashboardRangeSelector', () => {
    it('renders presets and triggers preset change', async () => {
      const user = userEvent.setup()
      const onPresetChange = vi.fn()
      const onCustomRangeChange = vi.fn()

      renderWithProviders(
        <DashboardRangeSelector
          preset="30d"
          onPresetChange={onPresetChange}
          activeRange={fixtureData.range}
          onCustomRangeChange={onCustomRangeChange}
        />,
      )

      expect(screen.getByRole('button', { name: 'آخر 7 أيام' })).toBeInTheDocument()
      const btn90d = screen.getByRole('button', { name: 'آخر 90 يومًا' })
      expect(btn90d).toBeInTheDocument()

      await user.click(btn90d)
      expect(onPresetChange).toHaveBeenCalledWith('90d')
    })

    it('renders date inputs when preset is custom', () => {
      const onCustomRangeChange = vi.fn()

      renderWithProviders(
        <DashboardRangeSelector
          preset="custom"
          onPresetChange={vi.fn()}
          activeRange={fixtureData.range}
          customRange={{ from: '2026-10-01', to: '2026-10-10' }}
          onCustomRangeChange={onCustomRangeChange}
        />,
      )

      expect(screen.getByText('من تاريخ:')).toBeInTheDocument()
      expect(screen.getByText('إلى تاريخ:')).toBeInTheDocument()
    })
  })

  describe('DashboardBreakdowns', () => {
    it('renders status, delivery method, and governorate breakdowns', () => {
      renderWithProviders(
        <DashboardBreakdowns
          byStatus={fixtureData.by_status}
          byMethod={fixtureData.by_method}
          byGovernorate={fixtureData.by_governorate}
        />,
      )

      expect(screen.getByText('حالات الطلبات')).toBeInTheDocument()
      expect(screen.getByText('طرق التوصيل')).toBeInTheDocument()
      expect(screen.getByText('المحافظات الأكثر طلباً')).toBeInTheDocument()

      expect(screen.getByText('قيد الانتظار')).toBeInTheDocument()
      expect(screen.getByText('تم التأكيد')).toBeInTheDocument()
      expect(screen.getByText('تم الشحن')).toBeInTheDocument()
      expect(screen.getByText('تم التسليم')).toBeInTheDocument()

      expect(screen.getByText('البريد المصري')).toBeInTheDocument()
      expect(screen.getByText('مندوب توصيل')).toBeInTheDocument()

      expect(screen.getByText('القاهرة')).toBeInTheDocument()
      expect(screen.getByText('الإسكندرية')).toBeInTheDocument()
    })

    it('renders empty states when breakdowns have no data', () => {
      renderWithProviders(<DashboardBreakdowns byStatus={{}} byMethod={[]} byGovernorate={[]} />)

      expect(screen.getByText('لا توجد طلبات في هذه الفترة')).toBeInTheDocument()
      expect(screen.getByText('لا توجد بيانات توصيل')).toBeInTheDocument()
      expect(screen.getByText('لا توجد بيانات محافظات')).toBeInTheDocument()
    })
  })

  describe('DashboardTopLists', () => {
    it('renders top products and top customers with sales and orders', () => {
      renderWithProviders(
        <DashboardTopLists
          topProducts={fixtureData.top_products}
          topCustomers={fixtureData.top_customers}
        />,
      )

      expect(screen.getByText('المنتجات الأكثر مبيعاً')).toBeInTheDocument()
      expect(screen.getByText('سلسال لؤلؤ روز')).toBeInTheDocument()
      expect(screen.getByText('خاتم ذهبي مرصع')).toBeInTheDocument()

      expect(screen.getByText('العملاء الأكثر شراءً')).toBeInTheDocument()
      expect(screen.getByText('سارة أحمد')).toBeInTheDocument()
      expect(screen.getByText('مريم علي')).toBeInTheDocument()
    })

    it('renders empty notices when top lists are empty', () => {
      renderWithProviders(<DashboardTopLists topProducts={[]} topCustomers={[]} />)

      expect(screen.getByText('لا توجد مبيعات منتجات في هذه الفترة')).toBeInTheDocument()
      expect(screen.getByText('لا توجد طلبات عملاء في هذه الفترة')).toBeInTheDocument()
    })
  })

  describe('DashboardLowStock', () => {
    it('renders low stock alerts with links to edit product', () => {
      renderWithProviders(<DashboardLowStock lowStock={fixtureData.low_stock} />)

      expect(screen.getByText('تنبيهات المخزون المنخفض')).toBeInTheDocument()
      expect(screen.getByText('أقراط عقيق')).toBeInTheDocument()
      expect(screen.getByText('سوار فراشة')).toBeInTheDocument()

      const editLinks = screen.getAllByRole('link', { name: 'تعديل المنتج' })
      expect(editLinks).toHaveLength(2)
      expect(editLinks[0]).toHaveAttribute('href', '/admin/products?edit=3')
      expect(editLinks[1]).toHaveAttribute('href', '/admin/products?edit=4')
    })

    it('renders sufficient stock message when list is empty', () => {
      renderWithProviders(<DashboardLowStock lowStock={[]} />)

      expect(screen.getByText('جميع المنتجات متوفرة بمخزون كافٍ')).toBeInTheDocument()
    })
  })

  describe('DashboardPage integration', () => {
    it('renders skeleton loading state while loading', () => {
      vi.spyOn(hooks, 'useAdminDashboard').mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
        preset: '30d',
        setPreset: vi.fn(),
        activeRange: fixtureData.range,
        customRange: undefined,
        setCustomRange: vi.fn(),
      } as unknown as ReturnType<typeof hooks.useAdminDashboard>)

      renderWithProviders(<DashboardPage />)

      expect(screen.getByRole('heading', { name: 'لوحة تحكم الإدارة' })).toBeInTheDocument()
      expect(
        screen.getByRole('status', { name: 'جاري تحميل بيانات لوحة التحكم...' }),
      ).toBeInTheDocument()
    })

    it('renders error panel with retry button when query fails', async () => {
      const refetchMock = vi.fn()
      vi.spyOn(hooks, 'useAdminDashboard').mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Network connection lost'),
        refetch: refetchMock,
        preset: '30d',
        setPreset: vi.fn(),
        activeRange: fixtureData.range,
        customRange: undefined,
        setCustomRange: vi.fn(),
      } as unknown as ReturnType<typeof hooks.useAdminDashboard>)

      const user = userEvent.setup()
      renderWithProviders(<DashboardPage />)

      expect(screen.getByText('تعذر تحميل بيانات لوحة التحكم')).toBeInTheDocument()
      expect(screen.getByText('Network connection lost')).toBeInTheDocument()

      const retryBtn = screen.getByRole('button', { name: 'إعادة المحاولة' })
      await user.click(retryBtn)
      expect(refetchMock).toHaveBeenCalled()
    })

    it('renders full dashboard content when data is loaded', () => {
      vi.spyOn(hooks, 'useAdminDashboard').mockReturnValue({
        data: fixtureData,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        preset: '30d',
        setPreset: vi.fn(),
        activeRange: fixtureData.range,
        customRange: undefined,
        setCustomRange: vi.fn(),
      } as unknown as ReturnType<typeof hooks.useAdminDashboard>)

      renderWithProviders(<DashboardPage />)

      expect(screen.getByRole('heading', { name: 'لوحة تحكم الإدارة' })).toBeInTheDocument()
      expect(screen.getByText('إجمالي الطلبات')).toBeInTheDocument()
      expect(screen.getByText('حالات الطلبات')).toBeInTheDocument()
      expect(screen.getByText('المنتجات الأكثر مبيعاً')).toBeInTheDocument()
      expect(screen.getByText('تنبيهات المخزون المنخفض')).toBeInTheDocument()
    })
  })
})

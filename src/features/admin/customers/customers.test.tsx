import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/i18n/LanguageProvider'
import { getSupabase } from '@/lib/supabase'
import * as api from './api'
import CustomersPage from './CustomersPage'
import type { CustomerStat } from './types'

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
}

function createWrapper() {
  const queryClient = createTestQueryClient()
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </LanguageProvider>
    )
  }
}

const mockCustomerStats: CustomerStat[] = [
  {
    user_id: 'cust-1',
    full_name: 'سارة أحمد',
    phone: '01012345678',
    role: 'customer',
    orders_count: 5,
    total_spent: 1250.5,
    favorite_product_id: 10,
    favorite_product_name: 'طوق لؤلؤ روز',
  },
  {
    user_id: 'cust-2',
    full_name: 'مريم محمود',
    phone: '01198765432',
    role: 'customer',
    orders_count: 2,
    total_spent: 450,
    favorite_product_id: 12,
    favorite_product_name: 'خاتم فراشة فضي',
  },
  {
    user_id: 'admin-1',
    full_name: 'المدير العام',
    phone: '01234567890',
    role: 'admin',
    orders_count: 12,
    total_spent: 3800,
    favorite_product_id: 15,
    favorite_product_name: 'سوار ذهبي كلاسيك',
  },
]

describe('Customers admin (T-5.06)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('API: getCustomerStats', () => {
    type FromReturn = ReturnType<ReturnType<typeof getSupabase>['from']>

    it('queries customer_stats view ordered by total_spent descending', async () => {
      const fromSpy = vi.spyOn(getSupabase(), 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockCustomerStats,
            error: null,
          }),
        }),
      } as unknown as FromReturn)

      const result = await api.getCustomerStats()

      expect(fromSpy).toHaveBeenCalledWith('customer_stats')
      expect(result).toHaveLength(3)
      expect(result[0].full_name).toBe('سارة أحمد')
      expect(result[0].role).toBe('customer')
      expect(result[2].role).toBe('admin')
    })

    it('throws descriptive error when Supabase query fails', async () => {
      vi.spyOn(getSupabase(), 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Permission denied on customer_stats' },
          }),
        }),
      } as unknown as FromReturn)

      await expect(api.getCustomerStats()).rejects.toThrow(
        'Failed to load customer statistics: Permission denied on customer_stats',
      )
    })
  })

  describe('UI: CustomersPage', () => {
    it('renders customer statistics table with formatted data and read-only roles', async () => {
      vi.spyOn(api, 'getCustomerStats').mockResolvedValue(mockCustomerStats)

      render(<CustomersPage />, { wrapper: createWrapper() })

      // Wait for customer data to load
      expect(await screen.findByText('سارة أحمد')).toBeInTheDocument()

      // Heading and badge
      expect(screen.getByRole('heading', { name: 'العملاء' })).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()

      // Read-only role policy notice
      expect(screen.getByText(/تعديل الصلاحيات متاح فقط لمالك قاعدة البيانات/)).toBeInTheDocument()

      // Table headers
      expect(screen.getByRole('columnheader', { name: 'العميل' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'الهاتف' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'الصلاحية' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'عدد الطلبات' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'إجمالي المشتريات' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'المنتج المفضل' })).toBeInTheDocument()

      // Customer rows
      expect(screen.getByText('سارة أحمد')).toBeInTheDocument()
      expect(screen.getByText('مريم محمود')).toBeInTheDocument()
      expect(screen.getByText('المدير العام')).toBeInTheDocument()

      // Read-only role badges: customer vs admin
      const roleBadges = screen.getAllByText(/^(عميل|مدير)$/)
      expect(roleBadges).toHaveLength(3)

      const adminBadge = screen.getByText(/^مدير$/)
      const customerBadge = screen.getAllByText(/^عميل$/)[0]
      expect(adminBadge.closest('[aria-readonly="true"]')).toBeInTheDocument()
      expect(customerBadge.closest('[aria-readonly="true"]')).toBeInTheDocument()

      // Confirm no promotion/demotion interactive controls exist
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: /ترقية|تعديل صلاحية|حذف/ }),
      ).not.toBeInTheDocument()
    })

    it('filters customers by search query across name, phone, and favorite product', async () => {
      const user = userEvent.setup()
      vi.spyOn(api, 'getCustomerStats').mockResolvedValue(mockCustomerStats)

      render(<CustomersPage />, { wrapper: createWrapper() })

      expect(await screen.findByText('سارة أحمد')).toBeInTheDocument()
      const searchInput = screen.getByPlaceholderText(/ابحث بالاسم أو الهاتف أو المنتج المفضل/)

      // 1. Filter by name
      await user.type(searchInput, 'مريم')
      expect(screen.getByText('مريم محمود')).toBeInTheDocument()
      expect(screen.queryByText('سارة أحمد')).not.toBeInTheDocument()

      // 2. Filter by phone
      await user.clear(searchInput)
      await user.type(searchInput, '01234567890')
      expect(screen.getByText('المدير العام')).toBeInTheDocument()
      expect(screen.queryByText('مريم محمود')).not.toBeInTheDocument()

      // 3. Filter by favorite product
      await user.clear(searchInput)
      await user.type(searchInput, 'لؤلؤ روز')
      expect(screen.getByText('سارة أحمد')).toBeInTheDocument()
      expect(screen.queryByText('المدير العام')).not.toBeInTheDocument()
    })

    it('displays EmptyState when search matches zero customers', async () => {
      const user = userEvent.setup()
      vi.spyOn(api, 'getCustomerStats').mockResolvedValue(mockCustomerStats)

      render(<CustomersPage />, { wrapper: createWrapper() })

      expect(await screen.findByText('سارة أحمد')).toBeInTheDocument()
      const searchInput = screen.getByPlaceholderText(/ابحث بالاسم أو الهاتف أو المنتج المفضل/)

      await user.type(searchInput, 'شخص_غير_موجود')
      expect(screen.getByText('لا توجد نتائج تطابق بحثك.')).toBeInTheDocument()
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
    })

    it('renders ErrorPanel when customer stats query fails', async () => {
      vi.spyOn(api, 'getCustomerStats').mockRejectedValue(new Error('Network error'))

      render(<CustomersPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
      expect(screen.getByRole('button', { name: 'إعادة المحاولة' })).toBeInTheDocument()
    })
  })
})

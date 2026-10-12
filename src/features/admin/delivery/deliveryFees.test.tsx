import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { LanguageProvider } from '@/i18n/LanguageProvider'
import { ToastProvider } from '@/components/ui/ToastProvider'
import { getSupabase } from '@/lib/supabase'
import { getDeliveryFees } from '@/features/delivery/api'
import * as deliveryApi from '@/features/delivery/api'
import * as adminDeliveryApi from './api'
import DeliveryFeesPage from './DeliveryFeesPage'
import type { DeliveryFeeRow } from './types'
import type { Governorate } from '@/features/delivery/types'

const mockGovernorates: Governorate[] = [
  { id: 1, name_ar: 'القاهرة', name_en: 'Cairo' },
  { id: 2, name_ar: 'الجيزة', name_en: 'Giza' },
  { id: 3, name_ar: 'الإسكندرية', name_en: 'Alexandria' },
]

const mockFees: DeliveryFeeRow[] = [
  { governorate_id: 1, method: 'egypt_post', fee: 50 },
  { governorate_id: 1, method: 'representative', fee: 40 },
  { governorate_id: 2, method: 'egypt_post', fee: 55 },
  // Governorate 3 has no fees configured (all "غير متاح")
]

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <ToastProvider>{children}</ToastProvider>
        </LanguageProvider>
      </QueryClientProvider>
    )
  }
}

describe('Admin Delivery Fees (T-5.07)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()

    // Polyfill HTMLDialogElement for jsdom
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true
    })
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.open = false
    })
  })

  describe('API functions', () => {
    it('getAllDeliveryFees fetches all rows ordered by governorate_id', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [
            { governorate_id: 1, method: 'egypt_post', fee: '60.00' },
            { governorate_id: 1, method: 'representative', fee: 50 },
          ],
          error: null,
        }),
      })

      vi.spyOn(getSupabase(), 'from').mockReturnValue({
        select: mockSelect,
      } as unknown as ReturnType<ReturnType<typeof getSupabase>['from']>)

      const fees = await adminDeliveryApi.getAllDeliveryFees()

      expect(fees).toEqual([
        { governorate_id: 1, method: 'egypt_post', fee: 60 },
        { governorate_id: 1, method: 'representative', fee: 50 },
      ])
    })

    it('getAllDeliveryFees throws informative error when database query fails', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection error' },
        }),
      })

      vi.spyOn(getSupabase(), 'from').mockReturnValue({
        select: mockSelect,
      } as unknown as ReturnType<ReturnType<typeof getSupabase>['from']>)

      await expect(adminDeliveryApi.getAllDeliveryFees()).rejects.toThrow(
        /Failed to load delivery fees: Database connection error/,
      )
    })

    it('upsertDeliveryFee validates fee >= 0 and rejects negative numbers', async () => {
      await expect(adminDeliveryApi.upsertDeliveryFee(1, 'egypt_post', -10)).rejects.toThrow(
        'Validation failed: Delivery fee must be 0 or greater.',
      )

      await expect(adminDeliveryApi.upsertDeliveryFee(1, 'egypt_post', Number.NaN)).rejects.toThrow(
        'Validation failed: Delivery fee must be 0 or greater.',
      )
    })

    it('upsertDeliveryFee calls supabase upsert with onConflict for valid fee', async () => {
      const mockUpsert = vi.fn().mockResolvedValue({ error: null })

      vi.spyOn(getSupabase(), 'from').mockReturnValue({
        upsert: mockUpsert,
      } as unknown as ReturnType<ReturnType<typeof getSupabase>['from']>)

      await adminDeliveryApi.upsertDeliveryFee(1, 'egypt_post', 65)

      expect(mockUpsert).toHaveBeenCalledWith(
        {
          governorate_id: 1,
          method: 'egypt_post',
          fee: 65,
        },
        { onConflict: 'governorate_id,method' },
      )
    })

    it('deleteDeliveryFee removes the fee row for governorate and method', async () => {
      const mockEqMethod = vi.fn().mockResolvedValue({ error: null })
      const mockEqGov = vi.fn().mockReturnValue({ eq: mockEqMethod })
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEqGov })

      vi.spyOn(getSupabase(), 'from').mockReturnValue({
        delete: mockDelete,
      } as unknown as ReturnType<ReturnType<typeof getSupabase>['from']>)

      await adminDeliveryApi.deleteDeliveryFee(2, 'representative')

      expect(mockDelete).toHaveBeenCalled()
      expect(mockEqGov).toHaveBeenCalledWith('governorate_id', 2)
      expect(mockEqMethod).toHaveBeenCalledWith('method', 'representative')
    })
  })

  describe('DeliveryFeesPage UI', () => {
    beforeEach(() => {
      vi.spyOn(deliveryApi, 'getGovernorates').mockResolvedValue(mockGovernorates)
      vi.spyOn(adminDeliveryApi, 'getAllDeliveryFees').mockResolvedValue(mockFees)
    })

    it('renders the delivery fees administration grid with all governorates', async () => {
      render(<DeliveryFeesPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByRole('columnheader', { name: 'المحافظة' })).toBeInTheDocument()
      })

      // Table headers
      expect(screen.getByRole('columnheader', { name: 'البريد المصري' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'مندوب توصيل' })).toBeInTheDocument()

      // Governorate rows
      expect(screen.getByText('القاهرة')).toBeInTheDocument()
      expect(screen.getByText('الجيزة')).toBeInTheDocument()
      expect(screen.getByText('الإسكندرية')).toBeInTheDocument()

      // Configured fees rendered
      expect(screen.getByText(/50/)).toBeInTheDocument()
      expect(screen.getByText(/40/)).toBeInTheDocument()
      expect(screen.getByText(/55/)).toBeInTheDocument()

      // Empty cells read "غير متاح"
      const unavailableBadges = screen.getAllByText('غير متاح')
      expect(unavailableBadges.length).toBeGreaterThanOrEqual(3)
    })

    it('filters governorates by search query', async () => {
      const user = userEvent.setup()
      render(<DeliveryFeesPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByRole('columnheader', { name: 'المحافظة' })).toBeInTheDocument()
      })

      const searchInput = screen.getByRole('searchbox')
      await user.type(searchInput, 'الإسكندرية')

      expect(screen.getByText('الإسكندرية')).toBeInTheDocument()
      expect(screen.queryByText('القاهرة')).not.toBeInTheDocument()
      expect(screen.queryByText('الجيزة')).not.toBeInTheDocument()
    })

    it('opens add fee dialog for unconfigured cell and saves valid fee', async () => {
      const user = userEvent.setup()
      const upsertSpy = vi.spyOn(adminDeliveryApi, 'upsertDeliveryFee').mockResolvedValue(undefined)

      render(<DeliveryFeesPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByRole('columnheader', { name: 'المحافظة' })).toBeInTheDocument()
      })

      // Click "+ إضافة رسوم" for Alexandria Egypt Post
      const addButtons = screen.getAllByRole('button', { name: /إضافة رسوم/ })
      await user.click(addButtons[0])

      // Dialog opens
      expect(screen.getByRole('heading', { name: 'إضافة رسوم' })).toBeInTheDocument()

      const feeInput = screen.getByLabelText(/قيمة الشحن/)
      await user.clear(feeInput)
      await user.type(feeInput, '75')

      const saveBtn = screen.getByRole('button', { name: 'حفظ الرسوم' })
      await user.click(saveBtn)

      await waitFor(() => {
        expect(upsertSpy).toHaveBeenCalledWith(expect.any(Number), expect.any(String), 75)
      })
    })

    it('validates negative fee in dialog with Arabic error message', async () => {
      const user = userEvent.setup()
      render(<DeliveryFeesPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByRole('columnheader', { name: 'المحافظة' })).toBeInTheDocument()
      })

      const addButtons = screen.getAllByRole('button', { name: /إضافة رسوم/ })
      await user.click(addButtons[0])

      const feeInput = screen.getByLabelText(/قيمة الشحن/)
      await user.clear(feeInput)
      await user.type(feeInput, '-15')

      const saveBtn = screen.getByRole('button', { name: 'حفظ الرسوم' })
      await user.click(saveBtn)

      expect(screen.getByText('يجب أن تكون قيمة الشحن 0 أو أكثر')).toBeInTheDocument()
    })

    it('opens remove dialog and calls deleteDeliveryFee on confirmation', async () => {
      const user = userEvent.setup()
      const deleteSpy = vi.spyOn(adminDeliveryApi, 'deleteDeliveryFee').mockResolvedValue(undefined)

      render(<DeliveryFeesPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByRole('columnheader', { name: 'المحافظة' })).toBeInTheDocument()
      })

      // Cairo Egypt Post has remove button
      const removeButtons = screen.getAllByRole('button', { name: /حذف/ })
      await user.click(removeButtons[0])

      // Dialog opens with title and warning description
      expect(screen.getByRole('heading', { name: 'تأكيد إلغاء طريقة الشحن' })).toBeInTheDocument()
      expect(
        screen.getByText(/سيؤدي ذلك إلى جعل طريقة التوصيل هذه غير متاحة للعملاء/),
      ).toBeInTheDocument()

      const confirmBtn = screen.getByRole('button', { name: 'تأكيد الحذف' })
      await user.click(confirmBtn)

      await waitFor(() => {
        expect(deleteSpy).toHaveBeenCalledWith(expect.any(Number), expect.any(String))
      })
    })

    it('renders ErrorPanel when loading delivery data fails', async () => {
      vi.spyOn(adminDeliveryApi, 'getAllDeliveryFees').mockRejectedValue(
        new Error('Network error loading fees'),
      )

      render(<DeliveryFeesPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText(/تعذّر الاتصال بالإنترنت/)).toBeInTheDocument()
      })
      expect(screen.getByText(/رمز الخطأ:\s*SYS-002/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'إعادة المحاولة' })).toBeInTheDocument()
    })
  })

  describe('Checkout availability integration ("Done when: removing a fee makes that method unavailable at checkout")', () => {
    it('proves removing a fee removes that method from getDeliveryFees for checkout', async () => {
      // Simulate database state: initially Cairo (id: 1) has both methods configured
      let currentFees = [
        { governorate_id: 1, method: 'egypt_post' as const, fee: '50.00' },
        { governorate_id: 1, method: 'representative' as const, fee: '40.00' },
      ]

      // Mock getDeliveryFees Supabase implementation
      vi.spyOn(getSupabase(), 'from').mockImplementation(((table: string) => {
        if (table === 'delivery_fees') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((_col: string, val: number) => {
                const filtered = currentFees.filter((r) => r.governorate_id === val)
                return Promise.resolve({ data: filtered, error: null })
              }),
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockImplementation((_col: string, val: string) => {
                  // Admin deletes representative delivery fee
                  currentFees = currentFees.filter((r) => r.method !== val)
                  return Promise.resolve({ error: null })
                }),
              }),
            }),
          }
        }
        return {}
      }) as never)

      // 1. Initial checkout query: both egypt_post and representative are available
      const initialOptions = await getDeliveryFees(1)
      expect(initialOptions).toHaveLength(2)
      expect(initialOptions.map((o) => o.method)).toEqual(['egypt_post', 'representative'])

      // 2. Admin removes representative delivery fee
      await adminDeliveryApi.deleteDeliveryFee(1, 'representative')

      // 3. Subsequent checkout query: representative is now unavailable at checkout!
      const postDeleteOptions = await getDeliveryFees(1)
      expect(postDeleteOptions).toHaveLength(1)
      expect(postDeleteOptions[0].method).toBe('egypt_post')
      expect(postDeleteOptions.some((o) => o.method === 'representative')).toBe(false)

      // 4. Admin removes egypt_post delivery fee
      await adminDeliveryApi.deleteDeliveryFee(1, 'egypt_post')

      // 5. Governorate now has zero delivery options configured (checkout considers all unavailable)
      const emptyOptions = await getDeliveryFees(1)
      expect(emptyOptions).toEqual([])
    })
  })
})

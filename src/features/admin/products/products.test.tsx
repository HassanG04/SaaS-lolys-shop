import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { LanguageProvider } from '@/i18n/LanguageProvider'
import { ToastProvider } from '@/components/ui/ToastProvider'
import { AppError } from '@/lib/errors'
import * as api from './api'
import ProductsPage from './ProductsPage'
import type { AdminProduct, AdminCategorySummary } from './types'

const mockCategories: AdminCategorySummary[] = [
  { id: 1, name: 'Earrings', name_ar: 'أقراط', slug: 'earrings' },
  { id: 2, name: 'Bracelets', name_ar: 'أساور', slug: 'bracelets' },
  { id: 3, name: 'Rings', name_ar: 'خواتم', slug: 'rings' },
]

const mockProducts: AdminProduct[] = [
  {
    id: 1,
    category_id: 1,
    name: 'Pearl earrings',
    name_ar: 'أقراط اللؤلؤ الطبيعي',
    description: 'Beautiful earrings',
    description_ar: 'أقراط أنيقة',
    price: 150,
    discount_percent: 0,
    final_price: 150,
    stock_quantity: 12,
    in_stock: true,
    sold_count: 5,
    is_active: true,
    is_featured: true,
    image_url: 'products/earrings.webp',
    extra_images: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    category: mockCategories[0],
  },
  {
    id: 2,
    category_id: 2,
    name: 'Gold bracelet',
    name_ar: 'سوار ذهبي كلاسيكي',
    description: 'Gold bracelet',
    description_ar: 'سوار ذهبي رائع',
    price: 200,
    discount_percent: 20,
    final_price: 160,
    stock_quantity: 3,
    in_stock: true,
    sold_count: 10,
    is_active: true,
    is_featured: false,
    image_url: 'products/bracelet.webp',
    extra_images: [],
    created_at: '2026-01-02T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
    category: mockCategories[1],
  },
  {
    id: 3,
    category_id: 3,
    name: 'Silver ring',
    name_ar: 'خاتم فضة ناعم',
    description: 'Silver ring',
    description_ar: 'خاتم فضة أصلي',
    price: 90,
    discount_percent: 0,
    final_price: 90,
    stock_quantity: 0,
    in_stock: false,
    sold_count: 2,
    is_active: false,
    is_featured: false,
    image_url: null,
    extra_images: [],
    created_at: '2026-01-03T00:00:00Z',
    updated_at: '2026-01-03T00:00:00Z',
    category: mockCategories[2],
  },
]

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
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

let currentProducts: AdminProduct[] = []

describe('Admin Products Management (T-5.02)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()

    // Polyfill HTMLDialogElement for jsdom
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true
    })
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.open = false
    })

    currentProducts = JSON.parse(JSON.stringify(mockProducts))
    vi.spyOn(api, 'getAdminProducts').mockImplementation(async () => {
      return JSON.parse(JSON.stringify(currentProducts))
    })
    vi.spyOn(api, 'getAdminCategories').mockResolvedValue(
      JSON.parse(JSON.stringify(mockCategories)),
    )
  })

  describe('API and validation', () => {
    it('updateProductStock throws when new quantity is negative (< 0)', async () => {
      await expect(
        api.updateProductStock({ productId: 1, newQuantity: -1, reason: 'admin_adjust' }),
      ).rejects.toThrow(AppError)
    })

    it('updateProductStock throws when new quantity is not an integer', async () => {
      await expect(
        api.updateProductStock({ productId: 1, newQuantity: 1.5, reason: 'admin_adjust' }),
      ).rejects.toThrow(AppError)
    })
  })

  describe('Table rendering and display', () => {
    it('renders products table with columns and product information', async () => {
      render(<ProductsPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('أقراط اللؤلؤ الطبيعي')).toBeInTheDocument()
      })

      expect(screen.getByText('سوار ذهبي كلاسيكي')).toBeInTheDocument()
      expect(screen.getByText('خاتم فضة ناعم')).toBeInTheDocument()

      // Headers
      expect(screen.getByRole('columnheader', { name: 'المنتج' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'القسم' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'السعر' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'المخزون' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'مفعّل' })).toBeInTheDocument()

      // Stock badges
      expect(screen.getByText('متوفر')).toBeInTheDocument()
      expect(screen.getByText('منخفض')).toBeInTheDocument()
      expect(screen.getByText('نفد')).toBeInTheDocument()
    })
  })

  describe('Filtering and search', () => {
    it('filters products by search input (Arabic name, English name, and #ID)', async () => {
      const user = userEvent.setup()
      render(<ProductsPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('أقراط اللؤلؤ الطبيعي')).toBeInTheDocument()
      })

      const searchInput = screen.getByRole('searchbox')

      // 1. Search by Arabic query
      await user.type(searchInput, 'سوار')
      expect(screen.getByText('سوار ذهبي كلاسيكي')).toBeInTheDocument()
      expect(screen.queryByText('أقراط اللؤلؤ الطبيعي')).not.toBeInTheDocument()

      // 2. Clear and search by English query
      await user.clear(searchInput)
      await user.type(searchInput, 'silver')
      expect(screen.getByText('خاتم فضة ناعم')).toBeInTheDocument()
      expect(screen.queryByText('أقراط اللؤلؤ الطبيعي')).not.toBeInTheDocument()

      // 3. Search by ID
      await user.clear(searchInput)
      await user.type(searchInput, '#1')
      expect(screen.getByText('أقراط اللؤلؤ الطبيعي')).toBeInTheDocument()
      expect(screen.queryByText('سوار ذهبي كلاسيكي')).not.toBeInTheDocument()
    })

    it('filters products by category dropdown', async () => {
      const user = userEvent.setup()
      render(<ProductsPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('أقراط اللؤلؤ الطبيعي')).toBeInTheDocument()
      })

      const categorySelect = screen.getByLabelText('القسم')
      await user.selectOptions(categorySelect, '2') // Bracelets

      expect(screen.getByText('سوار ذهبي كلاسيكي')).toBeInTheDocument()
      expect(screen.queryByText('أقراط اللؤلؤ الطبيعي')).not.toBeInTheDocument()
      expect(screen.queryByText('خاتم فضة ناعم')).not.toBeInTheDocument()
    })

    it('filters products by active / archived status', async () => {
      const user = userEvent.setup()
      render(<ProductsPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('أقراط اللؤلؤ الطبيعي')).toBeInTheDocument()
      })

      const statusSelect = screen.getByLabelText('حالة التفعيل')

      // Filter active
      await user.selectOptions(statusSelect, 'active')
      expect(screen.getByText('أقراط اللؤلؤ الطبيعي')).toBeInTheDocument()
      expect(screen.getByText('سوار ذهبي كلاسيكي')).toBeInTheDocument()
      expect(screen.queryByText('خاتم فضة ناعم')).not.toBeInTheDocument()

      // Filter archived
      await user.selectOptions(statusSelect, 'archived')
      expect(screen.queryByText('أقراط اللؤلؤ الطبيعي')).not.toBeInTheDocument()
      expect(screen.queryByText('سوار ذهبي كلاسيكي')).not.toBeInTheDocument()
      expect(screen.getByText('خاتم فضة ناعم')).toBeInTheDocument()
    })

    it('filters products by stock status (in stock, low stock, out of stock)', async () => {
      const user = userEvent.setup()
      render(<ProductsPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('أقراط اللؤلؤ الطبيعي')).toBeInTheDocument()
      })

      const stockSelect = screen.getByLabelText('حالة المخزون')

      // Low stock (stock <= 5 and > 0)
      await user.selectOptions(stockSelect, 'low_stock')
      expect(screen.getByText('سوار ذهبي كلاسيكي')).toBeInTheDocument()
      expect(screen.queryByText('أقراط اللؤلؤ الطبيعي')).not.toBeInTheDocument()
      expect(screen.queryByText('خاتم فضة ناعم')).not.toBeInTheDocument()

      // Out of stock (stock == 0)
      await user.selectOptions(stockSelect, 'out_of_stock')
      expect(screen.getByText('خاتم فضة ناعم')).toBeInTheDocument()
      expect(screen.queryByText('أقراط اللؤلؤ الطبيعي')).not.toBeInTheDocument()
      expect(screen.queryByText('سوار ذهبي كلاسيكي')).not.toBeInTheDocument()
    })

    it('resets filters when clicking reset filters button', async () => {
      const user = userEvent.setup()
      render(<ProductsPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('أقراط اللؤلؤ الطبيعي')).toBeInTheDocument()
      })

      const searchInput = screen.getByRole('searchbox')
      await user.type(searchInput, 'non-existent query')

      expect(screen.getByText('لا توجد منتجات تطابق معايير البحث والتصفية.')).toBeInTheDocument()

      const resetBtn = screen.getAllByRole('button', { name: 'إعادة تعيين التصفية' })[0]
      await user.click(resetBtn)

      expect(screen.getByText('أقراط اللؤلؤ الطبيعي')).toBeInTheDocument()
      expect(screen.getByText('سوار ذهبي كلاسيكي')).toBeInTheDocument()
      expect(screen.getByText('خاتم فضة ناعم')).toBeInTheDocument()
    })
  })

  describe('Inline stock editing', () => {
    it('opens dialog with current stock and rejects negative input', async () => {
      const user = userEvent.setup()
      render(<ProductsPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('أقراط اللؤلؤ الطبيعي')).toBeInTheDocument()
      })

      // Click edit stock button on product 1 (stock 12)
      const editBtn = screen.getByRole('button', { name: 'تعديل مخزون أقراط اللؤلؤ الطبيعي' })
      await user.click(editBtn)

      // Dialog opens
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('تعديل مخزون المنتج')).toBeInTheDocument()

      const input = screen.getByLabelText(/الكمية الجديدة/)
      expect(input).toHaveValue(12)

      // Enter negative quantity
      await user.clear(input)
      await user.type(input, '-3')

      expect(screen.getByText('لا يمكن أن يكون المخزون أقل من 0')).toBeInTheDocument()
      const saveBtn = screen.getByRole('button', { name: 'حفظ' })
      expect(saveBtn).toBeDisabled()
    })

    it('optimistically updates stock and handles error with rollback', async () => {
      const user = userEvent.setup()
      let rejectUpdate = false

      vi.spyOn(api, 'updateProductStock').mockImplementation(async ({ productId, newQuantity }) => {
        if (rejectUpdate) {
          throw new AppError('ORD-006')
        }
        const found = currentProducts.find((p) => p.id === productId)
        if (found) {
          found.stock_quantity = newQuantity
          found.in_stock = newQuantity > 0
        }
        return {
          ...mockProducts.find((p) => p.id === productId)!,
          stock_quantity: newQuantity,
          in_stock: newQuantity > 0,
        }
      })

      render(<ProductsPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('أقراط اللؤلؤ الطبيعي')).toBeInTheDocument()
      })

      // Test 1: Successful stock update
      const editBtn = screen.getByRole('button', { name: 'تعديل مخزون أقراط اللؤلؤ الطبيعي' })
      await user.click(editBtn)

      const input = screen.getByLabelText(/الكمية الجديدة/)
      await user.clear(input)
      await user.type(input, '25')

      const saveBtn = screen.getByRole('button', { name: 'حفظ' })
      await user.click(saveBtn)

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })

      // Stock in table updated to 25
      await waitFor(() => {
        expect(screen.getByText('25')).toBeInTheDocument()
      })

      // Test 2: Failed update triggers rollback and mapped error message
      rejectUpdate = true
      await user.click(screen.getByRole('button', { name: 'تعديل مخزون أقراط اللؤلؤ الطبيعي' }))

      const input2 = screen.getByLabelText(/الكمية الجديدة/)
      await user.clear(input2)
      await user.type(input2, '40')

      await user.click(screen.getByRole('button', { name: 'حفظ' }))

      // Error message rendered inside dialog
      await waitFor(() => {
        expect(screen.getByText(/الكمية غير صحيحة/)).toBeInTheDocument()
      })
    })
  })

  describe('Active toggle', () => {
    it('optimistically toggles active status and rolls back on failure', async () => {
      const user = userEvent.setup()
      let shouldFail = false

      vi.spyOn(api, 'updateProductActive').mockImplementation(async ({ productId, isActive }) => {
        if (shouldFail) {
          throw new AppError('SYS-001')
        }
        const found = currentProducts.find((p) => p.id === productId)
        if (found) {
          found.is_active = isActive
        }
        return {
          ...mockProducts.find((p) => p.id === productId)!,
          is_active: isActive,
        }
      })

      render(<ProductsPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('أقراط اللؤلؤ الطبيعي')).toBeInTheDocument()
      })

      // Product 1 is active
      const toggleBtn = screen.getByRole('switch', {
        name: 'أقراط اللؤلؤ الطبيعي - نشط',
      })
      expect(toggleBtn).toHaveAttribute('aria-checked', 'true')

      // Click to toggle off
      await user.click(toggleBtn)

      await waitFor(() => {
        expect(toggleBtn).toHaveAttribute('aria-checked', 'false')
      })

      // Next: Failure triggers rollback
      shouldFail = true
      await user.click(toggleBtn)

      // Rolls back to false
      await waitFor(() => {
        expect(toggleBtn).toHaveAttribute('aria-checked', 'false')
      })
    })
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { LanguageProvider } from '@/i18n/LanguageProvider'
import { ToastProvider } from '@/components/ui/ToastProvider'
import { QuickProductEditModal } from './QuickProductEditModal'
import { QuickProductAddModal } from './QuickProductAddModal'
import * as api from './api'
import type { AdminProduct, AdminCategorySummary } from './types'

// Mock Supabase
vi.mock('@/lib/supabase', () => {
  const client = {
    from: vi.fn(),
    rpc: vi.fn(),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: { path: 'products/1/test.webp' }, error: null }),
        getPublicUrl: vi.fn((path: string) => ({
          data: {
            publicUrl: `https://test.supabase.co/storage/v1/object/public/product-images/${path}`,
          },
        })),
      })),
    },
  }
  return {
    supabase: client,
    getSupabase: () => client,
  }
})

const sampleProduct: AdminProduct = {
  id: 42,
  category_id: 1,
  name: 'Velvet Headband',
  name_ar: 'طوق مخملي راقي',
  description: 'Soft velvet headband with golden pearls',
  description_ar: 'طوق شعر من المخمل الناعم مرصع بحبات اللؤلؤ الذهبي',
  price: 250,
  discount_percent: 10,
  final_price: 225,
  stock_quantity: 8,
  in_stock: true,
  sold_count: 14,
  is_active: true,
  is_featured: true,
  image_url: 'products/42/main.webp',
  extra_images: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
}

const sampleCategories: AdminCategorySummary[] = [
  { id: 1, name: 'Headbands', name_ar: 'أطواق شعر', slug: 'headbands' },
  { id: 2, name: 'Rings', name_ar: 'خواتم', slug: 'rings' },
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
          <ToastProvider>
            <MemoryRouter>{children}</MemoryRouter>
          </ToastProvider>
        </LanguageProvider>
      </QueryClientProvider>
    )
  }
}

describe('Easy UI: Quick Product Edit & Add Modals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('QuickProductEditModal', () => {
    it('renders current product details including ID, name, price, and stock', () => {
      const handleClose = vi.fn()
      render(
        <QuickProductEditModal
          product={sampleProduct}
          categories={sampleCategories}
          onClose={handleClose}
        />,
        { wrapper: createWrapper() },
      )

      expect(screen.getByText(/#42/)).toBeInTheDocument()
      expect(screen.getByDisplayValue('42')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Velvet Headband')).toBeInTheDocument()
      expect(screen.getByDisplayValue('طوق مخملي راقي')).toBeInTheDocument()
      expect(screen.getByDisplayValue('250')).toBeInTheDocument()
      expect(screen.getByDisplayValue('8')).toBeInTheDocument()
      expect(screen.getByText('متوفر')).toBeInTheDocument()
    })

    it('allows adjusting stock quantity with quick delta buttons', async () => {
      const user = userEvent.setup()
      const handleClose = vi.fn()

      render(
        <QuickProductEditModal
          product={sampleProduct}
          categories={sampleCategories}
          onClose={handleClose}
        />,
        { wrapper: createWrapper() },
      )

      const plusFiveButton = screen.getByRole('button', { name: '+5' })
      await user.click(plusFiveButton)

      // Stock should now be 8 + 5 = 13
      expect(screen.getByDisplayValue('13')).toBeInTheDocument()

      const minusOneButton = screen.getByRole('button', { name: '-1' })
      await user.click(minusOneButton)

      // Stock should now be 13 - 1 = 12
      expect(screen.getByDisplayValue('12')).toBeInTheDocument()
    })

    it('submits updated name, ID, price, and stock through quickUpdateAdminProduct', async () => {
      const user = userEvent.setup()
      const handleClose = vi.fn()
      const quickUpdateSpy = vi.spyOn(api, 'quickUpdateAdminProduct').mockResolvedValue({
        ...sampleProduct,
        id: 99,
        name: 'Royal Velvet Headband',
        stock_quantity: 15,
      })

      render(
        <QuickProductEditModal
          product={sampleProduct}
          categories={sampleCategories}
          onClose={handleClose}
        />,
        { wrapper: createWrapper() },
      )

      // Change English Name
      const nameInput = screen.getByDisplayValue('Velvet Headband')
      await user.clear(nameInput)
      await user.type(nameInput, 'Royal Velvet Headband')

      // Change Product ID to 99
      const idInput = screen.getByLabelText(/معرّف المنتج/i)
      await user.clear(idInput)
      await user.type(idInput, '99')

      // Increase stock by +10 (8 -> 18)
      await user.click(screen.getByRole('button', { name: '+10' }))

      // Click Save Changes
      const saveButton = screen.getByRole('button', { name: /حفظ التعديلات/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(quickUpdateSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            productId: 42,
            newId: 99,
            name: 'Royal Velvet Headband',
            stockQuantity: 18,
          }),
        )
        expect(handleClose).toHaveBeenCalled()
      })
    })
  })

  describe('QuickProductAddModal', () => {
    it('creates a new product with custom ID, name, price, stock, and category', async () => {
      const user = userEvent.setup()
      const handleClose = vi.fn()
      const createSpy = vi.spyOn(api, 'createAdminProduct').mockResolvedValue({
        ...sampleProduct,
        id: 77,
        name: 'Crystal Tiara',
      })

      render(
        <QuickProductAddModal isOpen={true} categories={sampleCategories} onClose={handleClose} />,
        { wrapper: createWrapper() },
      )

      // Enter Custom ID 77
      const customIdInput = screen.getByLabelText(/معرّف المنتج/i)
      await user.type(customIdInput, '77')

      // Enter English Name
      const nameInput = screen.getByLabelText(/الاسم بالإنجليزية/i)
      await user.type(nameInput, 'Crystal Tiara')

      // Enter Price
      const priceInput = screen.getByLabelText(/السعر/i)
      await user.type(priceInput, '450')

      // Select Category
      const categorySelect = screen.getByLabelText(/القسم/i)
      await user.selectOptions(categorySelect, '1')

      // Submit
      const submitButton = screen.getByRole('button', { name: /إضافة المنتج/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(createSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            custom_id: 77,
            name: 'Crystal Tiara',
            price: 450,
            category_id: 1,
            stock_quantity: 10,
          }),
        )
        expect(handleClose).toHaveBeenCalled()
      })
    })
  })

  describe('updateAdminProductId API helper', () => {
    it('rejects invalid non-integer or zero IDs with PRD-001', async () => {
      await expect(api.updateAdminProductId(42, -5)).rejects.toThrow()
      await expect(api.updateAdminProductId(42, 0)).rejects.toThrow()
    })
  })
})

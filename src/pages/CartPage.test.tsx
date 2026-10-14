import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LanguageProvider } from '@/i18n/LanguageProvider'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { CART_STORAGE_KEY } from '@/features/cart'
import { CartProvider } from '@/features/cart'
import CartPage from './CartPage'
import type { ProductWithCategory } from '@/features/catalog'

const mockProduct: ProductWithCategory = {
  id: 1,
  name: 'Gold Ring',
  name_ar: 'خاتم ذهبي',
  description: 'Gold ring',
  description_ar: 'خاتم ذهبي',
  price: 200,
  final_price: 150,
  discount_percent: 25,
  stock_quantity: 5,
  in_stock: true,
  is_active: true,
  image_url: '/product-1.webp',
  extra_images: [],
  category_id: 10,
  category: { id: 10, name: 'Rings', name_ar: 'خواتم', slug: 'rings' },
  is_featured: false,
  sold_count: 0,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
}

function renderCartPage(
  initialItems?: Array<{ productId: number; quantity: number }>,
  lang = 'ar',
) {
  if (initialItems) {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(initialItems))
  } else {
    window.localStorage.removeItem(CART_STORAGE_KEY)
  }

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  })

  queryClient.setQueryData(['catalog', 'products', '1'], [mockProduct])

  return render(
    <MemoryRouter>
      <LanguageProvider initialLanguage={lang as 'ar' | 'en'}>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <CartProvider>
              <CartPage />
            </CartProvider>
          </QueryClientProvider>
        </AuthProvider>
      </LanguageProvider>
    </MemoryRouter>,
  )
}

describe('CartPage (T-3.06)', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('renders empty cart state when cart has no items', () => {
    renderCartPage([])

    expect(screen.getByRole('heading', { name: 'سلة التسوق' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'سلة التسوق فارغة' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'تصفّح المنتجات' })).toHaveAttribute(
      'href',
      '/category/all',
    )
  })

  it('renders cart line items, unit price, and subtotal', async () => {
    renderCartPage([{ productId: 1, quantity: 2 }])

    // Page heading
    expect(screen.getByRole('heading', { name: 'سلة التسوق' })).toBeInTheDocument()

    // Product item details
    expect(screen.getByText('خاتم ذهبي')).toBeInTheDocument()
    expect(screen.getByText('خواتم')).toBeInTheDocument()

    // Subtotal and Total: 150 * 2 = 300
    expect(screen.getAllByText(/300/).length).toBeGreaterThanOrEqual(1)

    // Call to action for guest
    expect(screen.getByRole('button', { name: 'تسجيل الدخول لإتمام الطلب' })).toBeInTheDocument()
  })

  it('updates quantity via stepper and clamps at max stock', async () => {
    renderCartPage([{ productId: 1, quantity: 4 }])

    const incrementBtn = screen.getByRole('button', { name: 'زيادة الكمية' })
    const decrementBtn = screen.getByRole('button', { name: 'تقليل الكمية' })

    // Increment to 5 (max stock is 5)
    await userEvent.click(incrementBtn)
    expect(screen.getByLabelText('الكمية: 5')).toBeInTheDocument()
    expect(incrementBtn).toBeDisabled()

    // Decrement to 4
    await userEvent.click(decrementBtn)
    expect(screen.getByLabelText('الكمية: 4')).toBeInTheDocument()
    expect(incrementBtn).not.toBeDisabled()
  })

  it('removes item when delete button is clicked', async () => {
    renderCartPage([{ productId: 1, quantity: 2 }])

    const removeBtn = screen.getByRole('button', { name: /حذف خاتم ذهبي/ })
    await userEvent.click(removeBtn)

    // Should become empty
    expect(screen.getByRole('heading', { name: 'سلة التسوق فارغة' })).toBeInTheDocument()
  })

  it('clears entire cart when clear button is clicked', async () => {
    renderCartPage([{ productId: 1, quantity: 2 }])

    const clearBtn = screen.getByRole('button', { name: 'إفراغ السلة' })
    await userEvent.click(clearBtn)

    expect(screen.getByRole('heading', { name: 'سلة التسوق فارغة' })).toBeInTheDocument()
  })

  it('renders in English when language is en', () => {
    renderCartPage([], 'en')

    expect(screen.getByRole('heading', { name: 'Shopping Cart' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Your cart is empty' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse products' })).toHaveAttribute(
      'href',
      '/category/all',
    )
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LanguageProvider } from '@/i18n/LanguageProvider'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { CART_STORAGE_KEY, loadCart, saveCart } from './cartStorage'
import { cartReducer } from './cartReducer'
import { CartProvider, useCart } from './CartProvider'
import { CartDrawer } from './components/CartDrawer'
import type { ProductWithCategory } from '../catalog'

const mockProduct1: ProductWithCategory = {
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

const mockProduct2: ProductWithCategory = {
  id: 2,
  name: 'Silver Bracelet',
  name_ar: 'سوار فضي',
  description: 'Silver bracelet',
  description_ar: 'سوار فضي',
  price: 300,
  final_price: 300,
  discount_percent: 0,
  stock_quantity: 2,
  in_stock: true,
  is_active: true,
  image_url: '/product-2.webp',
  extra_images: [],
  category_id: 20,
  category: { id: 20, name: 'Bracelets', name_ar: 'أساور', slug: 'bracelets' },
  is_featured: false,
  sold_count: 0,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
}

function setupTest(initialStorageItems?: Array<{ productId: number; quantity: number }>) {
  if (initialStorageItems) {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(initialStorageItems))
  } else {
    window.localStorage.removeItem(CART_STORAGE_KEY)
  }

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  })

  // Pre-seed mock products query
  queryClient.setQueryData(['catalog', 'products', '1,2'], [mockProduct1, mockProduct2])
  queryClient.setQueryData(['catalog', 'products', '1'], [mockProduct1])
  queryClient.setQueryData(['catalog', 'products', '2'], [mockProduct2])

  return { queryClient }
}

describe('Cart Feature (T-3.06)', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  describe('Storage & Duplicates Merging', () => {
    it('merges duplicate product IDs when loading from localStorage', () => {
      window.localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify([
          { productId: 1, quantity: 2 },
          { productId: 1, quantity: 3 },
          { productId: 2, quantity: 1 },
        ]),
      )

      const items = loadCart()
      expect(items).toEqual([
        { productId: 1, quantity: 5 },
        { productId: 2, quantity: 1 },
      ])
    })

    it('filters out invalid products and non-positive quantities on load', () => {
      window.localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify([
          { productId: -1, quantity: 2 },
          { productId: 1, quantity: 0 },
          { productId: 'invalid', quantity: 3 },
          { productId: 2, quantity: -5 },
          { productId: 3, quantity: 4 },
        ]),
      )

      const items = loadCart()
      expect(items).toEqual([{ productId: 3, quantity: 4 }])
    })

    it('persists strictly only productId and quantity to cart:v1', () => {
      saveCart([
        { productId: 1, quantity: 2 },
        { productId: 2, quantity: 3 },
      ])

      const raw = window.localStorage.getItem(CART_STORAGE_KEY)
      expect(raw).toBe(
        JSON.stringify([
          { productId: 1, quantity: 2 },
          { productId: 2, quantity: 3 },
        ]),
      )

      const parsed = JSON.parse(raw!)
      expect(Object.keys(parsed[0])).toEqual(['productId', 'quantity'])
    })
  })

  describe('Reducer Logic: Adding, Merging, and Clamping', () => {
    it('merges quantity when adding an item that already exists in cart', () => {
      const state = [{ productId: 1, quantity: 2 }]
      const next = cartReducer(state, { type: 'ADD_ITEM', productId: 1, quantity: 3 })
      expect(next).toEqual([{ productId: 1, quantity: 5 }])
    })

    it('clamps quantity to maxStock when adding', () => {
      const state = [{ productId: 1, quantity: 4 }]
      const next = cartReducer(state, {
        type: 'ADD_ITEM',
        productId: 1,
        quantity: 3,
        maxStock: 5,
      })
      expect(next).toEqual([{ productId: 1, quantity: 5 }])
    })

    it('clamps quantity to maxStock when updating', () => {
      const state = [{ productId: 1, quantity: 2 }]
      const next = cartReducer(state, {
        type: 'UPDATE_QUANTITY',
        productId: 1,
        quantity: 10,
        maxStock: 5,
      })
      expect(next).toEqual([{ productId: 1, quantity: 5 }])
    })

    it('removes item when quantity is updated to 0 or negative', () => {
      const state = [{ productId: 1, quantity: 2 }]
      const next = cartReducer(state, {
        type: 'UPDATE_QUANTITY',
        productId: 1,
        quantity: 0,
      })
      expect(next).toEqual([])
    })

    it('removes item explicitly on REMOVE_ITEM', () => {
      const state = [
        { productId: 1, quantity: 2 },
        { productId: 2, quantity: 1 },
      ]
      const next = cartReducer(state, { type: 'REMOVE_ITEM', productId: 1 })
      expect(next).toEqual([{ productId: 2, quantity: 1 }])
    })

    it('clears all items on CLEAR_CART', () => {
      const state = [{ productId: 1, quantity: 2 }]
      const next = cartReducer(state, { type: 'CLEAR_CART' })
      expect(next).toEqual([])
    })
  })

  describe('Re-validation: Clamping to Live Stock & Removing Stale Products', () => {
    it('SYNC_STOCK removes stale products not present in validProductIds', () => {
      const state = [
        { productId: 1, quantity: 2 },
        { productId: 999, quantity: 1 }, // deleted/stale
      ]

      const next = cartReducer(state, {
        type: 'SYNC_STOCK',
        validProductIds: [1],
        stockMap: { 1: 5 },
      })

      expect(next).toEqual([{ productId: 1, quantity: 2 }])
    })

    it('SYNC_STOCK clamps item quantity when live stock is lower than in cart', () => {
      const state = [{ productId: 1, quantity: 8 }]

      const next = cartReducer(state, {
        type: 'SYNC_STOCK',
        validProductIds: [1],
        stockMap: { 1: 3 }, // live stock reduced to 3
      })

      expect(next).toEqual([{ productId: 1, quantity: 3 }])
    })

    it('SYNC_STOCK removes item if live stock becomes 0', () => {
      const state = [{ productId: 1, quantity: 2 }]

      const next = cartReducer(state, {
        type: 'SYNC_STOCK',
        validProductIds: [1],
        stockMap: { 1: 0 },
      })

      expect(next).toEqual([])
    })
  })

  describe('CartProvider & CartDrawer UI', () => {
    it('renders CartDrawer with live totals and line items', async () => {
      const { queryClient } = setupTest([{ productId: 1, quantity: 2 }])

      function TestApp() {
        const { openDrawer } = useCart()
        return (
          <div>
            <button onClick={openDrawer}>Open Drawer</button>
            <CartDrawer />
          </div>
        )
      }

      render(
        <MemoryRouter>
          <LanguageProvider>
            <AuthProvider>
              <QueryClientProvider client={queryClient}>
                <CartProvider>
                  <TestApp />
                </CartProvider>
              </QueryClientProvider>
            </AuthProvider>
          </LanguageProvider>
        </MemoryRouter>,
      )

      // Open drawer
      await userEvent.click(screen.getByRole('button', { name: 'Open Drawer' }))

      // Verify drawer heading
      expect(screen.getByRole('dialog', { name: 'سلة التسوق' })).toBeInTheDocument()

      // Product line item is rendered with live name and price (150 * 2 = 300)
      expect(screen.getByText('خاتم ذهبي')).toBeInTheDocument()
      expect(screen.getAllByText(/300/).length).toBeGreaterThanOrEqual(1)

      // Call to action for guest
      expect(screen.getByRole('button', { name: 'تسجيل الدخول لإتمام الطلب' })).toBeInTheDocument()
    })

    it('allows increasing and decreasing quantity in drawer', async () => {
      const { queryClient } = setupTest([{ productId: 1, quantity: 1 }])

      function TestApp() {
        const { openDrawer } = useCart()
        return (
          <div>
            <button onClick={openDrawer}>Open Drawer</button>
            <CartDrawer />
          </div>
        )
      }

      render(
        <MemoryRouter>
          <LanguageProvider>
            <AuthProvider>
              <QueryClientProvider client={queryClient}>
                <CartProvider>
                  <TestApp />
                </CartProvider>
              </QueryClientProvider>
            </AuthProvider>
          </LanguageProvider>
        </MemoryRouter>,
      )

      await userEvent.click(screen.getByRole('button', { name: 'Open Drawer' }))

      // Increment
      const incrementBtn = screen.getByRole('button', { name: 'زيادة الكمية' })
      await userEvent.click(incrementBtn)

      expect(screen.getByLabelText('الكمية: 2')).toBeInTheDocument()
    })

    it('closes drawer on escape key', async () => {
      const { queryClient } = setupTest([])

      function TestApp() {
        const { openDrawer } = useCart()
        return (
          <div>
            <button onClick={openDrawer}>Open Drawer</button>
            <CartDrawer />
          </div>
        )
      }

      render(
        <MemoryRouter>
          <LanguageProvider>
            <AuthProvider>
              <QueryClientProvider client={queryClient}>
                <CartProvider>
                  <TestApp />
                </CartProvider>
              </QueryClientProvider>
            </AuthProvider>
          </LanguageProvider>
        </MemoryRouter>,
      )

      await userEvent.click(screen.getByRole('button', { name: 'Open Drawer' }))
      expect(screen.getByRole('dialog', { name: 'سلة التسوق' })).toBeInTheDocument()

      await userEvent.keyboard('{Escape}')
      expect(screen.queryByRole('dialog', { name: 'سلة التسوق' })).not.toBeInTheDocument()
    })
  })
})

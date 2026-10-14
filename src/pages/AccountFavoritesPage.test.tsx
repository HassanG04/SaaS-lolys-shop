import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LanguageProvider } from '@/i18n/LanguageProvider'
import { ToastProvider } from '@/components/ui/ToastProvider'
import { CartProvider } from '@/features/cart/CartProvider'
import AccountFavoritesPage from './AccountFavoritesPage'
import * as authProviderModule from '@/features/auth/AuthProvider'
import * as favoritesApi from '@/features/favorites/api'
import type { FavoriteItem } from '@/features/favorites/types'
import type { AuthContextValue } from '@/features/auth/types'

const mockFavoriteItems: FavoriteItem[] = [
  {
    product_id: 101,
    created_at: '2026-10-10T12:00:00Z',
    product: {
      id: 101,
      name: 'Silver Bow Ring',
      name_ar: 'خاتم فيونكة فضي',
      description: 'Elegant silver ring with bow design.',
      description_ar: 'خاتم فضة إسترليني بتصميم فيونكة ناعمة.',
      price: 300,
      discount_percent: 10,
      final_price: 270,
      stock_quantity: 8,
      in_stock: true,
      sold_count: 15,
      is_active: true,
      is_featured: true,
      image_url: 'products/bow-ring.webp',
      extra_images: [],
      category_id: 1,
      created_at: '2026-10-10T00:00:00Z',
      updated_at: '2026-10-10T00:00:00Z',
    },
  },
  {
    product_id: 102,
    created_at: '2026-10-09T10:00:00Z',
    product: {
      id: 102,
      name: 'Pearl Drop Earrings',
      name_ar: 'أقراط لؤلؤ متدلية',
      description: 'Handmade earrings with freshwater pearls.',
      description_ar: 'أقراط لؤلؤ طبيعي يدوي أنيق.',
      price: 450,
      discount_percent: 0,
      final_price: 450,
      stock_quantity: 3,
      in_stock: true,
      sold_count: 22,
      is_active: true,
      is_featured: false,
      image_url: 'products/pearl-earrings.webp',
      extra_images: [],
      category_id: 1,
      created_at: '2026-10-09T00:00:00Z',
      updated_at: '2026-10-09T00:00:00Z',
    },
  },
]

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <LanguageProvider initialLanguage="ar">
        <ToastProvider>
          <CartProvider>
            <MemoryRouter>{ui}</MemoryRouter>
          </CartProvider>
        </ToastProvider>
      </LanguageProvider>
    </QueryClientProvider>,
  )
}

describe('AccountFavoritesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    const authValue = {
      user: { id: 'user-1', email: 'test@example.com' } as unknown as AuthContextValue['user'],
      profile: null,
      session: null,
      role: 'customer' as const,
      isAdmin: false,
      isLoading: false,
      signOut: vi.fn(),
      refreshSession: vi.fn(),
    }
    vi.spyOn(authProviderModule, 'useAuth').mockReturnValue(
      authValue as unknown as AuthContextValue,
    )
    vi.spyOn(authProviderModule, 'useOptionalAuth').mockReturnValue(
      authValue as unknown as AuthContextValue,
    )

    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true
    })
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.open = false
    })
  })

  it('renders loading state initially', () => {
    vi.spyOn(favoritesApi, 'getFavoritesApi').mockImplementation(() => new Promise(() => {}))
    vi.spyOn(favoritesApi, 'getFavoriteProductIdsApi').mockImplementation(
      () => new Promise(() => {}),
    )

    renderWithProviders(<AccountFavoritesPage />)

    expect(screen.getByRole('status', { name: 'جارٍ تحميل المنتجات المفضلة' })).toBeInTheDocument()
  })

  it('renders empty state when customer has no favorites', async () => {
    vi.spyOn(favoritesApi, 'getFavoritesApi').mockResolvedValue([])
    vi.spyOn(favoritesApi, 'getFavoriteProductIdsApi').mockResolvedValue([])

    renderWithProviders(<AccountFavoritesPage />)

    await waitFor(() => {
      expect(screen.getByTestId('favorites-empty-state')).toBeInTheDocument()
    })

    expect(screen.getByText('قائمة المفضلة فارغة')).toBeInTheDocument()
    expect(
      screen.getByText('لم تقم بإضافة أي منتجات إلى المفضلة بعد. استكشف مجموعتنا وأضف ما يعجبك!'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'تصفّح المنتجات' })).toHaveAttribute(
      'href',
      '/category/all',
    )
  })

  it('renders list of favorite products with count badge', async () => {
    vi.spyOn(favoritesApi, 'getFavoritesApi').mockResolvedValue(mockFavoriteItems)
    vi.spyOn(favoritesApi, 'getFavoriteProductIdsApi').mockResolvedValue([101, 102])

    renderWithProviders(<AccountFavoritesPage />)

    await waitFor(() => {
      expect(screen.getByTestId('favorites-grid')).toBeInTheDocument()
    })

    // Displays both product cards
    expect(screen.getByTestId('product-card-101')).toBeInTheDocument()
    expect(screen.getByTestId('product-card-102')).toBeInTheDocument()

    // Verifies names and prices
    expect(screen.getByText('خاتم فيونكة فضي')).toBeInTheDocument()
    expect(screen.getByText('أقراط لؤلؤ متدلية')).toBeInTheDocument()

    // Count badge
    const badge = screen.getByTestId('favorites-count-badge')
    expect(badge).toBeInTheDocument()
    expect(badge.textContent).toBe('منتجان مفضلان')
  })

  it('renders error panel on fetch failure and allows retry', async () => {
    const errorSpy = vi
      .spyOn(favoritesApi, 'getFavoritesApi')
      .mockRejectedValueOnce(new Error('Fetch error'))
      .mockResolvedValueOnce(mockFavoriteItems)
    vi.spyOn(favoritesApi, 'getFavoriteProductIdsApi').mockResolvedValue([101, 102])

    const user = userEvent.setup()
    renderWithProviders(<AccountFavoritesPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /إعادة المحاولة/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /إعادة المحاولة/i }))

    await waitFor(() => {
      expect(screen.getByTestId('favorites-grid')).toBeInTheDocument()
    })
    expect(errorSpy).toHaveBeenCalledTimes(2)
  })

  it('allows unfavoriting a product from the page card', async () => {
    vi.spyOn(favoritesApi, 'getFavoritesApi').mockResolvedValue(mockFavoriteItems)
    vi.spyOn(favoritesApi, 'getFavoriteProductIdsApi').mockResolvedValue([101, 102])
    const removeSpy = vi.spyOn(favoritesApi, 'removeFavoriteApi').mockResolvedValue(undefined)

    const user = userEvent.setup()
    renderWithProviders(<AccountFavoritesPage />)

    await waitFor(() => {
      expect(screen.getByTestId('product-card-101')).toBeInTheDocument()
    })

    const favoriteBtn = screen.getByTestId('favorite-button-101')
    await waitFor(() => {
      expect(favoriteBtn).toHaveAttribute('aria-pressed', 'true')
    })

    await user.click(favoriteBtn)

    expect(removeSpy).toHaveBeenCalledWith('user-1', 101)
  })
})

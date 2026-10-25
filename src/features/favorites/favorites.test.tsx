import { render, renderHook, act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LanguageProvider } from '@/i18n/LanguageProvider'
import { ToastProvider } from '@/components/ui/ToastProvider'
import * as authProviderModule from '@/features/auth/AuthProvider'
import type { AuthContextValue } from '@/features/auth/types'
import * as favoritesApi from './api'
import {
  useFavorites,
  useFavoriteIds,
  useToggleFavorite,
  FAVORITE_IDS_QUERY_KEY,
  FAVORITES_QUERY_KEY,
} from './hooks'
import { FavoriteButton } from './components/FavoriteButton'
import type { Product } from '@/features/catalog/types'
import type { FavoriteItem } from './types'

const mockProduct: Product = {
  id: 42,
  name: 'Gold Pearl Necklace',
  name_ar: 'عقد لؤلؤ ذهبي',
  description: 'Handmade pearl necklace',
  description_ar: 'عقد لؤلؤ يدوي راقي',
  price: 250,
  discount_percent: 0,
  final_price: 250,
  stock_quantity: 10,
  in_stock: true,
  sold_count: 5,
  is_active: true,
  is_featured: false,
  image_url: 'products/necklace.webp',
  extra_images: [],
  category_id: 1,
  created_at: '2026-10-10T00:00:00Z',
  updated_at: '2026-10-10T00:00:00Z',
}

const mockFavorites: FavoriteItem[] = [
  {
    product_id: 42,
    created_at: '2026-10-10T12:00:00Z',
    product: mockProduct,
  },
]

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function renderWithProviders(ui: React.ReactElement, client?: QueryClient) {
  const queryClient = client ?? createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <LanguageProvider initialLanguage="ar">
        <ToastProvider>
          <MemoryRouter>{ui}</MemoryRouter>
        </ToastProvider>
      </LanguageProvider>
    </QueryClientProvider>,
  )
}

describe('Favorites feature', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true
    })
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.open = false
    })
  })

  describe('Hooks & Optimistic Updates', () => {
    it('useFavorites fetches favorites when userId is present', async () => {
      vi.spyOn(favoritesApi, 'getFavoritesApi').mockResolvedValue(mockFavorites)
      const queryClient = createTestQueryClient()

      const { result } = renderHook(() => useFavorites('user-123'), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual(mockFavorites)
      expect(favoritesApi.getFavoritesApi).toHaveBeenCalledOnce()
    })

    it('useFavoriteIds fetches IDs when userId is present', async () => {
      vi.spyOn(favoritesApi, 'getFavoriteProductIdsApi').mockResolvedValue([42])
      const queryClient = createTestQueryClient()

      const { result } = renderHook(() => useFavoriteIds('user-123'), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual([42])
    })

    it('optimistically adds a favorite item and synchronizes', async () => {
      vi.spyOn(favoritesApi, 'addFavoriteApi').mockResolvedValue(undefined)
      const queryClient = createTestQueryClient()
      queryClient.setQueryData(FAVORITE_IDS_QUERY_KEY, [10])

      const { result } = renderHook(() => useToggleFavorite('user-123'), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      })

      await act(async () => {
        result.current.mutate({
          productId: 42,
          product: mockProduct,
          willFavorite: true,
        })
      })

      // The ID was optimistically appended
      expect(queryClient.getQueryData(FAVORITE_IDS_QUERY_KEY)).toEqual([10, 42])
      expect(favoritesApi.addFavoriteApi).toHaveBeenCalledWith('user-123', 42)
    })

    it('optimistically removes a favorite item and synchronizes', async () => {
      vi.spyOn(favoritesApi, 'removeFavoriteApi').mockResolvedValue(undefined)
      const queryClient = createTestQueryClient()
      queryClient.setQueryData(FAVORITE_IDS_QUERY_KEY, [10, 42])

      const { result } = renderHook(() => useToggleFavorite('user-123'), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      })

      await act(async () => {
        result.current.mutate({
          productId: 42,
          product: mockProduct,
          willFavorite: false,
        })
      })

      expect(queryClient.getQueryData(FAVORITE_IDS_QUERY_KEY)).toEqual([10])
      expect(favoritesApi.removeFavoriteApi).toHaveBeenCalledWith('user-123', 42)
    })

    it('ROLLBACK: rolls back optimistic addition when mutation fails', async () => {
      vi.spyOn(favoritesApi, 'addFavoriteApi').mockRejectedValue(new Error('Network failure'))
      const queryClient = createTestQueryClient()
      const initialIds = [10]
      queryClient.setQueryData(FAVORITE_IDS_QUERY_KEY, initialIds)

      const { result } = renderHook(() => useToggleFavorite('user-123'), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      })

      try {
        await act(async () => {
          await result.current.mutateAsync({
            productId: 42,
            product: mockProduct,
            willFavorite: true,
          })
        })
      } catch {
        // Expected mutation rejection
      }

      // Check that the cache rolled back to the initial state
      expect(queryClient.getQueryData(FAVORITE_IDS_QUERY_KEY)).toEqual([10])
    })

    it('ROLLBACK: rolls back optimistic removal when mutation fails', async () => {
      vi.spyOn(favoritesApi, 'removeFavoriteApi').mockRejectedValue(new Error('Server error'))
      const queryClient = createTestQueryClient()
      const initialIds = [10, 42]
      queryClient.setQueryData(FAVORITE_IDS_QUERY_KEY, initialIds)
      queryClient.setQueryData(FAVORITES_QUERY_KEY, mockFavorites)

      const { result } = renderHook(() => useToggleFavorite('user-123'), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      })

      try {
        await act(async () => {
          await result.current.mutateAsync({
            productId: 42,
            product: mockProduct,
            willFavorite: false,
          })
        })
      } catch {
        // Expected mutation rejection
      }

      // Check that both ID list and items list rolled back
      expect(queryClient.getQueryData(FAVORITE_IDS_QUERY_KEY)).toEqual([10, 42])
      expect(queryClient.getQueryData(FAVORITES_QUERY_KEY)).toEqual(mockFavorites)
    })
  })

  describe('FavoriteButton Component', () => {
    function createMockAuth(overrides?: Partial<AuthContextValue>): AuthContextValue {
      return {
        user: { id: 'user-123', email: 'user@example.com' } as unknown as AuthContextValue['user'],
        profile: null,
        profileError: null,
        session: null,
        role: 'customer',
        aal: 'aal1',
        factors: [],
        loading: false,
        loadingFactors: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        resetPassword: vi.fn(),
        resendConfirmation: vi.fn(),
        refreshProfile: vi.fn(),
        refreshAal: vi.fn(),
        refreshFactors: vi.fn(),
        enrollTotp: vi.fn(),
        challengeAndVerify: vi.fn(),
        unenrollFactor: vi.fn(),
        updatePassword: vi.fn(),
        updateEmail: vi.fn(),
        ...overrides,
      }
    }

    it('renders with filled state when product is favorited', () => {
      const auth = createMockAuth()
      vi.spyOn(authProviderModule, 'useAuth').mockReturnValue(auth)
      vi.spyOn(authProviderModule, 'useOptionalAuth').mockReturnValue(auth)

      const queryClient = createTestQueryClient()
      queryClient.setQueryData(FAVORITE_IDS_QUERY_KEY, [42])

      renderWithProviders(<FavoriteButton product={mockProduct} />, queryClient)

      const btn = screen.getByTestId('favorite-button-42')
      expect(btn).toHaveAttribute('aria-pressed', 'true')
      expect(btn).toHaveAttribute('data-favorited', 'true')
    })

    it('renders with un-filled state when product is not favorited', () => {
      const auth = createMockAuth()
      vi.spyOn(authProviderModule, 'useAuth').mockReturnValue(auth)
      vi.spyOn(authProviderModule, 'useOptionalAuth').mockReturnValue(auth)

      const queryClient = createTestQueryClient()
      queryClient.setQueryData(FAVORITE_IDS_QUERY_KEY, [10])

      renderWithProviders(<FavoriteButton product={mockProduct} />, queryClient)

      const btn = screen.getByTestId('favorite-button-42')
      expect(btn).toHaveAttribute('aria-pressed', 'false')
      expect(btn).toHaveAttribute('data-favorited', 'false')
    })

    it('prompts guest to log in when clicked without authenticated session', async () => {
      const user = userEvent.setup()
      const auth = createMockAuth({ user: null })
      vi.spyOn(authProviderModule, 'useAuth').mockReturnValue(auth)
      vi.spyOn(authProviderModule, 'useOptionalAuth').mockReturnValue(auth)

      const addSpy = vi.spyOn(favoritesApi, 'addFavoriteApi')

      renderWithProviders(<FavoriteButton product={mockProduct} />)

      const btn = screen.getByTestId('favorite-button-42')
      await user.click(btn)

      // Did NOT trigger API
      expect(addSpy).not.toHaveBeenCalled()

      // Shows login prompt dialog
      expect(screen.getByText('تسجيل الدخول للمتابعة')).toBeInTheDocument()
      expect(
        screen.getByText('يرجى تسجيل الدخول لحفظ المنتجات في قائمة المفضلة.'),
      ).toBeInTheDocument()
    })
  })
})

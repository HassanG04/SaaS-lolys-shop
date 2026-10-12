import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSupabase } from '@/lib/supabase'
import { AppError } from '@/lib/errors'
import {
  getCategories,
  getCategoryBySlug,
  getBestSellers,
  getProductsByCategory,
  getProductById,
  searchProducts,
  getFeaturedProducts,
  useCategories,
  useCategory,
  useBestSellers,
  useFeaturedProducts,
  useProductsByCategory,
  useProduct,
  useSearchProducts,
} from './index'
import type { Category, ProductWithCategory } from './types'

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
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

const mockCategories: Category[] = [
  {
    id: 1,
    name: 'Necklaces',
    name_ar: 'سلاسل',
    slug: 'necklaces',
    image_url: 'categories/necklaces.webp',
    sort_order: 1,
    is_active: true,
    show_on_home: true,
    created_at: '2026-10-10T00:00:00Z',
  },
  {
    id: 2,
    name: 'Rings',
    name_ar: 'خواتم',
    slug: 'rings',
    image_url: 'categories/rings.webp',
    sort_order: 2,
    is_active: true,
    show_on_home: false,
    created_at: '2026-10-10T00:00:00Z',
  },
]

const mockProducts: ProductWithCategory[] = [
  {
    id: 101,
    category_id: 1,
    name: 'Pearl Necklace',
    name_ar: 'عقد لؤلؤ',
    description: 'Elegant natural freshwater pearl necklace.',
    description_ar: 'عقد لؤلؤ طبيعي أنيق للمناسبات.',
    price: 350,
    discount_percent: 10,
    final_price: 315,
    stock_quantity: 15,
    in_stock: true,
    sold_count: 50,
    is_active: true,
    is_featured: true,
    image_url: 'products/necklace-1.webp',
    extra_images: ['products/necklace-1-alt.webp'],
    created_at: '2026-10-10T00:00:00Z',
    updated_at: '2026-10-10T00:00:00Z',
    categories: {
      id: 1,
      name: 'Necklaces',
      name_ar: 'سلاسل',
      slug: 'necklaces',
      is_active: true,
    },
    category: {
      id: 1,
      name: 'Necklaces',
      name_ar: 'سلاسل',
      slug: 'necklaces',
      is_active: true,
    },
  },
  {
    id: 102,
    category_id: 2,
    name: 'Silver Bow Ring',
    name_ar: 'خاتم فضة فيونكة',
    description: 'Delicate bow-shaped 925 sterling silver ring.',
    description_ar: 'خاتم فضة عيار 925 بتصميم فيونكة ناعم.',
    price: 180,
    discount_percent: 0,
    final_price: 180,
    stock_quantity: 8,
    in_stock: true,
    sold_count: 35,
    is_active: true,
    is_featured: false,
    image_url: 'products/product-ring.webp',
    extra_images: [],
    created_at: '2026-10-10T00:00:00Z',
    updated_at: '2026-10-10T00:00:00Z',
    categories: {
      id: 2,
      name: 'Rings',
      name_ar: 'خواتم',
      slug: 'rings',
      is_active: true,
    },
    category: {
      id: 2,
      name: 'Rings',
      name_ar: 'خواتم',
      slug: 'rings',
      is_active: true,
    },
  },
]

describe('Catalog API and hooks (T-3.01)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('getCategories', () => {
    it('fetches all active categories ordered by sort_order', async () => {
      const orderMock = vi.fn().mockResolvedValue({
        data: mockCategories,
        error: null,
      })
      const eqActiveMock = vi.fn().mockReturnValue({ order: orderMock })
      const selectMock = vi.fn().mockReturnValue({ eq: eqActiveMock })
      const fromSpy = vi.spyOn(getSupabase(), 'from').mockReturnValue({
        select: selectMock,
      } as unknown as ReturnType<ReturnType<typeof getSupabase>['from']>)

      const result = await getCategories()

      expect(fromSpy).toHaveBeenCalledWith('categories')
      expect(selectMock).toHaveBeenCalledWith('*')
      expect(eqActiveMock).toHaveBeenCalledWith('is_active', true)
      expect(orderMock).toHaveBeenCalledWith('sort_order', { ascending: true })
      expect(result).toEqual(mockCategories)
    })

    it('filters by show_on_home when showOnHomeOnly option is provided', async () => {
      const orderMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [mockCategories[0]],
          error: null,
        }),
      })
      const eqActiveMock = vi.fn().mockReturnValue({ order: orderMock })
      const selectMock = vi.fn().mockReturnValue({ eq: eqActiveMock })
      vi.spyOn(getSupabase(), 'from').mockReturnValue({
        select: selectMock,
      } as unknown as ReturnType<ReturnType<typeof getSupabase>['from']>)

      const result = await getCategories({ showOnHomeOnly: true })
      expect(result).toHaveLength(1)
      expect(result[0].slug).toBe('necklaces')
    })

    it('maps database errors through toAppError', async () => {
      const orderMock = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed', code: 'PGRST000' },
      })
      const eqActiveMock = vi.fn().mockReturnValue({ order: orderMock })
      const selectMock = vi.fn().mockReturnValue({ eq: eqActiveMock })
      vi.spyOn(getSupabase(), 'from').mockReturnValue({
        select: selectMock,
      } as unknown as ReturnType<ReturnType<typeof getSupabase>['from']>)

      await expect(getCategories()).rejects.toThrow(AppError)
    })
  })

  describe('getCategoryBySlug', () => {
    it('returns null when slug is empty or "all"', async () => {
      expect(await getCategoryBySlug('')).toBeNull()
      expect(await getCategoryBySlug('all')).toBeNull()
    })

    it('fetches an active category by slug', async () => {
      const maybeSingleMock = vi.fn().mockResolvedValue({
        data: mockCategories[0],
        error: null,
      })
      const eqActiveMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock })
      const eqSlugMock = vi.fn().mockReturnValue({ eq: eqActiveMock })
      const selectMock = vi.fn().mockReturnValue({ eq: eqSlugMock })
      vi.spyOn(getSupabase(), 'from').mockReturnValue({
        select: selectMock,
      } as unknown as ReturnType<ReturnType<typeof getSupabase>['from']>)

      const result = await getCategoryBySlug('necklaces')
      expect(selectMock).toHaveBeenCalledWith('*')
      expect(eqSlugMock).toHaveBeenCalledWith('slug', 'necklaces')
      expect(eqActiveMock).toHaveBeenCalledWith('is_active', true)
      expect(result).toEqual(mockCategories[0])
    })

    it('returns null when category is not found', async () => {
      const maybeSingleMock = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      })
      const eqActiveMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock })
      const eqSlugMock = vi.fn().mockReturnValue({ eq: eqActiveMock })
      const selectMock = vi.fn().mockReturnValue({ eq: eqSlugMock })
      vi.spyOn(getSupabase(), 'from').mockReturnValue({
        select: selectMock,
      } as unknown as ReturnType<ReturnType<typeof getSupabase>['from']>)

      const result = await getCategoryBySlug('nonexistent')
      expect(result).toBeNull()
    })
  })

  describe('getBestSellers', () => {
    it('fetches active products ordered by sold_count descending with default limit', async () => {
      const limitMock = vi.fn().mockResolvedValue({
        data: mockProducts,
        error: null,
      })
      const orderMock = vi.fn().mockReturnValue({ limit: limitMock })
      const eqCatActiveMock = vi.fn().mockReturnValue({ order: orderMock })
      const eqActiveMock = vi.fn().mockReturnValue({ eq: eqCatActiveMock })
      const selectMock = vi.fn().mockReturnValue({ eq: eqActiveMock })
      const fromSpy = vi.spyOn(getSupabase(), 'from').mockReturnValue({
        select: selectMock,
      } as unknown as ReturnType<ReturnType<typeof getSupabase>['from']>)

      const result = await getBestSellers()

      expect(fromSpy).toHaveBeenCalledWith('products')
      expect(selectMock).toHaveBeenCalledWith(
        '*, categories!inner(id, name, name_ar, slug, is_active)',
      )
      expect(eqActiveMock).toHaveBeenCalledWith('is_active', true)
      expect(eqCatActiveMock).toHaveBeenCalledWith('categories.is_active', true)
      expect(orderMock).toHaveBeenCalledWith('sold_count', { ascending: false })
      expect(limitMock).toHaveBeenCalledWith(8)
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe(101)
      expect(result[0].category?.slug).toBe('necklaces')
    })

    it('respects custom limit and maps errors', async () => {
      const limitMock = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Timeout', code: '57014' },
      })
      const orderMock = vi.fn().mockReturnValue({ limit: limitMock })
      const eqCatActiveMock = vi.fn().mockReturnValue({ order: orderMock })
      const eqActiveMock = vi.fn().mockReturnValue({ eq: eqCatActiveMock })
      const selectMock = vi.fn().mockReturnValue({ eq: eqActiveMock })
      vi.spyOn(getSupabase(), 'from').mockReturnValue({
        select: selectMock,
      } as unknown as ReturnType<ReturnType<typeof getSupabase>['from']>)

      await expect(getBestSellers(4)).rejects.toThrow(AppError)
    })
  })

  describe('getProductsByCategory', () => {
    it('returns empty array if slug is empty or whitespace', async () => {
      const fromSpy = vi.spyOn(getSupabase(), 'from')
      const result = await getProductsByCategory('   ')
      expect(result).toEqual([])
      expect(fromSpy).not.toHaveBeenCalled()
    })

    it('filters products by category slug and active flags', async () => {
      const orderMock = vi.fn().mockResolvedValue({
        data: [mockProducts[0]],
        error: null,
      })
      const eqCatActiveMock = vi.fn().mockReturnValue({ order: orderMock })
      const eqActiveMock = vi.fn().mockReturnValue({ eq: eqCatActiveMock })
      const eqSlugMock = vi.fn().mockReturnValue({ eq: eqActiveMock })
      const selectMock = vi.fn().mockReturnValue({ eq: eqSlugMock })
      const fromSpy = vi.spyOn(getSupabase(), 'from').mockReturnValue({
        select: selectMock,
      } as unknown as ReturnType<ReturnType<typeof getSupabase>['from']>)

      const result = await getProductsByCategory('necklaces')

      expect(fromSpy).toHaveBeenCalledWith('products')
      expect(eqSlugMock).toHaveBeenCalledWith('categories.slug', 'necklaces')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(101)
    })

    it('maps database query error to AppError', async () => {
      const orderMock = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Query error' },
      })
      const eqCatActiveMock = vi.fn().mockReturnValue({ order: orderMock })
      const eqActiveMock = vi.fn().mockReturnValue({ eq: eqCatActiveMock })
      const eqSlugMock = vi.fn().mockReturnValue({ eq: eqActiveMock })
      const selectMock = vi.fn().mockReturnValue({ eq: eqSlugMock })
      vi.spyOn(getSupabase(), 'from').mockReturnValue({
        select: selectMock,
      } as unknown as ReturnType<ReturnType<typeof getSupabase>['from']>)

      await expect(getProductsByCategory('rings')).rejects.toThrow(AppError)
    })
  })

  describe('getProductById', () => {
    it('returns null for non-numeric or non-positive IDs', async () => {
      const fromSpy = vi.spyOn(getSupabase(), 'from')
      expect(await getProductById('abc')).toBeNull()
      expect(await getProductById(0)).toBeNull()
      expect(await getProductById(-5)).toBeNull()
      expect(fromSpy).not.toHaveBeenCalled()
    })

    it('fetches a single product by numeric id with category relationship', async () => {
      const maybeSingleMock = vi.fn().mockResolvedValue({
        data: mockProducts[0],
        error: null,
      })
      const eqActiveMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock })
      const eqIdMock = vi.fn().mockReturnValue({ eq: eqActiveMock })
      const selectMock = vi.fn().mockReturnValue({ eq: eqIdMock })
      const fromSpy = vi.spyOn(getSupabase(), 'from').mockReturnValue({
        select: selectMock,
      } as unknown as ReturnType<ReturnType<typeof getSupabase>['from']>)

      const result = await getProductById(101)

      expect(fromSpy).toHaveBeenCalledWith('products')
      expect(eqIdMock).toHaveBeenCalledWith('id', 101)
      expect(eqActiveMock).toHaveBeenCalledWith('is_active', true)
      expect(result).not.toBeNull()
      expect(result?.name).toBe('Pearl Necklace')
      expect(result?.category?.name_ar).toBe('سلاسل')
    })

    it('returns null when product is not found', async () => {
      const maybeSingleMock = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      })
      const eqActiveMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock })
      const eqIdMock = vi.fn().mockReturnValue({ eq: eqActiveMock })
      const selectMock = vi.fn().mockReturnValue({ eq: eqIdMock })
      vi.spyOn(getSupabase(), 'from').mockReturnValue({
        select: selectMock,
      } as unknown as ReturnType<ReturnType<typeof getSupabase>['from']>)

      const result = await getProductById(9999)
      expect(result).toBeNull()
    })

    it('rethrows error as AppError', async () => {
      const maybeSingleMock = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'DB Failure' },
      })
      const eqActiveMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock })
      const eqIdMock = vi.fn().mockReturnValue({ eq: eqActiveMock })
      const selectMock = vi.fn().mockReturnValue({ eq: eqIdMock })
      vi.spyOn(getSupabase(), 'from').mockReturnValue({
        select: selectMock,
      } as unknown as ReturnType<ReturnType<typeof getSupabase>['from']>)

      await expect(getProductById(101)).rejects.toThrow(AppError)
    })
  })

  describe('searchProducts', () => {
    it('returns empty list immediately for empty or whitespace query', async () => {
      const fromSpy = vi.spyOn(getSupabase(), 'from')
      const result = await searchProducts('   ')
      expect(result).toEqual([])
      expect(fromSpy).not.toHaveBeenCalled()
    })

    it('searches across name, name_ar, description and description_ar', async () => {
      const limitMock = vi.fn().mockResolvedValue({
        data: [mockProducts[0]],
        error: null,
      })
      const orderMock = vi.fn().mockReturnValue({ limit: limitMock })
      const orMock = vi.fn().mockReturnValue({ order: orderMock })
      const eqCatActiveMock = vi.fn().mockReturnValue({ or: orMock })
      const eqActiveMock = vi.fn().mockReturnValue({ eq: eqCatActiveMock })
      const selectMock = vi.fn().mockReturnValue({ eq: eqActiveMock })
      const fromSpy = vi.spyOn(getSupabase(), 'from').mockReturnValue({
        select: selectMock,
      } as unknown as ReturnType<ReturnType<typeof getSupabase>['from']>)

      const result = await searchProducts('لؤلؤ', 10)

      expect(fromSpy).toHaveBeenCalledWith('products')
      expect(orMock).toHaveBeenCalledWith(expect.stringContaining('name_ar.ilike.%لؤلؤ%'))
      expect(limitMock).toHaveBeenCalledWith(10)
      expect(result).toHaveLength(1)
      expect(result[0].name_ar).toBe('عقد لؤلؤ')
    })
  })

  describe('getFeaturedProducts', () => {
    it('fetches featured products', async () => {
      const limitMock = vi.fn().mockResolvedValue({
        data: [mockProducts[0]],
        error: null,
      })
      const orderMock = vi.fn().mockReturnValue({ limit: limitMock })
      const eqCatActiveMock = vi.fn().mockReturnValue({ order: orderMock })
      const eqFeaturedMock = vi.fn().mockReturnValue({ eq: eqCatActiveMock })
      const eqActiveMock = vi.fn().mockReturnValue({ eq: eqFeaturedMock })
      const selectMock = vi.fn().mockReturnValue({ eq: eqActiveMock })
      vi.spyOn(getSupabase(), 'from').mockReturnValue({
        select: selectMock,
      } as unknown as ReturnType<ReturnType<typeof getSupabase>['from']>)

      const result = await getFeaturedProducts(5)

      expect(eqFeaturedMock).toHaveBeenCalledWith('is_featured', true)
      expect(result).toHaveLength(1)
    })
  })

  describe('React Query hooks', () => {
    it('useCategories returns categories data', async () => {
      const orderMock = vi.fn().mockResolvedValue({
        data: mockCategories,
        error: null,
      })
      const eqActiveMock = vi.fn().mockReturnValue({ order: orderMock })
      const selectMock = vi.fn().mockReturnValue({ eq: eqActiveMock })
      vi.spyOn(getSupabase(), 'from').mockReturnValue({
        select: selectMock,
      } as unknown as ReturnType<ReturnType<typeof getSupabase>['from']>)

      const { result } = renderHook(() => useCategories(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockCategories)
    })

    it('useCategory fetches category details for valid slug', async () => {
      const maybeSingleMock = vi.fn().mockResolvedValue({
        data: mockCategories[0],
        error: null,
      })
      const eqActiveMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock })
      const eqSlugMock = vi.fn().mockReturnValue({ eq: eqActiveMock })
      const selectMock = vi.fn().mockReturnValue({ eq: eqSlugMock })
      vi.spyOn(getSupabase(), 'from').mockReturnValue({
        select: selectMock,
      } as unknown as ReturnType<ReturnType<typeof getSupabase>['from']>)

      const { result } = renderHook(() => useCategory('necklaces'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockCategories[0])
    })

    it('useCategory is disabled when slug is empty or "all"', () => {
      const { result } = renderHook(() => useCategory(''), {
        wrapper: createWrapper(),
      })
      expect(result.current.fetchStatus).toBe('idle')

      const { result: allResult } = renderHook(() => useCategory('all'), {
        wrapper: createWrapper(),
      })
      expect(allResult.current.fetchStatus).toBe('idle')
    })

    it('useBestSellers returns best seller products', async () => {
      const limitMock = vi.fn().mockResolvedValue({
        data: mockProducts,
        error: null,
      })
      const orderMock = vi.fn().mockReturnValue({ limit: limitMock })
      const eqCatActiveMock = vi.fn().mockReturnValue({ order: orderMock })
      const eqActiveMock = vi.fn().mockReturnValue({ eq: eqCatActiveMock })
      const selectMock = vi.fn().mockReturnValue({ eq: eqActiveMock })
      vi.spyOn(getSupabase(), 'from').mockReturnValue({
        select: selectMock,
      } as unknown as ReturnType<ReturnType<typeof getSupabase>['from']>)

      const { result } = renderHook(() => useBestSellers(5), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toHaveLength(2)
    })

    it('useProductsByCategory is disabled when slug is falsy', () => {
      const { result } = renderHook(() => useProductsByCategory(''), {
        wrapper: createWrapper(),
      })
      expect(result.current.fetchStatus).toBe('idle')
    })

    it('useProduct is disabled when id is invalid', () => {
      const { result } = renderHook(() => useProduct(0), {
        wrapper: createWrapper(),
      })
      expect(result.current.fetchStatus).toBe('idle')
    })

    it('useSearchProducts is disabled when query is empty', () => {
      const { result } = renderHook(() => useSearchProducts('   '), {
        wrapper: createWrapper(),
      })
      expect(result.current.fetchStatus).toBe('idle')
    })

    it('useFeaturedProducts returns featured list', async () => {
      const limitMock = vi.fn().mockResolvedValue({
        data: [mockProducts[0]],
        error: null,
      })
      const orderMock = vi.fn().mockReturnValue({ limit: limitMock })
      const eqCatActiveMock = vi.fn().mockReturnValue({ order: orderMock })
      const eqFeaturedMock = vi.fn().mockReturnValue({ eq: eqCatActiveMock })
      const eqActiveMock = vi.fn().mockReturnValue({ eq: eqFeaturedMock })
      const selectMock = vi.fn().mockReturnValue({ eq: eqActiveMock })
      vi.spyOn(getSupabase(), 'from').mockReturnValue({
        select: selectMock,
      } as unknown as ReturnType<ReturnType<typeof getSupabase>['from']>)

      const { result } = renderHook(() => useFeaturedProducts(4), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toHaveLength(1)
    })
  })
})

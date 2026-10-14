import { useQuery } from '@tanstack/react-query'
import type { AppError } from '@/lib/errors'
import {
  getCategories,
  getCategoryBySlug,
  getBestSellers,
  getProductsByCategory,
  getProductById,
  searchProducts,
  getFeaturedProducts,
  getBrowseProducts,
  getProductsByIds,
} from './api'
import type {
  Category,
  ProductWithCategory,
  GetCategoriesOptions,
  GetBrowseProductsOptions,
  BrowseProductsResult,
} from './types'

export function useCategories(options?: GetCategoriesOptions) {
  return useQuery<Category[], AppError>({
    queryKey: ['catalog', 'categories', options?.showOnHomeOnly ?? false],
    queryFn: () => getCategories(options),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCategory(slug?: string | null) {
  const trimmed = slug?.trim() ?? ''
  const isAll = trimmed === 'all'
  const isEnabled = Boolean(trimmed) && !isAll

  return useQuery<Category | null, AppError>({
    queryKey: ['catalog', 'categoryDetail', trimmed],
    queryFn: () => (isEnabled ? getCategoryBySlug(trimmed) : Promise.resolve(null)),
    enabled: isEnabled,
    staleTime: 5 * 60 * 1000,
  })
}

export function useBestSellers(limit = 8) {
  return useQuery<ProductWithCategory[], AppError>({
    queryKey: ['catalog', 'bestSellers', limit],
    queryFn: () => getBestSellers(limit),
    staleTime: 5 * 60 * 1000,
  })
}

export function useFeaturedProducts(limit = 8) {
  return useQuery<ProductWithCategory[], AppError>({
    queryKey: ['catalog', 'featured', limit],
    queryFn: () => getFeaturedProducts(limit),
    staleTime: 5 * 60 * 1000,
  })
}

export function useProductsByCategory(categorySlug?: string | null) {
  const slug = categorySlug?.trim() ?? ''
  return useQuery<ProductWithCategory[], AppError>({
    queryKey: ['catalog', 'category', slug],
    queryFn: () => getProductsByCategory(slug),
    enabled: Boolean(slug),
    staleTime: 5 * 60 * 1000,
  })
}

export function useProduct(id?: number | string | null) {
  const numericId = typeof id === 'string' ? Number(id) : id
  const isValid = typeof numericId === 'number' && !Number.isNaN(numericId) && numericId > 0

  return useQuery<ProductWithCategory | null, AppError>({
    queryKey: ['catalog', 'product', numericId],
    queryFn: () => (isValid ? getProductById(numericId) : Promise.resolve(null)),
    enabled: isValid,
    staleTime: 5 * 60 * 1000,
  })
}

export function useProductsByIds(ids: number[]) {
  const validIds = Array.from(
    new Set(ids.filter((id) => typeof id === 'number' && !Number.isNaN(id) && id > 0)),
  ).sort((a, b) => a - b)

  const queryKey = ['catalog', 'products', validIds.join(',')]

  return useQuery<ProductWithCategory[], AppError>({
    queryKey,
    queryFn: () => (validIds.length > 0 ? getProductsByIds(validIds) : Promise.resolve([])),
    enabled: validIds.length > 0,
    staleTime: 60 * 1000,
  })
}

export function useSearchProducts(query?: string | null, limit = 20) {
  const trimmed = query?.trim() ?? ''
  return useQuery<ProductWithCategory[], AppError>({
    queryKey: ['catalog', 'search', trimmed, limit],
    queryFn: () => searchProducts(trimmed, limit),
    enabled: trimmed.length > 0,
    staleTime: 2 * 60 * 1000,
  })
}

export function useBrowseProducts(options?: GetBrowseProductsOptions) {
  const categorySlug = options?.categorySlug ?? 'all'
  const sortBy = options?.sortBy ?? 'best_sellers'
  const limit = options?.limit ?? 12
  const offset = options?.offset ?? 0
  const inStockOnly = options?.inStockOnly ?? false

  return useQuery<BrowseProductsResult, AppError>({
    queryKey: ['catalog', 'browse', categorySlug, sortBy, limit, offset, inStockOnly],
    queryFn: () => getBrowseProducts(options),
    staleTime: 5 * 60 * 1000,
  })
}

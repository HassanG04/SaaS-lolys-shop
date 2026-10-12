import { useQuery } from '@tanstack/react-query'
import type { AppError } from '@/lib/errors'
import {
  getCategories,
  getBestSellers,
  getProductsByCategory,
  getProductById,
  searchProducts,
  getFeaturedProducts,
} from './api'
import type { Category, ProductWithCategory, GetCategoriesOptions } from './types'

export function useCategories(options?: GetCategoriesOptions) {
  return useQuery<Category[], AppError>({
    queryKey: ['catalog', 'categories', options?.showOnHomeOnly ?? false],
    queryFn: () => getCategories(options),
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

export function useSearchProducts(query?: string | null, limit = 20) {
  const trimmed = query?.trim() ?? ''
  return useQuery<ProductWithCategory[], AppError>({
    queryKey: ['catalog', 'search', trimmed, limit],
    queryFn: () => searchProducts(trimmed, limit),
    enabled: trimmed.length > 0,
    staleTime: 2 * 60 * 1000,
  })
}

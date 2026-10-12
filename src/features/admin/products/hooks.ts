import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { AppError } from '@/lib/errors'
import {
  getAdminProducts,
  getAdminCategories,
  updateProductStock,
  updateProductActive,
} from './api'
import type {
  AdminProduct,
  AdminCategorySummary,
  UpdateProductStockParams,
  UpdateProductActiveParams,
} from './types'

export const ADMIN_PRODUCTS_QUERY_KEY = ['admin', 'products'] as const
export const ADMIN_CATEGORIES_QUERY_KEY = ['admin', 'categories'] as const

export function useAdminProducts() {
  return useQuery<AdminProduct[], AppError>({
    queryKey: ADMIN_PRODUCTS_QUERY_KEY,
    queryFn: getAdminProducts,
    staleTime: 30 * 1000,
  })
}

export function useAdminCategories() {
  return useQuery<AdminCategorySummary[], AppError>({
    queryKey: ADMIN_CATEGORIES_QUERY_KEY,
    queryFn: getAdminCategories,
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpdateProductStock() {
  const queryClient = useQueryClient()

  return useMutation<
    AdminProduct,
    AppError,
    UpdateProductStockParams,
    { previousProducts?: AdminProduct[] }
  >({
    mutationFn: updateProductStock,
    onMutate: async ({ productId, newQuantity }) => {
      await queryClient.cancelQueries({ queryKey: ADMIN_PRODUCTS_QUERY_KEY })
      const previousProducts = queryClient.getQueryData<AdminProduct[]>(ADMIN_PRODUCTS_QUERY_KEY)

      if (previousProducts) {
        queryClient.setQueryData<AdminProduct[]>(
          ADMIN_PRODUCTS_QUERY_KEY,
          previousProducts.map((p) =>
            p.id === productId
              ? {
                  ...p,
                  stock_quantity: newQuantity,
                  in_stock: newQuantity > 0,
                }
              : p,
          ),
        )
      }

      return { previousProducts }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData(ADMIN_PRODUCTS_QUERY_KEY, context.previousProducts)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_PRODUCTS_QUERY_KEY })
    },
  })
}

export function useUpdateProductActive() {
  const queryClient = useQueryClient()

  return useMutation<
    AdminProduct,
    AppError,
    UpdateProductActiveParams,
    { previousProducts?: AdminProduct[] }
  >({
    mutationFn: updateProductActive,
    onMutate: async ({ productId, isActive }) => {
      await queryClient.cancelQueries({ queryKey: ADMIN_PRODUCTS_QUERY_KEY })
      const previousProducts = queryClient.getQueryData<AdminProduct[]>(ADMIN_PRODUCTS_QUERY_KEY)

      if (previousProducts) {
        queryClient.setQueryData<AdminProduct[]>(
          ADMIN_PRODUCTS_QUERY_KEY,
          previousProducts.map((p) =>
            p.id === productId
              ? {
                  ...p,
                  is_active: isActive,
                }
              : p,
          ),
        )
      }

      return { previousProducts }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData(ADMIN_PRODUCTS_QUERY_KEY, context.previousProducts)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_PRODUCTS_QUERY_KEY })
    },
  })
}

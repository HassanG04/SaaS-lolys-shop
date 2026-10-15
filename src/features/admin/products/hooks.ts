import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { AppError } from '@/lib/errors'
import {
  getAdminProducts,
  getAdminCategories,
  getAdminProductById,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  archiveAdminProduct,
  restoreAdminProduct,
  updateProductStock,
  updateProductActive,
  updateAdminProductId,
  quickUpdateAdminProduct,
} from './api'
import type { ProductInputForm } from './payloadBuilder'
import type {
  AdminProduct,
  AdminCategorySummary,
  UpdateProductStockParams,
  UpdateProductActiveParams,
  UpdateProductIdParams,
  QuickProductUpdateParams,
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

export function useAdminProduct(productId: number | undefined) {
  return useQuery<AdminProduct, AppError>({
    queryKey: ['admin', 'product', productId],
    queryFn: () => {
      if (!productId) {
        throw new Error('Product ID is required')
      }
      return getAdminProductById(productId)
    },
    enabled: typeof productId === 'number' && !Number.isNaN(productId) && productId > 0,
    staleTime: 30 * 1000,
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation<AdminProduct, AppError, ProductInputForm>({
    mutationFn: (data) => createAdminProduct(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_PRODUCTS_QUERY_KEY })
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()

  return useMutation<
    AdminProduct,
    AppError,
    { productId: number; formData: Partial<ProductInputForm> }
  >({
    mutationFn: ({ productId, formData }) => updateAdminProduct(productId, formData),
    onSuccess: (updatedProduct) => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_PRODUCTS_QUERY_KEY })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'product', updatedProduct.id] })
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()

  return useMutation<void, AppError, number>({
    mutationFn: (productId) => deleteAdminProduct(productId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_PRODUCTS_QUERY_KEY })
    },
  })
}

export function useArchiveProduct() {
  const queryClient = useQueryClient()

  return useMutation<AdminProduct, AppError, number>({
    mutationFn: (productId) => archiveAdminProduct(productId),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_PRODUCTS_QUERY_KEY })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'product', updated.id] })
    },
  })
}

export function useRestoreProduct() {
  const queryClient = useQueryClient()

  return useMutation<AdminProduct, AppError, number>({
    mutationFn: (productId) => restoreAdminProduct(productId),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_PRODUCTS_QUERY_KEY })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'product', updated.id] })
    },
  })
}

export function useUpdateProductId() {
  const queryClient = useQueryClient()

  return useMutation<void, AppError, UpdateProductIdParams>({
    mutationFn: ({ oldId, newId }) => updateAdminProductId(oldId, newId),
    onSuccess: (_, { oldId, newId }) => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_PRODUCTS_QUERY_KEY })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'product', oldId] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'product', newId] })
    },
  })
}

export function useQuickUpdateProduct() {
  const queryClient = useQueryClient()

  return useMutation<AdminProduct, AppError, QuickProductUpdateParams>({
    mutationFn: (params) => quickUpdateAdminProduct(params),
    onSuccess: (updatedProduct, { productId, newId }) => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_PRODUCTS_QUERY_KEY })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'product', productId] })
      if (newId && newId !== productId) {
        void queryClient.invalidateQueries({ queryKey: ['admin', 'product', newId] })
      }
      void queryClient.invalidateQueries({ queryKey: ['admin', 'product', updatedProduct.id] })
    },
  })
}

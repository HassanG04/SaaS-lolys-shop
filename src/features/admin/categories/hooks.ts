import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { AppError } from '@/lib/errors'
import {
  getAdminCategoriesWithCount,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
  reorderAdminCategories,
} from './api'
import type { AdminCategory, CategoryCreateData, CategoryUpdateData } from './types'

export type AdminCategoryWithCount = AdminCategory & { product_count: number }

export const ADMIN_CATEGORIES_FULL_KEY = ['admin', 'categories-full'] as const

export function useAdminCategoriesFull() {
  return useQuery<AdminCategoryWithCount[], AppError>({
    queryKey: ADMIN_CATEGORIES_FULL_KEY,
    queryFn: getAdminCategoriesWithCount,
    staleTime: 30 * 1000,
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation<AdminCategory, AppError, CategoryCreateData>({
    mutationFn: createAdminCategory,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_CATEGORIES_FULL_KEY })
      // Also invalidate products-page category filter list
      void queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] })
    },
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()

  return useMutation<AdminCategory, AppError, { categoryId: number; data: CategoryUpdateData }>({
    mutationFn: ({ categoryId, data }) => updateAdminCategory(categoryId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_CATEGORIES_FULL_KEY })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] })
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()

  return useMutation<void, AppError, { categoryId: number; moveToId?: number | null }>({
    mutationFn: ({ categoryId, moveToId }) => deleteAdminCategory(categoryId, moveToId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_CATEGORIES_FULL_KEY })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] })
    },
  })
}

export function useReorderCategories() {
  const queryClient = useQueryClient()

  return useMutation<void, AppError, number[], { previous?: AdminCategoryWithCount[] }>({
    mutationFn: reorderAdminCategories,
    onMutate: async (orderedIds) => {
      await queryClient.cancelQueries({ queryKey: ADMIN_CATEGORIES_FULL_KEY })
      const previous = queryClient.getQueryData<AdminCategoryWithCount[]>(ADMIN_CATEGORIES_FULL_KEY)

      if (previous) {
        const byId = new Map(previous.map((c) => [c.id, c]))
        const reordered = orderedIds
          .map((id, idx) => {
            const cat = byId.get(id)
            return cat ? { ...cat, sort_order: idx } : null
          })
          .filter((c): c is AdminCategoryWithCount => c !== null)

        queryClient.setQueryData<AdminCategoryWithCount[]>(ADMIN_CATEGORIES_FULL_KEY, reordered)
      }

      return { previous }
    },
    onError: (_err, _ids, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(ADMIN_CATEGORIES_FULL_KEY, ctx.previous)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_CATEGORIES_FULL_KEY })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] })
    },
  })
}

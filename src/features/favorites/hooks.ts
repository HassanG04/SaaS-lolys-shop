import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getFavoritesApi, getFavoriteProductIdsApi, addFavoriteApi, removeFavoriteApi } from './api'
import type { FavoriteItem } from './types'
import type { Product } from '@/features/catalog/types'

export const FAVORITES_QUERY_KEY = ['favorites'] as const
export const FAVORITE_IDS_QUERY_KEY = ['favorite-ids'] as const

export function useFavorites(userId?: string | null) {
  return useQuery({
    queryKey: FAVORITES_QUERY_KEY,
    queryFn: getFavoritesApi,
    enabled: Boolean(userId),
    staleTime: 1000 * 60,
  })
}

export function useFavoriteIds(userId?: string | null) {
  return useQuery({
    queryKey: FAVORITE_IDS_QUERY_KEY,
    queryFn: getFavoriteProductIdsApi,
    enabled: Boolean(userId),
    staleTime: 1000 * 60,
  })
}

export interface ToggleFavoriteContext {
  previousIds?: number[]
  previousFavorites?: FavoriteItem[]
}

export function useToggleFavorite(userId?: string | null) {
  const queryClient = useQueryClient()

  return useMutation<
    void,
    Error,
    { productId: number; product?: Product; willFavorite: boolean },
    ToggleFavoriteContext
  >({
    mutationFn: async ({ productId, willFavorite }) => {
      if (!userId) {
        throw new Error('User not authenticated')
      }
      if (willFavorite) {
        await addFavoriteApi(userId, productId)
      } else {
        await removeFavoriteApi(userId, productId)
      }
    },
    onMutate: async ({ productId, product, willFavorite }) => {
      await queryClient.cancelQueries({ queryKey: FAVORITE_IDS_QUERY_KEY })
      await queryClient.cancelQueries({ queryKey: FAVORITES_QUERY_KEY })

      const previousIds = queryClient.getQueryData<number[]>(FAVORITE_IDS_QUERY_KEY)
      const previousFavorites = queryClient.getQueryData<FavoriteItem[]>(FAVORITES_QUERY_KEY)

      queryClient.setQueryData<number[]>(FAVORITE_IDS_QUERY_KEY, (old = []) => {
        if (willFavorite) {
          return old.includes(productId) ? old : [...old, productId]
        }
        return old.filter((id) => id !== productId)
      })

      if (previousFavorites !== undefined) {
        queryClient.setQueryData<FavoriteItem[]>(FAVORITES_QUERY_KEY, (old = []) => {
          if (willFavorite) {
            if (old.some((item) => item.product_id === productId)) return old
            if (product) {
              const newItem: FavoriteItem = {
                product_id: productId,
                created_at: new Date().toISOString(),
                product,
              }
              return [newItem, ...old]
            }
            return old
          }
          return old.filter((item) => item.product_id !== productId)
        })
      }

      return { previousIds, previousFavorites }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousIds !== undefined) {
        queryClient.setQueryData(FAVORITE_IDS_QUERY_KEY, context.previousIds)
      }
      if (context?.previousFavorites !== undefined) {
        queryClient.setQueryData(FAVORITES_QUERY_KEY, context.previousFavorites)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: FAVORITE_IDS_QUERY_KEY })
      void queryClient.invalidateQueries({ queryKey: FAVORITES_QUERY_KEY })
    },
  })
}

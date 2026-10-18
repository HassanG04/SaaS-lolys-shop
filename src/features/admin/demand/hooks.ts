import { useQuery } from '@tanstack/react-query'
import { adminFetchWishlistDemandApi } from './api'
import type { WishlistDemandItem } from './types'

export const WISHLIST_DEMAND_KEY = ['admin_wishlist_demand']

export function useWishlistDemand() {
  return useQuery<WishlistDemandItem[]>({
    queryKey: WISHLIST_DEMAND_KEY,
    queryFn: adminFetchWishlistDemandApi,
    staleTime: 60_000,
  })
}

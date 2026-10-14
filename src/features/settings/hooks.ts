import { useQuery } from '@tanstack/react-query'
import { getPublicSettings } from './api'
import type { PublicShopSettings } from './types'

export const SETTINGS_QUERY_KEY = ['settings', 'public'] as const

/**
 * Hook to retrieve public shop settings for storefront banners, contact info, returns and hero.
 */
export function usePublicSettings() {
  return useQuery<PublicShopSettings>({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: getPublicSettings,
    staleTime: 5 * 60 * 1000,
  })
}

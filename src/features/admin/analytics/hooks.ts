import { useQuery } from '@tanstack/react-query'
import { getAdminAnalyticsInsights } from './api'
import type { AnalyticsInsightsPayload } from './types'

export function useAnalyticsInsights() {
  return useQuery<AnalyticsInsightsPayload, Error>({
    queryKey: ['admin', 'analytics-insights'],
    queryFn: getAdminAnalyticsInsights,
    staleTime: 5 * 60 * 1000,
  })
}

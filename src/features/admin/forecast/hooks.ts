import { useQuery } from '@tanstack/react-query'
import {
  getAdminForecasts,
  getAdminReorderList,
  getForecastCategories,
  getForecastProducts,
} from './api'
import type {
  ForecastCategoryOption,
  ForecastProductOption,
  ForecastResponse,
  ReorderItem,
  SeriesType,
} from './types'

export function useAdminForecasts(
  seriesType: SeriesType,
  seriesId: number | null = null,
  runId: number | null = null,
) {
  return useQuery<ForecastResponse, Error>({
    queryKey: ['admin', 'forecasts', seriesType, seriesId, runId],
    queryFn: () => getAdminForecasts(seriesType, seriesId, runId),
    staleTime: 5 * 60 * 1000,
  })
}

export function useAdminReorderList(leadTimeDays: number = 7, serviceZ: number = 1.28) {
  return useQuery<ReorderItem[], Error>({
    queryKey: ['admin', 'reorder-list', leadTimeDays, serviceZ],
    queryFn: () => getAdminReorderList(leadTimeDays, serviceZ),
    staleTime: 5 * 60 * 1000,
  })
}

export function useForecastCategories() {
  return useQuery<ForecastCategoryOption[], Error>({
    queryKey: ['admin', 'forecast', 'categories'],
    queryFn: getForecastCategories,
    staleTime: 10 * 60 * 1000,
  })
}

export function useForecastProducts() {
  return useQuery<ForecastProductOption[], Error>({
    queryKey: ['admin', 'forecast', 'products'],
    queryFn: getForecastProducts,
    staleTime: 10 * 60 * 1000,
  })
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  dismissAdminOccasionReminder,
  generateAdminOccasionReminders,
  getAdminForecasts,
  getAdminOccasionReminders,
  getAdminReorderList,
  getForecastCategories,
  getForecastProducts,
  getUpcomingOccasions,
} from './api'
import type {
  AdminOccasionReminder,
  ForecastCategoryOption,
  ForecastProductOption,
  ForecastResponse,
  ReorderItem,
  SeriesType,
  UpcomingOccasion,
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

export function useUpcomingOccasions(daysAhead: number = 120) {
  return useQuery<UpcomingOccasion[], Error>({
    queryKey: ['admin', 'occasions', daysAhead],
    queryFn: () => getUpcomingOccasions(daysAhead),
    staleTime: 10 * 60 * 1000,
  })
}

export function useAdminOccasionReminders() {
  return useQuery<AdminOccasionReminder[], Error>({
    queryKey: ['admin', 'occasion-reminders'],
    queryFn: getAdminOccasionReminders,
    staleTime: 60 * 1000,
  })
}

export function useDismissAdminOccasionReminder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (reminderId: string) => dismissAdminOccasionReminder(reminderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'occasion-reminders'] })
    },
  })
}

export function useGenerateAdminOccasionReminders() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (advanceDays?: number) => generateAdminOccasionReminders(advanceDays),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'occasion-reminders'] })
    },
  })
}

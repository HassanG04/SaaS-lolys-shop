import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getCustomerStatsApi, updateProfileApi } from './api'
import type { CustomerStats, UpdateProfileInput } from './types'

export function useCustomerStats(enabled = true) {
  return useQuery<CustomerStats>({
    queryKey: ['customer_stats'],
    queryFn: getCustomerStatsApi,
    enabled,
    staleTime: 60 * 1000,
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UpdateProfileInput }) =>
      updateProfileApi(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer_stats'] })
    },
  })
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getMyOrdersApi, cancelMyOrderApi } from './api'
import type { CustomerOrder } from './types'
import type { AppError } from '@/lib/errors'

export function useMyOrders() {
  return useQuery<CustomerOrder[], AppError>({
    queryKey: ['my_orders'],
    queryFn: getMyOrdersApi,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: (query) =>
      query.state.data?.some((order) => order.status === 'pending' || order.status === 'confirmed')
        ? 10_000
        : false,
  })
}

export function useCancelOrder() {
  const queryClient = useQueryClient()

  return useMutation<void, AppError, number>({
    mutationFn: (orderId: number) => cancelMyOrderApi(orderId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my_orders'] })
    },
  })
}

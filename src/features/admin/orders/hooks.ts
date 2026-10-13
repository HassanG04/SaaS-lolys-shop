import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getAdminOrders,
  getAdminOrderById,
  updateAdminOrderStatus,
  updateAdminOrderFulfillment,
} from './api'
import type {
  AdminOrder,
  AdminOrderFilters,
  UpdateOrderStatusPayload,
  UpdateFulfillmentPayload,
} from './types'

export function useAdminOrders(filters?: AdminOrderFilters) {
  return useQuery<AdminOrder[]>({
    queryKey: ['admin-orders', filters],
    queryFn: () => getAdminOrders(filters),
  })
}

export function useAdminOrder(id: number | null) {
  return useQuery<AdminOrder | null>({
    queryKey: ['admin-order', id],
    queryFn: () => (id !== null ? getAdminOrderById(id) : null),
    enabled: id !== null,
  })
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()

  return useMutation<AdminOrder, unknown, { id: number; payload: UpdateOrderStatusPayload }>({
    mutationFn: ({ id, payload }) => updateAdminOrderStatus(id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
      queryClient.setQueryData(['admin-order', updated.id], updated)
    },
  })
}

export function useUpdateOrderFulfillment() {
  const queryClient = useQueryClient()

  return useMutation<AdminOrder, unknown, { id: number; payload: UpdateFulfillmentPayload }>({
    mutationFn: ({ id, payload }) => updateAdminOrderFulfillment(id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
      queryClient.setQueryData(['admin-order', updated.id], updated)
    },
  })
}

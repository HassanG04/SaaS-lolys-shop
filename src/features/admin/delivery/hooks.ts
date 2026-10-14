import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getGovernorates } from '@/features/delivery/api'
import type { DeliveryMethod, Governorate } from '@/features/delivery/types'
import { getAllDeliveryFees, upsertDeliveryFee, deleteDeliveryFee } from './api'
import type { DeliveryFeeRow, GovernorateDeliveryGridRow } from './types'

export const ADMIN_DELIVERY_FEES_QUERY_KEY = ['admin', 'delivery-fees'] as const

export function useAdminDeliveryData() {
  const governoratesQuery = useQuery<Governorate[], Error>({
    queryKey: ['governorates'],
    queryFn: getGovernorates,
    staleTime: 5 * 60 * 1000,
  })

  const feesQuery = useQuery<DeliveryFeeRow[], Error>({
    queryKey: ADMIN_DELIVERY_FEES_QUERY_KEY,
    queryFn: getAllDeliveryFees,
    staleTime: 60 * 1000,
  })

  const isLoading = governoratesQuery.isLoading || feesQuery.isLoading
  const error = governoratesQuery.error || feesQuery.error

  const feeMap = new Map<string, number>()
  if (feesQuery.data) {
    for (const row of feesQuery.data) {
      feeMap.set(`${row.governorate_id}:${row.method}`, row.fee)
    }
  }

  const gridRows: GovernorateDeliveryGridRow[] = (governoratesQuery.data ?? []).map((gov) => {
    const fees: Partial<Record<DeliveryMethod, number>> = {}
    const egyptPostFee = feeMap.get(`${gov.id}:egypt_post`)
    if (egyptPostFee !== undefined) {
      fees.egypt_post = egyptPostFee
    }
    const representativeFee = feeMap.get(`${gov.id}:representative`)
    if (representativeFee !== undefined) {
      fees.representative = representativeFee
    }
    return {
      governorate: gov,
      fees,
    }
  })

  const refetch = async () => {
    await Promise.all([governoratesQuery.refetch(), feesQuery.refetch()])
  }

  return {
    governorates: governoratesQuery.data ?? [],
    fees: feesQuery.data ?? [],
    gridRows,
    isLoading,
    error,
    refetch,
  }
}

export function useUpsertDeliveryFee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      governorateId,
      method,
      fee,
    }: {
      governorateId: number
      method: DeliveryMethod
      fee: number
    }) => upsertDeliveryFee(governorateId, method, fee),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_DELIVERY_FEES_QUERY_KEY })
      void queryClient.invalidateQueries({ queryKey: ['delivery-fees'] })
    },
  })
}

export function useDeleteDeliveryFee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ governorateId, method }: { governorateId: number; method: DeliveryMethod }) =>
      deleteDeliveryFee(governorateId, method),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_DELIVERY_FEES_QUERY_KEY })
      void queryClient.invalidateQueries({ queryKey: ['delivery-fees'] })
    },
  })
}

import { useQuery } from '@tanstack/react-query'
import { getGovernorates, getDeliveryFees } from './api'
import type { Governorate, DeliveryFeeOption } from './types'

export function useGovernorates() {
  return useQuery<Governorate[], Error>({
    queryKey: ['governorates'],
    queryFn: getGovernorates,
    staleTime: 60 * 60 * 1000, // Reference data: 1 hour cache
  })
}

export function useDeliveryFees(governorateId?: number | null) {
  return useQuery<DeliveryFeeOption[], Error>({
    queryKey: ['delivery_fees', governorateId],
    queryFn: () => (governorateId ? getDeliveryFees(governorateId) : Promise.resolve([])),
    enabled: typeof governorateId === 'number' && governorateId > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

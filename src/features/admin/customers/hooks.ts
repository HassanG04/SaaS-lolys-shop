import { useQuery } from '@tanstack/react-query'
import { getCustomerStats } from './api'
import type { CustomerStat } from './types'

export function useCustomerStats() {
  return useQuery<CustomerStat[], Error>({
    queryKey: ['admin', 'customers'],
    queryFn: getCustomerStats,
    staleTime: 60 * 1000,
  })
}

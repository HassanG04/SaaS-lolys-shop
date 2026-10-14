import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getAdminPaymentOrders, getSignedProofUrl, adminReviewPayment, purgeOldProofs } from './api'
import type {
  AdminPaymentOrder,
  PaymentReviewFilter,
  ReviewPaymentPayload,
  PurgeProofsResult,
} from './types'

export function useAdminPaymentOrders(filters?: PaymentReviewFilter) {
  return useQuery<AdminPaymentOrder[]>({
    queryKey: ['admin-payment-orders', filters],
    queryFn: () => getAdminPaymentOrders(filters),
  })
}

export function useSignedProofUrl(proofPath: string | null, enabled: boolean) {
  return useQuery<string>({
    queryKey: ['payment-proof-signed-url', proofPath],
    queryFn: () => (proofPath ? getSignedProofUrl(proofPath, 60) : Promise.reject()),
    enabled: Boolean(proofPath) && enabled,
    staleTime: 45 * 1000, // consider fresh for 45s of the 60s validity window
    gcTime: 60 * 1000,
  })
}

export function useReviewPayment() {
  const queryClient = useQueryClient()

  return useMutation<void, unknown, ReviewPaymentPayload>({
    mutationFn: (payload) => adminReviewPayment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payment-orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })
    },
  })
}

export function usePurgeOldProofs() {
  const queryClient = useQueryClient()

  return useMutation<PurgeProofsResult, unknown, number | undefined>({
    mutationFn: (days) => purgeOldProofs(days),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payment-orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
    },
  })
}

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getOrderPaymentDetailsApi, submitPaymentProofApi, uploadPaymentProofApi } from './api'
import { reencodeImage, validateProofFile } from './fileValidation'
import { AppError } from '@/lib/errors'
import type { OrderPaymentDetails, SupportedProofExt, SupportedProofMime } from './types'

export function useOrderPaymentDetails(orderId: number | undefined) {
  return useQuery<OrderPaymentDetails, AppError>({
    queryKey: ['order-payment', orderId],
    queryFn: () => {
      if (!orderId || isNaN(orderId)) {
        throw new AppError('ORD-009')
      }
      return getOrderPaymentDetailsApi(orderId)
    },
    enabled: Boolean(orderId && !isNaN(orderId)),
    staleTime: 10_000,
    refetchInterval: (query) => {
      // Auto-poll while awaiting confirmation or under review
      const status = query.state.data?.payment_status
      return status === 'awaiting_proof' || status === 'under_review' ? 10_000 : false
    },
  })
}

export interface SubmitProofParams {
  userId: string
  orderId: number
  reference: string
  file: File
}

export function useSubmitPaymentProof() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, orderId, reference, file }: SubmitProofParams) => {
      // 1. Client-side signature and size validation
      const validation = await validateProofFile(file)
      if (!validation.ok) {
        throw new AppError(validation.code)
      }

      // 2. Browser re-encoding to strip EXIF and other metadata
      const reencodedBlob = await reencodeImage(file, 'image/jpeg', 0.85)

      // 3. Upload to private storage
      const storagePath = await uploadPaymentProofApi(
        userId,
        orderId,
        reencodedBlob,
        'image/jpeg' as SupportedProofMime,
        'jpg' as SupportedProofExt,
      )

      // 4. Submit proof via RPC
      await submitPaymentProofApi({
        orderId,
        reference,
        proofPath: storagePath,
      })

      return storagePath
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['order-payment', variables.orderId] })
      void queryClient.invalidateQueries({ queryKey: ['my-orders'] })
    },
  })
}

function getRemainingSeconds(deadline: string | null | undefined): number {
  if (!deadline) return 0
  const diff = Math.floor((new Date(deadline).getTime() - Date.now()) / 1000)
  return Math.max(0, diff)
}

/**
 * Live countdown hook for payment deadlines.
 */
export function usePaymentCountdown(deadline: string | null | undefined) {
  const [prevDeadline, setPrevDeadline] = useState(deadline)
  const [secondsRemaining, setSecondsRemaining] = useState(() => getRemainingSeconds(deadline))

  if (deadline !== prevDeadline) {
    setPrevDeadline(deadline)
    setSecondsRemaining(getRemainingSeconds(deadline))
  }

  useEffect(() => {
    if (!deadline) return

    const timer = setInterval(() => {
      setSecondsRemaining(getRemainingSeconds(deadline))
    }, 1000)

    return () => clearInterval(timer)
  }, [deadline])

  const isExpired = Boolean(deadline && secondsRemaining <= 0)
  const hours = Math.floor(secondsRemaining / 3600)
  const minutes = Math.floor((secondsRemaining % 3600) / 60)
  const seconds = secondsRemaining % 60

  const formatted =
    hours > 0
      ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  return {
    secondsRemaining,
    isExpired,
    formatted,
    hours,
    minutes,
    seconds,
  }
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getCustomerStatsApi, updateProfileApi, uploadAvatarApi, removeAvatarApi } from './api'
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

export function useUploadAvatar() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      userId,
      file,
      oldAvatarPath,
    }: {
      userId: string
      file: File | Blob
      oldAvatarPath?: string | null
    }) => uploadAvatarApi(userId, file, oldAvatarPath),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}

export function useRemoveAvatar() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      userId,
      currentAvatarPath,
    }: {
      userId: string
      currentAvatarPath?: string | null
    }) => removeAvatarApi(userId, currentAvatarPath),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAdminSettings,
  updateAdminSetting,
  uploadInstaPayQrImage,
  getRecentSettingsAudit,
} from './api'
import type { ShopSettingsMap, UpdateSettingPayload } from './types'

export const ADMIN_SETTINGS_QUERY_KEY = ['settings', 'admin'] as const
export const PUBLIC_SETTINGS_QUERY_KEY = ['settings', 'public'] as const
export const SETTINGS_AUDIT_QUERY_KEY = ['audit_log', 'shop_settings'] as const

export function useAdminSettings() {
  return useQuery<ShopSettingsMap>({
    queryKey: ADMIN_SETTINGS_QUERY_KEY,
    queryFn: getAdminSettings,
    staleTime: 60 * 1000,
  })
}

export function useUpdateAdminSetting() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ key, value }: UpdateSettingPayload) => {
      await updateAdminSetting(key, value)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_SETTINGS_QUERY_KEY })
      void queryClient.invalidateQueries({ queryKey: PUBLIC_SETTINGS_QUERY_KEY })
      void queryClient.invalidateQueries({ queryKey: SETTINGS_AUDIT_QUERY_KEY })
    },
  })
}

export function useUploadInstaPayQr() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      file,
      previousPath,
    }: {
      file: File | Blob
      previousPath?: string | null
    }) => {
      return await uploadInstaPayQrImage(file, previousPath)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_SETTINGS_QUERY_KEY })
      void queryClient.invalidateQueries({ queryKey: PUBLIC_SETTINGS_QUERY_KEY })
      void queryClient.invalidateQueries({ queryKey: SETTINGS_AUDIT_QUERY_KEY })
    },
  })
}

export function useRecentSettingsAudit() {
  return useQuery({
    queryKey: SETTINGS_AUDIT_QUERY_KEY,
    queryFn: getRecentSettingsAudit,
    staleTime: 30 * 1000,
  })
}

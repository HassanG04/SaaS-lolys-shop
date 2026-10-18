import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { getCustomerStatsApi, updateProfileApi, uploadAvatarApi, removeAvatarApi } from './api'
import { useCustomerStats, useUpdateProfile, useUploadAvatar, useRemoveAvatar } from './hooks'
import {
  detectAvatarSignature,
  validateAvatarFile,
  generateAvatarStoragePath,
} from './avatarUpload'
import { supabase } from '@/lib/supabase'
import { AppError } from '@/lib/errors'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    storage: {
      from: vi.fn(),
    },
  },
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('Customer Account Feature (T-4.04 & T-2.11)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCustomerStatsApi', () => {
    it('fetches and normalizes stats from customer_stats view', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            orders_count: 5,
            total_spent: 1250.5,
            favorite_product_id: 42,
            favorite_product_name: 'خاتم فضة إسترليني',
          },
          error: null,
        }),
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as unknown as ReturnType<typeof supabase.from>)

      const result = await getCustomerStatsApi()

      expect(supabase.from).toHaveBeenCalledWith('customer_stats')
      expect(mockSelect).toHaveBeenCalledWith(
        'orders_count, total_spent, favorite_product_id, favorite_product_name',
      )
      expect(result).toEqual({
        orders_count: 5,
        total_spent: 1250.5,
        favorite_product_id: 42,
        favorite_product_name: 'خاتم فضة إسترليني',
      })
    })

    it('defaults missing or zero values gracefully', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as unknown as ReturnType<typeof supabase.from>)

      const result = await getCustomerStatsApi()
      expect(result).toEqual({
        orders_count: 0,
        total_spent: 0,
        favorite_product_id: null,
        favorite_product_name: null,
      })
    })

    it('throws AppError on database query failure', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Network error', code: 'PGRST301' },
        }),
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as unknown as ReturnType<typeof supabase.from>)

      await expect(getCustomerStatsApi()).rejects.toThrow()
    })
  })

  describe('updateProfileApi', () => {
    it('updates allowed profile columns without touching role', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as unknown as ReturnType<typeof supabase.from>)

      await updateProfileApi('user-123', {
        full_name: '  سارة أحمد  ',
        phone: '01012345678',
        alt_phone: '01198765432',
        governorate_id: 1,
        city: 'المنصورة',
        district: 'حي الجامعة',
        address: 'شارع الجمهورية',
        postal_code: '35511',
        floor: '4',
        apartment: '12',
        landmark: 'أمام الجامعة',
      })

      expect(supabase.from).toHaveBeenCalledWith('profiles')
      expect(mockUpdate).toHaveBeenCalledWith({
        full_name: 'سارة أحمد',
        phone: '01012345678',
        alt_phone: '01198765432',
        governorate_id: 1,
        city: 'المنصورة',
        district: 'حي الجامعة',
        address: 'شارع الجمهورية',
        postal_code: '35511',
        floor: '4',
        apartment: '12',
        landmark: 'أمام الجامعة',
      })
      expect(mockEq).toHaveBeenCalledWith('id', 'user-123')

      // Strictly verify no role key in update payload
      const payload = mockUpdate.mock.calls[0][0]
      expect(payload).not.toHaveProperty('role')
    })
  })

  describe('Avatar Validation & Path Generation (T-2.11)', () => {
    it('detects valid JPEG magic bytes', () => {
      const bytes = new Uint8Array([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      ])
      expect(detectAvatarSignature(bytes)).toEqual({
        mimeType: 'image/jpeg',
        extension: 'jpg',
      })
    })

    it('detects valid PNG magic bytes', () => {
      const bytes = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      ])
      expect(detectAvatarSignature(bytes)).toEqual({
        mimeType: 'image/png',
        extension: 'png',
      })
    })

    it('detects valid WebP magic bytes', () => {
      const bytes = new Uint8Array([
        0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
      ])
      expect(detectAvatarSignature(bytes)).toEqual({
        mimeType: 'image/webp',
        extension: 'webp',
      })
    })

    it('rejects text, SVG, or invalid signatures', () => {
      const textBytes = new Uint8Array(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg">'))
      expect(detectAvatarSignature(textBytes)).toBeNull()
    })

    it('throws AppError(UPL-002) when file exceeds 2 MB', async () => {
      const bigBlob = new Blob([new Uint8Array(2 * 1024 * 1024 + 10)])
      await expect(validateAvatarFile(bigBlob)).rejects.toThrow(
        expect.objectContaining({ code: 'UPL-002' }),
      )
    })

    it('throws AppError(UPL-001) for corrupted or non-image files', async () => {
      const textBlob = new Blob(['Not an image file'])
      await expect(validateAvatarFile(textBlob)).rejects.toThrow(
        expect.objectContaining({ code: 'UPL-001' }),
      )
    })

    it('generates user-scoped storage path without user-controlled names', () => {
      const path = generateAvatarStoragePath('user-abc-123', 'webp')
      expect(path).toMatch(/^user-abc-123\/[a-zA-Z0-9-]+\.webp$/)
    })
  })

  describe('uploadAvatarApi & removeAvatarApi (T-2.11)', () => {
    it('uploads validated avatar to storage and updates profile', async () => {
      const jpegBytes = new Uint8Array([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      ])
      const file = new File([jpegBytes], 'profile.jpg', { type: 'image/jpeg' })

      const mockUpload = vi.fn().mockResolvedValue({ error: null })
      const mockRemove = vi.fn().mockResolvedValue({ error: null })
      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload,
        remove: mockRemove,
      } as unknown as ReturnType<typeof supabase.storage.from>)

      const mockEq = vi.fn().mockResolvedValue({ error: null })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as unknown as ReturnType<typeof supabase.from>)

      const result = await uploadAvatarApi('u1', file, 'u1/old_pic.jpg')

      expect(supabase.storage.from).toHaveBeenCalledWith('avatars')
      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringMatching(/^u1\/[a-zA-Z0-9-]+\.jpg$/),
        expect.any(Blob),
        expect.objectContaining({ contentType: 'image/jpeg' }),
      )
      expect(supabase.from).toHaveBeenCalledWith('profiles')
      expect(mockUpdate).toHaveBeenCalledWith({ avatar_url: result })
      expect(mockEq).toHaveBeenCalledWith('id', 'u1')
      expect(mockRemove).toHaveBeenCalledWith(['u1/old_pic.jpg'])
    })

    it('rolls back uploaded storage object if profile update fails', async () => {
      const jpegBytes = new Uint8Array([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      ])
      const file = new File([jpegBytes], 'avatar.jpg', { type: 'image/jpeg' })

      const mockUpload = vi.fn().mockResolvedValue({ error: null })
      const mockRemove = vi.fn().mockResolvedValue({ error: null })
      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload,
        remove: mockRemove,
      } as unknown as ReturnType<typeof supabase.storage.from>)

      const mockEq = vi.fn().mockResolvedValue({
        error: { message: 'Database error', code: '42501' },
      })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as unknown as ReturnType<typeof supabase.from>)

      await expect(uploadAvatarApi('u1', file)).rejects.toThrow(AppError)
      expect(mockRemove).toHaveBeenCalledWith([expect.stringMatching(/^u1\//)])
    })

    it('removeAvatarApi clears avatar_url and purges storage object', async () => {
      const mockRemove = vi.fn().mockResolvedValue({ error: null })
      vi.mocked(supabase.storage.from).mockReturnValue({
        remove: mockRemove,
      } as unknown as ReturnType<typeof supabase.storage.from>)

      const mockEq = vi.fn().mockResolvedValue({ error: null })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as unknown as ReturnType<typeof supabase.from>)

      await removeAvatarApi('u1', 'u1/current.webp')

      expect(supabase.from).toHaveBeenCalledWith('profiles')
      expect(mockUpdate).toHaveBeenCalledWith({ avatar_url: null })
      expect(mockEq).toHaveBeenCalledWith('id', 'u1')
      expect(supabase.storage.from).toHaveBeenCalledWith('avatars')
      expect(mockRemove).toHaveBeenCalledWith(['u1/current.webp'])
    })
  })

  describe('useCustomerStats & useUpdateProfile hooks', () => {
    it('useCustomerStats hook queries customer stats successfully', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            orders_count: 3,
            total_spent: 450,
            favorite_product_id: null,
            favorite_product_name: null,
          },
          error: null,
        }),
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as unknown as ReturnType<typeof supabase.from>)

      const { result } = renderHook(() => useCustomerStats(true), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data?.total_spent).toBe(450)
    })

    it('useUpdateProfile mutates profile successfully', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as unknown as ReturnType<typeof supabase.from>)

      const { result } = renderHook(() => useUpdateProfile(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({
        userId: 'u1',
        data: {
          full_name: 'نور',
          phone: '01011111111',
          alt_phone: null,
          governorate_id: null,
          city: null,
          district: null,
          address: null,
          postal_code: null,
          floor: null,
          apartment: null,
          landmark: null,
        },
      })

      expect(supabase.from).toHaveBeenCalledWith('profiles')
    })

    it('useUploadAvatar and useRemoveAvatar hooks trigger mutations', async () => {
      const mockUpload = vi.fn().mockResolvedValue({ error: null })
      const mockRemove = vi.fn().mockResolvedValue({ error: null })
      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload,
        remove: mockRemove,
      } as unknown as ReturnType<typeof supabase.storage.from>)

      const mockEq = vi.fn().mockResolvedValue({ error: null })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as unknown as ReturnType<typeof supabase.from>)

      const { result: uploadHook } = renderHook(() => useUploadAvatar(), {
        wrapper: createWrapper(),
      })
      const { result: removeHook } = renderHook(() => useRemoveAvatar(), {
        wrapper: createWrapper(),
      })

      const jpegBytes = new Uint8Array([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      ])
      const file = new File([jpegBytes], 'pic.jpg', { type: 'image/jpeg' })

      await uploadHook.current.mutateAsync({
        userId: 'u1',
        file,
      })
      expect(mockUpload).toHaveBeenCalled()

      await removeHook.current.mutateAsync({
        userId: 'u1',
        currentAvatarPath: 'u1/pic.jpg',
      })
      expect(mockRemove).toHaveBeenCalledWith(['u1/pic.jpg'])
    })
  })
})

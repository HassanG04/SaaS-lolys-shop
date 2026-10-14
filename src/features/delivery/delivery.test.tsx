import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSupabase } from '../../lib/supabase'
import {
  getGovernorates,
  getDeliveryFees,
  useGovernorates,
  useDeliveryFees,
  DELIVERY_METHOD_NAMES,
} from './index'

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
}

function createWrapper() {
  const queryClient = createTestQueryClient()
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

type FromReturn = ReturnType<ReturnType<typeof getSupabase>['from']>

describe('Delivery options API and hooks (T-4.01)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('getGovernorates', () => {
    it('fetches governorates and sorts with Arabic names first', async () => {
      const mockGovernorates = [
        { id: 1, name_ar: 'القاهرة', name_en: 'Cairo' },
        { id: 2, name_ar: 'الجيزة', name_en: 'Giza' },
        { id: 3, name_ar: 'الإسكندرية', name_en: 'Alexandria' },
        { id: 4, name_ar: 'أسوان', name_en: 'Aswan' },
      ]

      const fromSpy = vi.spyOn(getSupabase(), 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockGovernorates,
            error: null,
          }),
        }),
      } as unknown as FromReturn)

      const result = await getGovernorates()

      expect(fromSpy).toHaveBeenCalledWith('governorates')
      expect(result).toHaveLength(4)
      // Sorted with Arabic alphabetical order (أسوان first, then الإسكندرية, etc.)
      expect(result[0].name_ar).toBe('أسوان')
      expect(result[1].name_ar).toBe('الإسكندرية')
      expect(result[2].name_ar).toBe('الجيزة')
      expect(result[3].name_ar).toBe('القاهرة')
    })

    it('throws descriptive error when Supabase query fails', async () => {
      vi.spyOn(getSupabase(), 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database unreachable' },
          }),
        }),
      } as unknown as FromReturn)

      await expect(getGovernorates()).rejects.toThrow(
        'Failed to load governorates: Database unreachable',
      )
    })
  })

  describe('getDeliveryFees', () => {
    it('fetches delivery methods and fees for a governorate with labels', async () => {
      const mockFees = [
        { governorate_id: 1, method: 'representative' as const, fee: 50 },
        { governorate_id: 1, method: 'egypt_post' as const, fee: 35 },
      ]

      const fromSpy = vi.spyOn(getSupabase(), 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: mockFees,
            error: null,
          }),
        }),
      } as unknown as FromReturn)

      const result = await getDeliveryFees(1)

      expect(fromSpy).toHaveBeenCalledWith('delivery_fees')
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        governorate_id: 1,
        method: 'representative',
        fee: 50,
        label_ar: DELIVERY_METHOD_NAMES.representative.label_ar,
        label_en: DELIVERY_METHOD_NAMES.representative.label_en,
      })
      expect(result[1]).toEqual({
        governorate_id: 1,
        method: 'egypt_post',
        fee: 35,
        label_ar: DELIVERY_METHOD_NAMES.egypt_post.label_ar,
        label_en: DELIVERY_METHOD_NAMES.egypt_post.label_en,
      })
    })

    it('returns empty list for a governorate with no rows', async () => {
      vi.spyOn(getSupabase(), 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      } as unknown as FromReturn)

      const result = await getDeliveryFees(99)
      expect(result).toEqual([])
    })

    it('returns empty list for invalid or non-positive governorateId', async () => {
      const resultZero = await getDeliveryFees(0)
      expect(resultZero).toEqual([])

      const resultNegative = await getDeliveryFees(-5)
      expect(resultNegative).toEqual([])
    })

    it('throws descriptive error when delivery fee query fails', async () => {
      vi.spyOn(getSupabase(), 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Permission denied' },
          }),
        }),
      } as unknown as FromReturn)

      await expect(getDeliveryFees(1)).rejects.toThrow(
        'Failed to load delivery fees: Permission denied',
      )
    })
  })

  describe('React Query hooks', () => {
    it('useGovernorates resolves governorates successfully', async () => {
      const mockGovernorates = [
        { id: 1, name_ar: 'القاهرة', name_en: 'Cairo' },
        { id: 2, name_ar: 'الجيزة', name_en: 'Giza' },
      ]

      vi.spyOn(getSupabase(), 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockGovernorates,
            error: null,
          }),
        }),
      } as unknown as FromReturn)

      const { result } = renderHook(() => useGovernorates(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toHaveLength(2)
      expect(result.current.data?.[0].name_ar).toBe('الجيزة')
      expect(result.current.data?.[1].name_ar).toBe('القاهرة')
    })

    it('useDeliveryFees resolves delivery options for selected governorate', async () => {
      const mockFees = [{ governorate_id: 1, method: 'representative' as const, fee: 60 }]

      vi.spyOn(getSupabase(), 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: mockFees,
            error: null,
          }),
        }),
      } as unknown as FromReturn)

      const { result } = renderHook(() => useDeliveryFees(1), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toHaveLength(1)
      expect(result.current.data?.[0].fee).toBe(60)
      expect(result.current.data?.[0].method).toBe('representative')
    })

    it('useDeliveryFees returns empty list when governorate has no configured fees', async () => {
      vi.spyOn(getSupabase(), 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      } as unknown as FromReturn)

      const { result } = renderHook(() => useDeliveryFees(27), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual([])
    })

    it('useDeliveryFees remains idle/disabled when governorateId is undefined or null', () => {
      const { result } = renderHook(() => useDeliveryFees(null), {
        wrapper: createWrapper(),
      })

      expect(result.current.isFetching).toBe(false)
      expect(result.current.data).toBeUndefined()
    })
  })
})

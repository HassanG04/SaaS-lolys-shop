import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { getSupabase } from '@/lib/supabase'
import {
  dashboardDataSchema,
  getAdminDashboard,
  DashboardParseError,
  useAdminDashboard,
  getPresetDateRange,
  formatCairoDate,
  type DashboardData,
} from './index'

const validDashboardFixture: DashboardData = {
  range: {
    from: '2026-09-12',
    to: '2026-10-11',
  },
  kpis: {
    orders: 42,
    pending: 3,
    booked_total: 12500,
    delivered_total: 9800,
    avg_order: 297.62,
    awaiting_review: 2,
    paid_total: 9800,
  },
  daily: [
    {
      day: '2026-10-10',
      orders: 5,
      booked_total: 1500,
      delivered_total: 1200,
    },
    {
      day: '2026-10-11',
      orders: 8,
      booked_total: 2400,
      delivered_total: 2000,
    },
  ],
  by_status: {
    pending: 3,
    confirmed: 10,
    shipped: 12,
    delivered: 17,
  },
  by_method: [
    { method: 'egypt_post', orders: 25, total: 7500 },
    { method: 'representative', orders: 17, total: 5000 },
  ],
  by_governorate: [
    { governorate: 'القاهرة', orders: 20, total: 6000 },
    { governorate: 'الإسكندرية', orders: 15, total: 4500 },
    { governorate: 'الجيزة', orders: 7, total: 2000 },
  ],
  top_products: [
    { product_id: 1, name: 'سلسال لؤلؤ روز', units: 18, sales: 4500 },
    { product_id: 2, name: 'خاتم ذهبي مرصع', units: 12, sales: 3600 },
  ],
  top_customers: [
    { user_id: '00000000-0000-0000-0000-000000000001', name: 'سارة أحمد', orders: 6, total: 2400 },
    { user_id: '00000000-0000-0000-0000-000000000002', name: 'مريم علي', orders: 4, total: 1800 },
  ],
  low_stock: [
    { product_id: 3, name: 'أقراط عقيق', stock: 2 },
    { product_id: 4, name: 'سوار فراشة', stock: 1 },
  ],
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('Dashboard Data and Validation (T-6.01)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('Zod Schema Parsing', () => {
    it('successfully parses a complete valid dashboard payload', () => {
      const parsed = dashboardDataSchema.parse(validDashboardFixture)
      expect(parsed).toEqual(validDashboardFixture)
      expect(parsed.kpis.orders).toBe(42)
      expect(parsed.daily).toHaveLength(2)
      expect(parsed.top_products).toHaveLength(2)
    })

    it('defaults optional kpis (awaiting_review, paid_total) to 0 if omitted in SQL response', () => {
      const payloadWithoutOptionals = {
        ...validDashboardFixture,
        kpis: {
          orders: 10,
          pending: 1,
          booked_total: 3000,
          delivered_total: 2500,
          avg_order: 300,
        },
      }

      const parsed = dashboardDataSchema.parse(payloadWithoutOptionals)
      expect(parsed.kpis.awaiting_review).toBe(0)
      expect(parsed.kpis.paid_total).toBe(0)
    })

    it('rejects malformed payload with missing range', () => {
      const invalid = { ...validDashboardFixture, range: undefined }
      const result = dashboardDataSchema.safeParse(invalid)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('range'))).toBe(true)
      }
    })

    it('rejects malformed payload with negative values', () => {
      const invalid = {
        ...validDashboardFixture,
        kpis: {
          ...validDashboardFixture.kpis,
          orders: -1,
        },
      }
      const result = dashboardDataSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('rejects malformed payload with invalid types in daily entries', () => {
      const invalid = {
        ...validDashboardFixture,
        daily: [
          { day: '2026-10-10', orders: 'not-a-number', booked_total: 100, delivered_total: 100 },
        ],
      }
      const result = dashboardDataSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })
  })

  describe('Date Presets and Formatting', () => {
    it('formatCairoDate formats correctly as YYYY-MM-DD in Africa/Cairo', () => {
      const testDate = new Date('2026-10-11T12:00:00Z')
      const formatted = formatCairoDate(testDate)
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(formatted).toBe('2026-10-11')
    })

    it('calculates 7-day preset correctly (7 days inclusive)', () => {
      const baseDate = new Date('2026-10-11T12:00:00Z')
      const range = getPresetDateRange('7d', baseDate)
      expect(range.to).toBe('2026-10-11')
      expect(range.from).toBe('2026-10-05')
    })

    it('calculates 30-day preset correctly (30 days inclusive)', () => {
      const baseDate = new Date('2026-10-11T12:00:00Z')
      const range = getPresetDateRange('30d', baseDate)
      expect(range.to).toBe('2026-10-11')
      expect(range.from).toBe('2026-09-12')
    })

    it('calculates 90-day preset correctly (90 days inclusive)', () => {
      const baseDate = new Date('2026-10-11T12:00:00Z')
      const range = getPresetDateRange('90d', baseDate)
      expect(range.to).toBe('2026-10-11')
      expect(range.from).toBe('2026-07-14')
    })
  })

  describe('API function getAdminDashboard', () => {
    it('calls admin_dashboard RPC with from and to params and returns parsed data', async () => {
      const rpcSpy = vi.fn().mockResolvedValue({
        data: validDashboardFixture,
        error: null,
      })

      vi.spyOn(getSupabase(), 'rpc').mockImplementation(rpcSpy as never)

      const result = await getAdminDashboard('2026-09-12', '2026-10-11')

      expect(rpcSpy).toHaveBeenCalledWith('admin_dashboard', {
        p_from: '2026-09-12',
        p_to: '2026-10-11',
      })
      expect(result).toEqual(validDashboardFixture)
    })

    it('throws error when RPC returns database error', async () => {
      vi.spyOn(getSupabase(), 'rpc').mockResolvedValue({
        data: null,
        error: { message: 'Admins only', code: '42501' },
      } as never)

      await expect(getAdminDashboard('2026-09-12', '2026-10-11')).rejects.toThrow(
        /Failed to load admin dashboard: Admins only/,
      )
    })

    it('throws DashboardParseError with details when response is malformed', async () => {
      vi.spyOn(getSupabase(), 'rpc').mockResolvedValue({
        data: { broken: 'payload' },
        error: null,
      } as never)

      await expect(getAdminDashboard('2026-09-12', '2026-10-11')).rejects.toThrow(
        DashboardParseError,
      )

      try {
        await getAdminDashboard('2026-09-12', '2026-10-11')
      } catch (err) {
        expect(err).toBeInstanceOf(DashboardParseError)
        const parseErr = err as DashboardParseError
        expect(parseErr.name).toBe('DashboardParseError')
        expect(parseErr.message).toContain('Malformed dashboard payload')
        expect(parseErr.zodError.issues.length).toBeGreaterThan(0)
      }
    })
  })

  describe('Hook useAdminDashboard', () => {
    it('loads dashboard data using default 30d preset', async () => {
      vi.spyOn(getSupabase(), 'rpc').mockResolvedValue({
        data: validDashboardFixture,
        error: null,
      } as never)

      const { result } = renderHook(() => useAdminDashboard(), {
        wrapper: createWrapper(),
      })

      expect(result.current.preset).toBe('30d')
      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.data).toEqual(validDashboardFixture)
      expect(result.current.error).toBeNull()
    })

    it('allows changing preset and updates query date parameters', async () => {
      const rpcSpy = vi.fn().mockResolvedValue({
        data: validDashboardFixture,
        error: null,
      })
      vi.spyOn(getSupabase(), 'rpc').mockImplementation(rpcSpy as never)

      const { result } = renderHook(() => useAdminDashboard(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Change preset to 7d
      act(() => {
        result.current.setPreset('7d')
      })

      expect(result.current.preset).toBe('7d')

      await waitFor(() => {
        expect(rpcSpy).toHaveBeenCalledWith(
          'admin_dashboard',
          expect.objectContaining({
            p_to: expect.any(String),
            p_from: expect.any(String),
          }),
        )
      })
    })

    it('supports custom date range', async () => {
      const rpcSpy = vi.fn().mockResolvedValue({
        data: validDashboardFixture,
        error: null,
      })
      vi.spyOn(getSupabase(), 'rpc').mockImplementation(rpcSpy as never)

      const { result } = renderHook(
        () =>
          useAdminDashboard({
            initialPreset: 'custom',
            initialCustomRange: { from: '2026-01-01', to: '2026-01-31' },
          }),
        { wrapper: createWrapper() },
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.activeRange).toEqual({ from: '2026-01-01', to: '2026-01-31' })
      expect(rpcSpy).toHaveBeenCalledWith('admin_dashboard', {
        p_from: '2026-01-01',
        p_to: '2026-01-31',
      })
    })

    it('handles malformed responses gracefully via error state', async () => {
      vi.spyOn(getSupabase(), 'rpc').mockResolvedValue({
        data: { unexpected: 'corrupted_payload' },
        error: null,
      } as never)

      const { result } = renderHook(() => useAdminDashboard(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeInstanceOf(DashboardParseError)
      expect(result.current.data).toBeUndefined()
    })
  })
})

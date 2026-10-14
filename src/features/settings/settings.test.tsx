import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSupabase } from '@/lib/supabase'
import { getPublicSettings, usePublicSettings } from './index'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('Settings Feature', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches public settings mapped to an object', async () => {
    const mockRows = [
      { key: 'hero_title_ar', value: 'إكسسوارات صنعت بكل حب' },
      { key: 'sale_percent', value: 50 },
      { key: 'returns_text_ar', value: 'إمكانية الاسترجاع خلال 14 يوماً' },
    ]

    const supabase = getSupabase()
    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: mockRows, error: null }),
    })
    vi.spyOn(supabase, 'from').mockReturnValue({
      select: selectMock,
    } as unknown as ReturnType<typeof supabase.from>)

    const settings = await getPublicSettings()
    expect(settings.hero_title_ar).toBe('إكسسوارات صنعت بكل حب')
    expect(settings.sale_percent).toBe(50)
    expect(settings.returns_text_ar).toBe('إمكانية الاسترجاع خلال 14 يوماً')
  })

  it('usePublicSettings hook retrieves settings via React Query', async () => {
    const mockRows = [{ key: 'hero_title_ar', value: 'خصم الموسم' }]

    const supabase = getSupabase()
    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: mockRows, error: null }),
    })
    vi.spyOn(supabase, 'from').mockReturnValue({
      select: selectMock,
    } as unknown as ReturnType<typeof supabase.from>)

    const { result } = renderHook(() => usePublicSettings(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.hero_title_ar).toBe('خصم الموسم')
  })
})

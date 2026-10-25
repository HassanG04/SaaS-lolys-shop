import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../../lib/errors'
import { supabase } from '../../lib/supabase'
import { fetchProfileApi } from './profile.api'

vi.mock('../../lib/supabase', () => ({ supabase: { from: vi.fn() } }))

const profile = {
  id: 'user-123',
  role: 'admin',
  full_name: 'Test Admin',
  phone: null,
  postal_code: '12345',
  address: 'Test address',
  avatar_url: null,
}
const missingAvatar = { code: '42703', message: 'column profiles.avatar_url does not exist' }

function mockQuery() {
  const maybeSingle = vi.fn().mockResolvedValue({ data: profile, error: null })
  const eq = vi.fn().mockReturnValue({ maybeSingle })
  const select = vi.fn().mockReturnValue({ eq })
  vi.mocked(supabase.from).mockReturnValue({ select } as unknown as ReturnType<
    typeof supabase.from
  >)
  return { maybeSingle, eq, select }
}

beforeEach(() => vi.clearAllMocks())

describe('database-authoritative profile loading', () => {
  it('loads the role and complete profile with one owner-filtered request', async () => {
    const query = mockQuery()
    expect(await fetchProfileApi('user-123')).toEqual(profile)
    expect(supabase.from).toHaveBeenCalledExactlyOnceWith('profiles')
    expect(query.eq).toHaveBeenCalledExactlyOnceWith('id', 'user-123')
    expect(query.select).toHaveBeenCalledWith(expect.stringContaining('avatar_url'))
  })

  it('retains the database admin role and address when only the photo column is missing', async () => {
    const query = mockQuery()
    const legacyProfile: Partial<typeof profile> = { ...profile }
    delete legacyProfile.avatar_url
    query.maybeSingle
      .mockResolvedValueOnce({ data: null, error: missingAvatar })
      .mockResolvedValueOnce({ data: legacyProfile, error: null })
    expect(await fetchProfileApi('user-123')).toEqual(profile)
    expect(supabase.from).toHaveBeenCalledTimes(2)
    expect(query.eq.mock.calls).toEqual([
      ['id', 'user-123'],
      ['id', 'user-123'],
    ])
    expect(query.select.mock.calls[1]?.[0]).not.toContain('avatar_url')
    expect(query.select.mock.calls[1]?.[0]).toContain('postal_code')
  })

  it.each([
    { code: '42501', message: 'permission denied for table profiles' },
    { code: '42703', message: 'column profiles.postal_code does not exist' },
    { code: 'PGRST301', message: 'Invalid JWT' },
  ])('does not use a schema fallback for $code: $message', async (error) => {
    const query = mockQuery()
    query.maybeSingle.mockResolvedValue({ data: null, error })
    await expect(fetchProfileApi('user-123')).rejects.toBeInstanceOf(AppError)
    expect(query.maybeSingle).toHaveBeenCalledTimes(1)
  })

  it('surfaces a failed compatibility query instead of inventing a customer profile', async () => {
    const query = mockQuery()
    query.maybeSingle
      .mockResolvedValueOnce({ data: null, error: missingAvatar })
      .mockResolvedValueOnce({ data: null, error: { code: '42501', message: 'denied' } })
    await expect(fetchProfileApi('user-123')).rejects.toBeInstanceOf(AppError)
  })

  it('maps rejected connection requests and does not retry with fewer columns', async () => {
    const query = mockQuery()
    query.maybeSingle.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(fetchProfileApi('user-123')).rejects.toBeInstanceOf(AppError)
    expect(query.maybeSingle).toHaveBeenCalledTimes(1)
  })

  it.each([
    { ...profile, role: 'authenticated' },
    { ...profile, id: 'another-user' },
  ])('rejects a profile with an unexpected role or identity', async (data) => {
    const query = mockQuery()
    query.maybeSingle.mockResolvedValue({ data, error: null })
    await expect(fetchProfileApi('user-123')).rejects.toMatchObject({ code: 'SYS-001' })
  })

  it('distinguishes an absent profile from an actual customer profile', async () => {
    const query = mockQuery()
    query.maybeSingle.mockResolvedValue({ data: null, error: null })
    expect(await fetchProfileApi('user-123')).toBeNull()
  })
})

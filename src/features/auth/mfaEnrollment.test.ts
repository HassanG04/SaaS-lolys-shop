import { AuthApiError } from '@supabase/supabase-js'
import { afterEach, expect, it, vi } from 'vitest'
import { supabase } from '../../lib/supabase'
import { enrollTotpApi } from './api'

afterEach(() => vi.restoreAllMocks())

function mockFactors() {
  const factor = (id: string, friendly_name: string, status: 'verified' | 'unverified') => ({
    id,
    friendly_name,
    status,
    factor_type: 'totp' as const,
    created_at: '',
    updated_at: '',
  })
  vi.spyOn(supabase.auth.mfa, 'listFactors').mockResolvedValue({
    data: {
      all: [
        factor('old', 'Lolys Admin', 'unverified'),
        factor('current', 'Lolys Authenticator', 'unverified'),
        factor('protected', 'Lolys Admin', 'verified'),
        factor('other', 'Other app', 'unverified'),
      ],
      totp: [],
      phone: [],
      webauthn: [],
      recovery_code: [],
    },
    error: null,
  })
  const remove = vi
    .spyOn(supabase.auth.mfa, 'unenroll')
    .mockResolvedValue({ data: { id: 'old' }, error: null })
  const enroll = vi.spyOn(supabase.auth.mfa, 'enroll').mockResolvedValue({
    data: null,
    error: new AuthApiError(
      'A factor with this friendly name already exists',
      422,
      'mfa_factor_name_conflict',
    ),
  })
  return { remove, enroll }
}

it('replaces only unfinished Lolys factors; verified and unrelated factors are untouched', async () => {
  const { remove, enroll } = mockFactors()
  await enrollTotpApi()
  expect(remove.mock.calls).toEqual([[{ factorId: 'old' }], [{ factorId: 'current' }]])
  expect(enroll).toHaveBeenCalledOnce()
  expect(enroll).toHaveBeenCalledWith(
    expect.objectContaining({ friendlyName: 'Lolys Authenticator' }),
  )
})

it('duplicate names never become a neutral email confirmation', async () => {
  mockFactors()
  expect(await enrollTotpApi()).toEqual({ error: 'AUTH-016' })
})

it('stops when cleanup fails, preserving the existing authenticator state', async () => {
  const { remove, enroll } = mockFactors()
  remove.mockResolvedValue({
    data: null,
    error: new AuthApiError('denied', 403, 'insufficient_aal'),
  })
  expect(await enrollTotpApi()).toEqual({ error: 'AUTH-016' })
  expect(enroll).not.toHaveBeenCalled()
})

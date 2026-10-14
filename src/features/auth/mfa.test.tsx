import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session, User } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { supabase } from '../../lib/supabase'
import * as api from './api'
import { getAuthMessage } from './authErrors'
import { AuthProvider, useAal } from './AuthProvider'
import type { MfaFactor } from './types'

describe('Two-factor login and TOTP gates (T-2.06)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function mockAuthenticatedAdmin(aal: 'aal1' | 'aal2', factors: MfaFactor[] = []) {
    const mockUser = { id: 'admin-123', email: 'admin@example.com' } as unknown as User
    const mockSession = { user: mockUser } as unknown as Session

    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: { session: mockSession },
      error: null,
    })
    vi.spyOn(supabase.auth, 'onAuthStateChange').mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn(), id: '1', callback: vi.fn() } },
    } as unknown as ReturnType<typeof supabase.auth.onAuthStateChange>)

    vi.spyOn(api, 'fetchProfileApi').mockResolvedValue({
      id: 'admin-123',
      role: 'admin',
      full_name: 'Admin User',
      phone: null,
      governorate_id: null,
    })

    vi.spyOn(api, 'fetchAalApi').mockResolvedValue(aal)
    vi.spyOn(api, 'fetchFactorsApi').mockResolvedValue(factors)
  }

  it('admin with only a password reaches the enrollment screen and nothing else', async () => {
    mockAuthenticatedAdmin('aal1', []) // zero factors enrolled

    vi.spyOn(api, 'enrollTotpApi').mockResolvedValue({
      data: {
        id: 'factor-new-1',
        type: 'totp',
        totp: {
          qr_code: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
          secret: 'JBSWY3DPEHPK3PXP',
          uri: 'otpauth://totp/Lolys?secret=JBSWY3DPEHPK3PXP',
        },
      },
    })

    render(<App initialEntries={['/admin']} />)

    // Admin dashboard should NOT load
    expect(screen.queryByText('لوحة التحكم')).not.toBeInTheDocument()

    // Must reach enrollment screen
    expect(
      await screen.findByRole('heading', { name: 'إعداد التحقق بخطوتين (TOTP)' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('JBSWY3DPEHPK3PXP')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'تأكيد وتفعيل' })).toBeInTheDocument()
  })

  it('admin with enrolled factors but aal1 session reaches challenge screen with AUTH-005', async () => {
    mockAuthenticatedAdmin('aal1', [
      {
        id: 'factor-existing-1',
        factor_type: 'totp',
        status: 'verified',
        friendly_name: 'Phone Authenticator',
      },
    ])

    render(<App initialEntries={['/admin']} />)

    // Admin dashboard should NOT load
    expect(screen.queryByText('لوحة التحكم')).not.toBeInTheDocument()

    // Must reach challenge screen
    expect(await screen.findByRole('heading', { name: 'التحقق بخطوتين' })).toBeInTheDocument()
    expect(screen.getByText(getAuthMessage('AUTH-005'))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'تأكيد الرمز والمتابعة' })).toBeInTheDocument()
  })

  it('wrong or expired codes in challenge screen display AUTH-006', async () => {
    const user = userEvent.setup()
    mockAuthenticatedAdmin('aal1', [
      {
        id: 'factor-existing-1',
        factor_type: 'totp',
        status: 'verified',
      },
    ])

    vi.spyOn(api, 'challengeAndVerifyApi').mockResolvedValue({
      success: false,
      code: 'AUTH-006',
      message: getAuthMessage('AUTH-006'),
    })

    render(<App initialEntries={['/admin/mfa/challenge']} />)

    const input = await screen.findByPlaceholderText('123456')
    await user.type(input, '999999')

    const submitBtn = screen.getByRole('button', { name: 'تأكيد الرمز والمتابعة' })
    await user.click(submitBtn)

    expect(await screen.findByText(getAuthMessage('AUTH-006'))).toBeInTheDocument()
    expect(screen.getByText('AUTH-006')).toBeInTheDocument()
  })

  it('after verification the session is aal2 and admin screens load successfully', async () => {
    mockAuthenticatedAdmin('aal2', [
      {
        id: 'factor-verified-1',
        factor_type: 'totp',
        status: 'verified',
      },
    ])

    render(<App initialEntries={['/admin']} />)

    // Admin screen loads
    expect(
      await screen.findByRole('heading', { name: 'لوحة تحكم الإدارة' }, { timeout: 4000 }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'إعداد التحقق بخطوتين (TOTP)' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'التحقق بخطوتين' })).not.toBeInTheDocument()
  })

  it('customer accounts are denied from /admin with AUTH-011', async () => {
    const mockUser = { id: 'cust-123', email: 'cust@example.com' } as unknown as User
    const mockSession = { user: mockUser } as unknown as Session

    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: { session: mockSession },
      error: null,
    })
    vi.spyOn(supabase.auth, 'onAuthStateChange').mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn(), id: '1', callback: vi.fn() } },
    } as unknown as ReturnType<typeof supabase.auth.onAuthStateChange>)

    vi.spyOn(api, 'fetchProfileApi').mockResolvedValue({
      id: 'cust-123',
      role: 'customer',
      full_name: 'Customer One',
      phone: null,
      governorate_id: null,
    })

    render(<App initialEntries={['/admin']} />)

    expect(await screen.findByText(getAuthMessage('AUTH-011'))).toBeInTheDocument()
  })

  it('useAal hook reflects current assurance level and enrolled status', async () => {
    mockAuthenticatedAdmin('aal2', [{ id: 'f-1', factor_type: 'totp', status: 'verified' }])

    function AalConsumer() {
      const { isAal2, hasEnrolledFactors } = useAal()
      return (
        <div>
          <span>{isAal2 ? 'LEVEL_AAL2' : 'LEVEL_AAL1'}</span>
          <span>{hasEnrolledFactors ? 'HAS_FACTORS' : 'NO_FACTORS'}</span>
        </div>
      )
    }

    render(
      <AuthProvider>
        <AalConsumer />
      </AuthProvider>,
    )

    expect(await screen.findByText('LEVEL_AAL2')).toBeInTheDocument()
    expect(screen.getByText('HAS_FACTORS')).toBeInTheDocument()
  })

  it('customer account page /account/security displays 2FA status and enrollment option', async () => {
    const mockUser = { id: 'cust-123', email: 'cust@example.com' } as unknown as User
    const mockSession = { user: mockUser } as unknown as Session

    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: { session: mockSession },
      error: null,
    })
    vi.spyOn(supabase.auth, 'onAuthStateChange').mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn(), id: '1', callback: vi.fn() } },
    } as unknown as ReturnType<typeof supabase.auth.onAuthStateChange>)

    vi.spyOn(api, 'fetchProfileApi').mockResolvedValue({
      id: 'cust-123',
      role: 'customer',
      full_name: 'Customer One',
      phone: null,
      governorate_id: null,
    })
    vi.spyOn(api, 'fetchFactorsApi').mockResolvedValue([])

    render(<App initialEntries={['/account/security']} />)

    expect(await screen.findByText('الأمان والتحقق بخطوتين')).toBeInTheDocument()
    expect(screen.getByText('غير مفعّل')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'تفعيل التحقق بخطوتين الآن' })).toBeInTheDocument()
  })
})

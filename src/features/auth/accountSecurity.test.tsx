import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session, User } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { queryClient } from '../../lib/queryClient'
import { supabase } from '../../lib/supabase'
import * as api from './api'
import { getAuthMessage } from './authErrors'
import { ADMIN_IDLE_TIMEOUT_MS, AuthProvider, useAuth } from './AuthProvider'

describe('Account security and admin idle timeout (T-2.07)', () => {
  const mockUser: User = {
    id: 'user-sec-123',
    email: 'hassan@example.com',
    app_metadata: {},
    user_metadata: { full_name: 'Hassan Customer' },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  }

  const mockSession: Session = {
    access_token: 'fake-jwt',
    refresh_token: 'fake-refresh',
    expires_in: 3600,
    token_type: 'bearer',
    user: mockUser,
  }

  function mockAuthenticatedUser(role: 'customer' | 'admin' = 'customer') {
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: { session: mockSession },
      error: null,
    })
    vi.spyOn(supabase.auth, 'onAuthStateChange').mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn(), id: '1', callback: vi.fn() } },
    } as unknown as ReturnType<typeof supabase.auth.onAuthStateChange>)

    vi.spyOn(api, 'fetchProfileApi').mockResolvedValue({
      id: 'user-sec-123',
      role,
      full_name: 'Hassan',
      phone: null,
      governorate_id: null,
    })
    vi.spyOn(api, 'fetchAalApi').mockResolvedValue('aal1')
    vi.spyOn(api, 'fetchFactorsApi').mockResolvedValue([])
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    queryClient.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('admin session times out after 20 idle minutes, clearing caches and signing out', async () => {
    vi.useFakeTimers()
    const signOutSpy = vi.spyOn(api, 'signOutApi').mockResolvedValue(undefined)
    const clearCacheSpy = vi.spyOn(queryClient, 'clear')

    mockAuthenticatedUser('admin')

    function AdminTestConsumer() {
      const { user, role } = useAuth()
      return (
        <div>
          <span>Role: {role}</span>
          <span>User: {user?.email}</span>
        </div>
      )
    }

    render(
      <AuthProvider>
        <AdminTestConsumer />
      </AuthProvider>,
    )

    // Wait for auth load microtasks to settle
    await act(async () => {
      await Promise.resolve()
    })

    // Advance 19 minutes - should NOT have timed out yet
    act(() => {
      vi.advanceTimersByTime(19 * 60 * 1000)
    })
    expect(signOutSpy).not.toHaveBeenCalled()
    expect(clearCacheSpy).not.toHaveBeenCalled()

    // Activity event resets the timer
    act(() => {
      window.dispatchEvent(new Event('mousemove'))
    })

    // Advance 15 more minutes (total 34 mins, but only 15 mins since last activity)
    act(() => {
      vi.advanceTimersByTime(15 * 60 * 1000)
    })
    expect(signOutSpy).not.toHaveBeenCalled()

    // Now advance remaining 5 minutes to complete 20 idle minutes
    act(() => {
      vi.advanceTimersByTime(5 * 60 * 1000 + 10)
    })

    expect(signOutSpy).toHaveBeenCalled()
    expect(clearCacheSpy).toHaveBeenCalled()
  })

  it('customer sessions do not trigger admin idle timeout', async () => {
    vi.useFakeTimers()
    const signOutSpy = vi.spyOn(api, 'signOutApi').mockResolvedValue(undefined)

    mockAuthenticatedUser('customer')

    function CustomerTestConsumer() {
      const { role } = useAuth()
      return <div>Role: {role}</div>
    }

    render(
      <AuthProvider>
        <CustomerTestConsumer />
      </AuthProvider>,
    )

    await act(async () => {
      await Promise.resolve()
    })

    // Advance 25 minutes
    act(() => {
      vi.advanceTimersByTime(ADMIN_IDLE_TIMEOUT_MS + 60000)
    })

    expect(signOutSpy).not.toHaveBeenCalled()
  })

  it('password change enforces 10 characters and shows AUTH-008', async () => {
    const user = userEvent.setup()
    mockAuthenticatedUser('customer')

    render(<App initialEntries={['/account/security']} />)

    expect(await screen.findByRole('heading', { name: 'تغيير كلمة المرور' })).toBeInTheDocument()

    const newPassInput = screen.getByLabelText('كلمة المرور الجديدة')
    const confirmPassInput = screen.getByLabelText('تأكيد كلمة المرور الجديدة')
    const submitBtn = screen.getByRole('button', { name: 'تحديث كلمة المرور' })

    await user.type(newPassInput, 'short')
    await user.type(confirmPassInput, 'short')
    await user.click(submitBtn)

    expect(await screen.findByText(getAuthMessage('AUTH-008'))).toBeInTheDocument()
    expect(screen.getByText('AUTH-008')).toBeInTheDocument()
  })

  it('password change returns AUTH-007 when session is stale', async () => {
    const user = userEvent.setup()
    mockAuthenticatedUser('customer')

    vi.spyOn(api, 'updatePasswordApi').mockResolvedValue({
      success: false,
      code: 'AUTH-007',
      message: getAuthMessage('AUTH-007'),
    })

    render(<App initialEntries={['/account/security']} />)

    expect(await screen.findByRole('heading', { name: 'تغيير كلمة المرور' })).toBeInTheDocument()

    const newPassInput = screen.getByLabelText('كلمة المرور الجديدة')
    const confirmPassInput = screen.getByLabelText('تأكيد كلمة المرور الجديدة')
    const submitBtn = screen.getByRole('button', { name: 'تحديث كلمة المرور' })

    await user.type(newPassInput, 'ValidPassword123!')
    await user.type(confirmPassInput, 'ValidPassword123!')
    await user.click(submitBtn)

    expect(await screen.findByText(getAuthMessage('AUTH-007'))).toBeInTheDocument()
    expect(screen.getByText('AUTH-007')).toBeInTheDocument()
  })

  it('email change displays neutral AUTH-010 notification and targets only current user', async () => {
    const user = userEvent.setup()
    mockAuthenticatedUser('customer')

    const updateEmailSpy = vi.spyOn(api, 'updateEmailApi').mockResolvedValue({
      success: true,
      code: 'AUTH-010',
      message: getAuthMessage('AUTH-010'),
    })

    render(<App initialEntries={['/account/security']} />)

    expect(
      await screen.findByRole('heading', { name: 'تغيير البريد الإلكتروني' }),
    ).toBeInTheDocument()

    // Shows current user email and has no field for changing another user's email
    expect(screen.getByText('hassan@example.com')).toBeInTheDocument()
    expect(screen.queryByLabelText(/معرف المستخدم|User ID/i)).not.toBeInTheDocument()

    const newEmailInput = screen.getByLabelText('البريد الإلكتروني الجديد')
    const submitBtn = screen.getByRole('button', { name: 'تحديث البريد الإلكتروني' })

    await user.type(newEmailInput, 'newemail@example.com')
    await user.click(submitBtn)

    expect(updateEmailSpy).toHaveBeenCalledWith('newemail@example.com')
    expect(await screen.findByText(getAuthMessage('AUTH-010'))).toBeInTheDocument()
  })

  it('sign out of all devices calls signOut with global scope', async () => {
    const user = userEvent.setup()
    mockAuthenticatedUser('customer')

    const signOutSpy = vi.spyOn(api, 'signOutApi').mockResolvedValue(undefined)

    render(<App initialEntries={['/account/security']} />)

    const globalBtn = await screen.findByRole('button', {
      name: 'تسجيل الخروج من كافة الأجهزة',
    })
    await user.click(globalBtn)

    expect(signOutSpy).toHaveBeenCalledWith({ scope: 'global' })
  })
})

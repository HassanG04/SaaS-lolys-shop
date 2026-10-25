import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { Session, User } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../../i18n/LanguageProvider'
import { supabase } from '../../lib/supabase'
import * as api from './api'
import { AuthProvider, useAuth } from './AuthProvider'
import { RequireAdmin, RequireAuth } from './guards'
import type { UserProfile } from './types'

const user: User = {
  id: 'profile-test',
  email: 'profile@example.com',
  app_metadata: {},
  user_metadata: { role: 'admin' },
  aud: 'authenticated',
  created_at: '2026-10-26',
}
const session: Session = {
  user,
  access_token: 'test-access',
  refresh_token: 'test-refresh',
  expires_in: 3600,
  token_type: 'bearer',
}
const admin: UserProfile = { id: user.id, role: 'admin', full_name: 'Test', phone: null }

function SessionStatus() {
  const auth = useAuth()
  return (
    <>
      <output aria-label="Session state">
        {auth.user?.id ?? 'signed-out'}:{auth.role}:{String(auth.loadingFactors)}
      </output>
      <button onClick={() => void auth.refreshProfile()}>Refresh profile</button>
    </>
  )
}

function mount(path = '/admin', lang: 'ar' | 'en' = 'en') {
  return render(
    <LanguageProvider initialLanguage={lang}>
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <SessionStatus />
          <Routes>
            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <p>Protected admin content</p>
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/mfa/enroll"
              element={
                <RequireAdmin>
                  <p>Enroll MFA</p>
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/mfa/challenge"
              element={
                <RequireAdmin>
                  <p>Challenge MFA</p>
                </RequireAdmin>
              }
            />
            <Route
              path="/account"
              element={
                <RequireAuth>
                  <p>Account content</p>
                </RequireAuth>
              }
            />
            <Route path="/login" element={<p>Login</p>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </LanguageProvider>,
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({ data: { session }, error: null })
  vi.spyOn(supabase.auth, 'onAuthStateChange').mockReturnValue({
    data: { subscription: { id: 'test', callback: vi.fn(), unsubscribe: vi.fn() } },
  })
  vi.spyOn(api, 'fetchProfileApi').mockResolvedValue(admin)
  vi.spyOn(api, 'fetchAalApi').mockResolvedValue('aal1')
  vi.spyOn(api, 'fetchFactorsApi').mockResolvedValue([])
})

describe('profile failure and role refresh', () => {
  it('keeps account content mounted during a successful background profile refresh', async () => {
    mount('/account')
    const content = await screen.findByText('Account content')
    let finish: (value: UserProfile) => void = () => {}
    vi.mocked(api.fetchProfileApi).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Refresh profile' }))
    expect(screen.getByText('Account content')).toBe(content)
    expect(content).toBeInTheDocument()
    await act(async () => {
      finish(admin)
    })
    expect(screen.getByText('Account content')).toBe(content)
  })
  it.each(['/admin', '/account'])(
    'shows a retryable safe error at %s, then recovers without signing out',
    async (path) => {
      vi.mocked(api.fetchProfileApi).mockRejectedValueOnce(new Error('private SQL details'))
      mount(path)
      const alert = (await screen.findAllByRole('alert'))[0]
      expect(alert).toHaveTextContent('SYS-001')
      expect(alert).not.toHaveTextContent('private SQL details')
      expect(alert?.textContent).not.toMatch(/[\u0600-\u06ff]/)
      expect(screen.queryByText('Protected admin content')).not.toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
      expect(
        await screen.findByText(path === '/admin' ? 'Enroll MFA' : 'Account content'),
      ).toBeInTheDocument()
      expect(screen.queryByText('Protected admin content')).not.toBeInTheDocument()
    },
  )

  it('uses Arabic error and retry copy when Arabic is selected', async () => {
    vi.mocked(api.fetchProfileApi).mockResolvedValue(null)
    mount('/admin', 'ar')
    expect((await screen.findAllByRole('alert'))[0]).toHaveTextContent('SYS-001')
    expect(screen.getByRole('button', { name: 'إعادة المحاولة' })).toBeInTheDocument()
  })

  it('ignores admin user metadata and loads a promotion from the database on refresh', async () => {
    vi.mocked(api.fetchProfileApi).mockResolvedValueOnce({ ...admin, role: 'customer' })
    mount()
    expect(await screen.findByRole('alert')).toHaveTextContent('AUTH-011')
    await userEvent.click(screen.getByRole('button', { name: 'Refresh profile' }))
    expect(await screen.findByText('Enroll MFA')).toBeInTheDocument()
    expect(screen.queryByText('Protected admin content')).not.toBeInTheDocument()
  })

  it('keeps the MFA challenge gate after the database confirms an admin role', async () => {
    vi.mocked(api.fetchFactorsApi).mockResolvedValue([
      { id: 'factor', factor_type: 'totp', status: 'verified' },
    ])
    mount()
    expect(await screen.findByText('Challenge MFA')).toBeInTheDocument()
    expect(screen.queryByText('Protected admin content')).not.toBeInTheDocument()
  })

  it('clears previous admin access if refreshing the profile fails', async () => {
    vi.mocked(api.fetchAalApi).mockResolvedValue('aal2')
    vi.mocked(api.fetchFactorsApi).mockResolvedValue([
      { id: 'factor', factor_type: 'totp', status: 'verified' },
    ])
    mount()
    expect(await screen.findByText('Protected admin content')).toBeInTheDocument()
    vi.mocked(api.fetchProfileApi).mockRejectedValue(new Error('profile failure'))
    await userEvent.click(screen.getByRole('button', { name: 'Refresh profile' }))
    expect((await screen.findAllByRole('alert'))[0]).toHaveTextContent('SYS-001')
    expect(screen.queryByText('Protected admin content')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Session state')).toHaveTextContent(`${user.id}:customer:false`)
  })

  it('does not restore a stale admin profile after a sign-out notification', async () => {
    let finish: (value: UserProfile) => void = () => {}
    vi.mocked(api.fetchProfileApi).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    mount('/account')
    await waitFor(() => expect(api.fetchProfileApi).toHaveBeenCalled())
    const notify = vi.mocked(supabase.auth.onAuthStateChange).mock.calls[0]?.[0]
    act(() => {
      notify?.('SIGNED_OUT', null)
    })
    await waitFor(() =>
      expect(screen.getByLabelText('Session state')).toHaveTextContent('signed-out:customer:false'),
    )
    await act(async () => {
      finish(admin)
    })
    expect(screen.getByLabelText('Session state')).toHaveTextContent('signed-out:customer:false')
    expect(await screen.findByText('Login')).toBeInTheDocument()
  })
})

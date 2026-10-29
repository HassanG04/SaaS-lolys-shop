import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthApiError, type Session } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from './AuthProvider'
import { LanguageProvider } from '../../i18n/LanguageProvider'
import { translations } from '../../i18n/translations'
import ResetPasswordPage from '../../pages/ResetPasswordPage'

const network = vi.hoisted(() => ({ getSession: vi.fn(), updateUser: vi.fn() }))
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: network.getSession,
      updateUser: network.updateUser,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      mfa: {
        getAuthenticatorAssuranceLevel: async () => ({
          data: { currentLevel: 'aal1' },
          error: null,
        }),
        listFactors: async () => ({ data: { totp: [] }, error: null }),
      },
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { id: 'recovery-user', role: 'customer' },
            error: null,
          }),
        }),
      }),
    }),
  },
}))
const session = { user: { id: 'recovery-user' }, access_token: 'local-test' } as Session
function show(lang: 'ar' | 'en' = 'en', url = '/reset-password') {
  return render(
    <LanguageProvider initialLanguage={lang}>
      <MemoryRouter initialEntries={[url]}>
        <AuthProvider>
          <ResetPasswordPage />
        </AuthProvider>
      </MemoryRouter>
    </LanguageProvider>,
  )
}
async function fill(password: string, confirm = password) {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText(translations.en.account.newPasswordLabel), password)
  await user.type(screen.getByLabelText(translations.en.account.confirmNewPasswordLabel), confirm)
  await user.click(
    screen.getByRole('button', { name: translations.en.account.updatePasswordAction }),
  )
}
beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  network.getSession.mockResolvedValue({ data: { session }, error: null })
  network.updateUser.mockResolvedValue({ data: { user: session.user }, error: null })
})
describe('Email recovery destination', () => {
  it.each(['ar', 'en'] as const)(
    'shows the new-password form for the recovered session (%s)',
    async (lang) => {
      show(lang)
      expect(
        await screen.findByLabelText(translations[lang].account.newPasswordLabel),
      ).toHaveAttribute('autocomplete', 'new-password')
      expect(screen.queryByLabelText(translations[lang].auth.email)).not.toBeInTheDocument()
    },
  )
  it('waits for SDK initialization before deciding which form to display', async () => {
    let finish: (value: { data: { session: Session }; error: null }) => void = () => {}
    network.getSession.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    show()
    expect(screen.queryByLabelText(translations.en.auth.email)).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
    await act(async () => finish({ data: { session }, error: null }))
    expect(await screen.findByLabelText(translations.en.account.newPasswordLabel)).toBeVisible()
  })
  it('updates through Auth, removes password fields and confirms success', async () => {
    show()
    await fill('New-Secret-81!')
    expect(network.updateUser).toHaveBeenCalledWith({ password: 'New-Secret-81!' })
    expect(await screen.findByRole('status')).toHaveTextContent(
      translations.en.account.passwordSuccess,
    )
    expect(
      screen.queryByLabelText(translations.en.account.newPasswordLabel),
    ).not.toBeInTheDocument()
  })
  it.each([
    ['different-one!', 'different-two!', 'AUTH-013'],
    ['12345678910', '12345678910', 'AUTH-008'],
  ])('rejects invalid password pair without a request', async (password, confirm, code) => {
    show()
    await fill(password, confirm)
    expect(await screen.findByRole('alert')).toHaveTextContent(code)
    expect(network.updateUser).not.toHaveBeenCalled()
  })
  it('shows a safe failure without a false success when the session expired', async () => {
    network.updateUser.mockResolvedValue({
      data: { user: null },
      error: new AuthApiError('private backend detail', 401, 'session_expired'),
    })
    show()
    await fill('New-Secret-81!')
    expect(await screen.findByRole('alert')).toHaveTextContent('AUTH-001')
    expect(screen.queryByText('private backend detail')).not.toBeInTheDocument()
    expect(screen.queryByText(translations.en.account.passwordSuccess)).not.toBeInTheDocument()
  })
  it('keeps the request form for a visitor without a session', async () => {
    network.getSession.mockResolvedValue({ data: { session: null }, error: null })
    show()
    expect(await screen.findByLabelText(translations.en.auth.email)).toBeVisible()
    expect(
      screen.queryByLabelText(translations.en.account.newPasswordLabel),
    ).not.toBeInTheDocument()
  })
  it('does not treat an expired/reused link as a valid recovery even with an existing session', async () => {
    show('en', '/reset-password#error=access_denied&error_code=otp_expired')
    expect(await screen.findByRole('alert')).toHaveTextContent('AUTH-009')
    expect(screen.getByLabelText(translations.en.auth.email)).toBeVisible()
    expect(network.updateUser).not.toHaveBeenCalled()
  })
})

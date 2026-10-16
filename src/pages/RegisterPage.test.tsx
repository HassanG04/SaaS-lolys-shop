import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { LanguageProvider } from '@/i18n/LanguageProvider'
import { AuthContext } from '@/features/auth/AuthProvider'
import type { AuthContextValue } from '@/features/auth/types'
import RegisterPage from './RegisterPage'

function renderRegisterPage(options?: {
  signUpMock?: AuthContextValue['signUp']
  resendConfirmationMock?: AuthContextValue['resendConfirmation']
}) {
  const signUp =
    options?.signUpMock ?? vi.fn().mockResolvedValue({ success: true, code: 'AUTH-010' })
  const resendConfirmation =
    options?.resendConfirmationMock ?? vi.fn().mockResolvedValue({ success: true })

  const authValue: AuthContextValue = {
    session: null,
    user: null,
    profile: null,
    role: 'customer',
    aal: 'aal1',
    factors: [],
    loading: false,
    loadingFactors: false,
    signIn: vi.fn(),
    signUp,
    signOut: vi.fn(),
    resetPassword: vi.fn(),
    resendConfirmation,
    refreshProfile: vi.fn(),
    refreshAal: vi.fn(),
    refreshFactors: vi.fn(),
    enrollTotp: vi.fn(),
    challengeAndVerify: vi.fn(),
    unenrollFactor: vi.fn(),
    updatePassword: vi.fn(),
    updateEmail: vi.fn(),
  }

  return {
    signUp,
    resendConfirmation,
    ...render(
      <LanguageProvider>
        <AuthContext.Provider value={authValue}>
          <MemoryRouter>
            <RegisterPage />
          </MemoryRouter>
        </AuthContext.Provider>
      </LanguageProvider>,
    ),
  }
}

describe('RegisterPage', () => {
  it('renders all registration fields and buttons', () => {
    renderRegisterPage()

    expect(screen.getByLabelText(/الاسم الكامل/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/البريد الإلكتروني/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^كلمة المرور$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/تأكيد كلمة المرور/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'إنشاء حساب' })).toBeInTheDocument()
  })

  it('shows AUTH-001 when submitting with missing fields', async () => {
    const user = userEvent.setup()
    renderRegisterPage()

    const submitBtn = screen.getByRole('button', { name: 'إنشاء حساب' })
    await user.click(submitBtn)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/AUTH-001/)).toBeInTheDocument()
  })

  it('shows AUTH-008 when password is less than 10 characters', async () => {
    const user = userEvent.setup()
    renderRegisterPage()

    await user.type(screen.getByLabelText(/البريد الإلكتروني/i), 'user@example.com')
    await user.type(screen.getByLabelText(/^كلمة المرور$/i), 'short12')
    await user.type(screen.getByLabelText(/تأكيد كلمة المرور/i), 'short12')

    const submitBtn = screen.getByRole('button', { name: 'إنشاء حساب' })
    await user.click(submitBtn)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/AUTH-008/)).toBeInTheDocument()
  })

  it('shows AUTH-013 when password and confirm password do not match', async () => {
    const user = userEvent.setup()
    renderRegisterPage()

    await user.type(screen.getByLabelText(/البريد الإلكتروني/i), 'user@example.com')
    await user.type(screen.getByLabelText(/^كلمة المرور$/i), 'superSecret10Pass')
    await user.type(screen.getByLabelText(/تأكيد كلمة المرور/i), 'differentSecretPass')

    const submitBtn = screen.getByRole('button', { name: 'إنشاء حساب' })
    await user.click(submitBtn)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/AUTH-013/)).toBeInTheDocument()
    expect(screen.getByText(/كلمتا المرور غير متطابقتين/i)).toBeInTheDocument()
  })

  it('toggles password visibility when eye button is clicked', async () => {
    const user = userEvent.setup()
    renderRegisterPage()

    const passwordInput = screen.getByLabelText(/^كلمة المرور$/i) as HTMLInputElement
    const confirmPasswordInput = screen.getByLabelText(/تأكيد كلمة المرور/i) as HTMLInputElement

    expect(passwordInput.type).toBe('password')
    expect(confirmPasswordInput.type).toBe('password')

    const toggleButtons = screen.getAllByRole('button', { name: /إظهار كلمة المرور/i })
    expect(toggleButtons).toHaveLength(2)

    // Click first toggle
    await user.click(toggleButtons[0])
    expect(passwordInput.type).toBe('text')
    expect(confirmPasswordInput.type).toBe('password')

    // Click second toggle
    await user.click(toggleButtons[1])
    expect(passwordInput.type).toBe('text')
    expect(confirmPasswordInput.type).toBe('text')

    // Toggle back
    const hideButtons = screen.getAllByRole('button', { name: /إخفاء كلمة المرور/i })
    await user.click(hideButtons[0])
    expect(passwordInput.type).toBe('password')
  })

  it('submits registration successfully when passwords match and criteria are met', async () => {
    const user = userEvent.setup()
    const { signUp } = renderRegisterPage()

    await user.type(screen.getByLabelText(/الاسم الكامل/i), 'سارة أحمد')
    await user.type(screen.getByLabelText(/البريد الإلكتروني/i), 'sara@example.com')
    await user.type(screen.getByLabelText(/^كلمة المرور$/i), 'ValidSecret123Pass!')
    await user.type(screen.getByLabelText(/تأكيد كلمة المرور/i), 'ValidSecret123Pass!')

    const submitBtn = screen.getByRole('button', { name: 'إنشاء حساب' })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: 'سارة أحمد',
          email: 'sara@example.com',
          password: 'ValidSecret123Pass!',
        }),
      )
      expect(screen.getByText('تحقق من بريدك الإلكتروني')).toBeInTheDocument()
    })
  })

  it('displays AUTH-015 and navigation links when email is already registered', async () => {
    const user = userEvent.setup()
    const signUpMock = vi.fn().mockResolvedValue({
      success: false,
      code: 'AUTH-015',
      message: 'هذا البريد الإلكتروني مسجّل بالفعل!',
    })
    renderRegisterPage({ signUpMock })

    await user.type(screen.getByLabelText(/الاسم الكامل/i), 'مستخدم مسجل')
    await user.type(screen.getByLabelText(/البريد الإلكتروني/i), 'registered@example.com')
    await user.type(screen.getByLabelText(/^كلمة المرور$/i), 'ValidSecret123Pass!')
    await user.type(screen.getByLabelText(/تأكيد كلمة المرور/i), 'ValidSecret123Pass!')

    const submitBtn = screen.getByRole('button', { name: 'إنشاء حساب' })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText(/AUTH-015/)).toBeInTheDocument()
      expect(screen.getByText(/هذا البريد الإلكتروني مسجّل بالفعل/i)).toBeInTheDocument()
      expect(screen.getAllByRole('link', { name: /تسجيل الدخول/i })).toHaveLength(2)
      expect(
        screen.getByRole('link', { name: /طلب رابط جديد لاستعادة كلمة المرور/i }),
      ).toBeInTheDocument()
    })
  })
})

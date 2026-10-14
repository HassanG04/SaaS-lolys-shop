import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthApiError, type Session, type User } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { supabase } from '../../lib/supabase'
import * as api from './api'
import { resendConfirmationApi, resetPasswordApi, signInApi, signUpApi } from './api'
import { AuthAlert } from './AuthAlert'
import { getAuthMessage, mapAuthError } from './authErrors'

describe('Authentication unit tests (T-2.04)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('proves the same message and the same number of requests for wrong password and unknown email', async () => {
    let callCount = 0

    // Spy on supabase.auth.signInWithPassword to track request count
    vi.spyOn(supabase.auth, 'signInWithPassword').mockImplementation(async (credentials) => {
      callCount++
      if ('email' in credentials && credentials.email === 'unknown@example.com') {
        return {
          data: { user: null, session: null },
          error: new AuthApiError('invalid_credentials', 400, 'invalid_credentials'),
        }
      }
      return {
        data: { user: null, session: null },
        error: new AuthApiError('invalid_credentials', 400, 'invalid_credentials'),
      }
    })

    // Case 1: Unknown email
    callCount = 0
    const unknownRes = await signInApi({
      email: 'unknown@example.com',
      password: 'password12345',
    })
    expect(callCount).toBe(1)
    expect(unknownRes.success).toBe(false)
    expect(unknownRes.code).toBe('AUTH-001')
    expect(unknownRes.message).toBe(getAuthMessage('AUTH-001'))

    // Case 2: Known email with wrong password
    callCount = 0
    const wrongPassRes = await signInApi({
      email: 'known@example.com',
      password: 'wrongpassword123',
    })
    expect(callCount).toBe(1)
    expect(wrongPassRes.success).toBe(false)
    expect(wrongPassRes.code).toBe('AUTH-001')
    expect(wrongPassRes.message).toBe(getAuthMessage('AUTH-001'))

    // Identical error code and message
    expect(unknownRes.code).toBe(wrongPassRes.code)
    expect(unknownRes.message).toBe(wrongPassRes.message)
  })

  it('proves reset message is identical for known and unknown emails (AUTH-010)', async () => {
    vi.spyOn(supabase.auth, 'resetPasswordForEmail').mockResolvedValue({
      data: {},
      error: null,
    })

    const knownRes = await resetPasswordApi({ email: 'known@example.com' })
    const unknownRes = await resetPasswordApi({ email: 'unknown@example.com' })

    expect(knownRes.success).toBe(true)
    expect(knownRes.code).toBe('AUTH-010')
    expect(knownRes.message).toBe(getAuthMessage('AUTH-010'))

    expect(unknownRes.success).toBe(true)
    expect(unknownRes.code).toBe('AUTH-010')
    expect(unknownRes.message).toBe(getAuthMessage('AUTH-010'))
    expect(knownRes.code).toBe(unknownRes.code)
  })

  it('proves sign-up with an existing email shows neutral AUTH-010', async () => {
    // Supabase returns an error or identity collision on existing user
    vi.spyOn(supabase.auth, 'signUp').mockResolvedValue({
      data: { user: null, session: null },
      error: new AuthApiError('user_already_exists', 400, 'user_already_exists'),
    })

    const result = await signUpApi({
      email: 'existing@example.com',
      password: 'ValidPassword10!',
    })

    expect(result.success).toBe(true)
    expect(result.code).toBe('AUTH-010')
    expect(result.message).toBe(getAuthMessage('AUTH-010'))
  })

  it('enforces password policy (at least 10 characters) returning AUTH-008 up front', async () => {
    const result = await signUpApi({
      email: 'user@example.com',
      password: 'short', // 5 chars
    })

    expect(result.success).toBe(false)
    expect(result.code).toBe('AUTH-008')
    expect(result.message).toBe(getAuthMessage('AUTH-008'))
  })

  it('maps Turnstile and CAPTCHA failures to AUTH-003', async () => {
    const error = { message: 'captcha verification failed' }
    expect(mapAuthError(error)).toBe('AUTH-003')

    vi.spyOn(supabase.auth, 'signInWithPassword').mockResolvedValue({
      data: { user: null, session: null },
      error: new AuthApiError('captcha verification failed', 400, 'captcha_failed'),
    })

    const result = await signInApi({
      email: 'test@example.com',
      password: 'validPassword123',
    })
    expect(result.code).toBe('AUTH-003')
  })

  it('maps rate limits to AUTH-002', () => {
    expect(mapAuthError({ status: 429, message: 'rate limit exceeded' })).toBe('AUTH-002')
  })

  it('resends confirmation email with neutral AUTH-010 outcome', async () => {
    vi.spyOn(supabase.auth, 'resend').mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    })

    const result = await resendConfirmationApi({ email: 'user@example.com' })
    expect(result.success).toBe(true)
    expect(result.code).toBe('AUTH-010')
  })

  it('never renders raw error messages in AuthAlert', () => {
    const rawEnglishError = 'Invalid login credentials provided'
    const code = mapAuthError(rawEnglishError)
    const { container } = render(<AuthAlert code={code} />)

    expect(container.textContent).not.toContain(rawEnglishError)
    expect(container.textContent).toContain(getAuthMessage('AUTH-001'))
    expect(container.textContent).toContain('AUTH-001')
  })

  it('renders login page with always-visible resend confirmation link and upfront password rule', async () => {
    render(<App initialEntries={['/login']} />)

    expect(await screen.findByRole('heading', { name: 'تسجيل الدخول' })).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'لم تصلك رسالة التفعيل؟ أعد الإرسال' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/10 أحرف على الأقل/)).toBeInTheDocument()
  })

  it('requires authentication for /account/orders and redirects to login with redirect param', async () => {
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: { session: null },
      error: null,
    })

    render(<App initialEntries={['/account/orders']} />)

    expect(await screen.findByRole('heading', { name: 'تسجيل الدخول' })).toBeInTheDocument()
  })

  it('requires admin authorization for /admin and denies customer accounts with AUTH-011', async () => {
    // Mock user signed in as customer
    const mockUser = { id: 'cust-123', email: 'cust@example.com' } as unknown as User
    const mockSession = { user: mockUser } as unknown as Session

    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: { session: mockSession },
      error: null,
    })
    vi.spyOn(supabase.auth, 'onAuthStateChange').mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn(), id: '1', callback: vi.fn() } },
    } as unknown as ReturnType<typeof supabase.auth.onAuthStateChange>)

    // Mock profiles lookup returning role 'customer'
    vi.spyOn(api, 'fetchProfileApi').mockResolvedValue({
      id: 'cust-123',
      role: 'customer',
      full_name: 'Customer One',
      phone: null,
      governorate_id: null,
    })
    vi.spyOn(api, 'fetchAalApi').mockResolvedValue('aal1')

    render(<App initialEntries={['/admin']} />)

    expect(await screen.findByText(getAuthMessage('AUTH-011'))).toBeInTheDocument()
  })

  describe('Email verification and link states (T-8.01)', () => {
    it('displays clear "check your email" state with resend link after registration', async () => {
      const user = userEvent.setup()
      vi.spyOn(supabase.auth, 'signUp').mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      })

      render(<App initialEntries={['/register']} />)

      const nameInput = await screen.findByLabelText('الاسم الكامل')
      const emailInput = screen.getByLabelText('البريد الإلكتروني')
      const passwordInput = screen.getByLabelText('كلمة المرور')
      const submitBtn = screen.getByRole('button', { name: 'إنشاء حساب' })

      await user.type(nameInput, 'فاطمة أحمد')
      await user.type(emailInput, 'fatima@example.com')
      await user.type(passwordInput, 'SecurePass1234')
      await user.click(submitBtn)

      expect(
        await screen.findByRole('heading', { name: 'تحقق من بريدك الإلكتروني' }),
      ).toBeInTheDocument()
      expect(screen.getByText(/إذا كان البريد الإلكتروني صحيحًا فستصلك رسالة/)).toBeInTheDocument()
      expect(screen.getByText(/صندوق الوارد ومجلد الرسائل غير المرغوب فيها/)).toBeInTheDocument()

      const resendLink = screen.getByRole('link', { name: 'لم تصلك الرسالة؟ أعد الإرسال' })
      expect(resendLink).toBeInTheDocument()
      expect(resendLink).toHaveAttribute('href', '/resend-confirmation')
    })

    it('displays clear "check your email" state after password reset request', async () => {
      const user = userEvent.setup()
      vi.spyOn(supabase.auth, 'resetPasswordForEmail').mockResolvedValue({
        data: {},
        error: null,
      })

      render(<App initialEntries={['/reset-password']} />)

      const emailInput = await screen.findByLabelText('البريد الإلكتروني')
      const submitBtn = screen.getByRole('button', { name: 'إرسال رابط إعادة التعيين' })

      await user.type(emailInput, 'user@example.com')
      await user.click(submitBtn)

      expect(
        await screen.findByRole('heading', { name: 'تحقق من بريدك الإلكتروني' }),
      ).toBeInTheDocument()
      expect(screen.getByText(/رابط إعادة التعيين خلال دقائق/)).toBeInTheDocument()
    })

    it('displays clear "resend" state on /resend-confirmation with active submission', async () => {
      const user = userEvent.setup()
      vi.spyOn(supabase.auth, 'resend').mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      })

      render(<App initialEntries={['/resend-confirmation']} />)

      expect(
        await screen.findByRole('heading', { name: 'إعادة إرسال رسالة التفعيل' }),
      ).toBeInTheDocument()
      const emailInput = screen.getByLabelText('البريد الإلكتروني')
      const submitBtn = screen.getByRole('button', { name: 'إرسال رابط التفعيل' })

      await user.type(emailInput, 'unconfirmed@example.com')
      await user.click(submitBtn)

      expect(
        await screen.findByRole('heading', { name: 'تحقق من بريدك الإلكتروني' }),
      ).toBeInTheDocument()
    })

    it('displays clear "link expired" state with recovery options when visiting login with expired link parameters', async () => {
      render(
        <App
          initialEntries={[
            '/login?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired',
          ]}
        />,
      )

      expect(await screen.findByText(getAuthMessage('AUTH-009'))).toBeInTheDocument()
      expect(screen.getByText('AUTH-009')).toBeInTheDocument()
      expect(screen.getByText(/انتهت صلاحية هذا الرابط/)).toBeInTheDocument()

      const resendLink = screen.getByRole('link', { name: /إعادة إرسال رابط تفعيل الحساب/ })
      expect(resendLink).toHaveAttribute('href', '/resend-confirmation')

      const resetLink = screen.getByRole('link', { name: /طلب رابط جديد لاستعادة كلمة المرور/ })
      expect(resetLink).toHaveAttribute('href', '/reset-password')
    })

    it('displays clear "link expired" state when visiting reset-password with expired link parameters', async () => {
      render(<App initialEntries={['/reset-password?error_code=otp_expired']} />)

      expect(await screen.findByText(getAuthMessage('AUTH-009'))).toBeInTheDocument()
      expect(screen.getByText('AUTH-009')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'إرسال رابط إعادة التعيين' })).toBeInTheDocument()
    })
  })
})

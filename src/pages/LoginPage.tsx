import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthAlert } from '../features/auth/authErrors'
import { useAuth } from '../features/auth/AuthProvider'
import { Turnstile } from '../features/auth/Turnstile'
import type { AuthErrorCode } from '../features/auth/types'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string | undefined>()
  const [errorCode, setErrorCode] = useState<AuthErrorCode | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const params = new URLSearchParams(location.search)
  const redirectTo = params.get('redirect') || '/'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErrorCode(null)

    if (!email.trim() || !password) {
      setErrorCode('AUTH-001')
      return
    }

    if (password.length < 10) {
      setErrorCode('AUTH-008')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await signIn({
        email: email.trim(),
        password,
        captchaToken,
      })

      if (!result.success) {
        setErrorCode(result.code || 'AUTH-001')
      } else {
        navigate(redirectTo, { replace: true })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-h2 font-bold font-accent text-(--color-brand)">تسجيل الدخول</h1>
          <p className="text-small text-(--color-text-muted)">
            أدخل بريدك الإلكتروني لتسجيل الدخول إلى حسابك ومتابعة طلباتك.
          </p>
        </div>

        {errorCode && <AuthAlert code={errorCode} />}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1">
            <label htmlFor="email-input" className="text-small font-semibold text-(--color-text)">
              البريد الإلكتروني
            </label>
            <input
              id="email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              className="w-full h-11 rounded-(--radius-pill) border border-(--color-border-input) bg-(--color-bg) px-4 text-small text-(--color-text) focus:border-(--color-brand) focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password-input"
                className="text-small font-semibold text-(--color-text)"
              >
                كلمة المرور
              </label>
              <Link
                to="/reset-password"
                className="text-caption font-semibold text-(--color-brand) hover:underline"
              >
                نسيت كلمة المرور؟
              </Link>
            </div>
            <input
              id="password-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full h-11 rounded-(--radius-pill) border border-(--color-border-input) bg-(--color-bg) px-4 text-small text-(--color-text) focus:border-(--color-brand) focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
            />
            <p className="text-caption text-(--color-text-muted)">
              يجب أن تحتوي كلمة المرور على 10 أحرف على الأقل.
            </p>
          </div>

          <Turnstile onVerify={(token) => setCaptchaToken(token)} />

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 rounded-(--radius-pill) bg-(--color-brand) text-small font-semibold text-(--color-brand-contrast) transition-opacity hover:opacity-90 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
          >
            {isSubmitting ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>

        {/* Neutral "resend confirmation" link is ALWAYS visible on sign-in */}
        <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface-tint) p-3 text-center">
          <Link
            to="/resend-confirmation"
            className="text-small font-semibold text-(--color-brand) hover:underline"
          >
            لم تصلك رسالة التفعيل؟ أعد الإرسال
          </Link>
        </div>

        <div className="text-center text-small text-(--color-text-muted)">
          ليس لديك حساب؟{' '}
          <Link to="/register" className="font-semibold text-(--color-brand) hover:underline">
            إنشاء حساب جديد
          </Link>
        </div>
      </div>
    </div>
  )
}

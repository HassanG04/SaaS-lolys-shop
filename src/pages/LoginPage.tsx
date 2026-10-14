import { useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthAlert } from '../features/auth/AuthAlert'
import { mapAuthError } from '../features/auth/authErrors'
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
  const [formErrorCode, setFormErrorCode] = useState<AuthErrorCode | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const params = new URLSearchParams(location.search)
  const redirectTo = params.get('redirect') || '/'

  // Detect expired or invalid link errors returned via URL query or hash from Supabase
  const urlErrorCode = useMemo(() => {
    const searchParams = new URLSearchParams(location.search)
    const rawHash = location.hash.startsWith('#') ? location.hash.slice(1) : location.hash
    const hashParams = new URLSearchParams(rawHash)

    const errorParam = searchParams.get('error') || hashParams.get('error')
    const errorCodeParam = searchParams.get('error_code') || hashParams.get('error_code')
    const errorDescParam =
      searchParams.get('error_description') || hashParams.get('error_description')

    if (errorParam || errorCodeParam || errorDescParam) {
      const combined = `${errorCodeParam || ''} ${errorDescParam || ''} ${errorParam || ''}`
      return mapAuthError(combined)
    }
    return null
  }, [location.search, location.hash])

  const errorCode = formErrorCode || urlErrorCode

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormErrorCode(null)

    if (!email.trim() || !password) {
      setFormErrorCode('AUTH-001')
      return
    }

    if (password.length < 10) {
      setFormErrorCode('AUTH-008')
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
        setFormErrorCode(result.code || 'AUTH-001')
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

        {errorCode && (
          <div className="space-y-3">
            <AuthAlert code={errorCode} />
            {errorCode === 'AUTH-009' && (
              <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface-tint) p-3 text-small text-(--color-text) space-y-2">
                <p className="font-semibold text-(--color-brand)">
                  انتهت صلاحية هذا الرابط. يمكنك طلب رابط جديد:
                </p>
                <div className="flex flex-wrap gap-2 text-caption">
                  <Link
                    to="/resend-confirmation"
                    className="font-semibold text-(--color-brand) hover:underline"
                  >
                    إعادة إرسال رابط تفعيل الحساب &larr;
                  </Link>
                  <span className="text-(--color-text-muted)">•</span>
                  <Link
                    to="/reset-password"
                    className="font-semibold text-(--color-brand) hover:underline"
                  >
                    طلب رابط جديد لاستعادة كلمة المرور &larr;
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

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

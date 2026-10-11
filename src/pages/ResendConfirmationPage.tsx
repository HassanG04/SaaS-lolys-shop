import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AuthAlert } from '../features/auth/authErrors'
import { useAuth } from '../features/auth/AuthProvider'
import { Turnstile } from '../features/auth/Turnstile'
import type { AuthErrorCode } from '../features/auth/types'

export default function ResendConfirmationPage() {
  const { resendConfirmation } = useAuth()

  const [email, setEmail] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string | undefined>()
  const [statusMessage, setStatusMessage] = useState<AuthErrorCode | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setStatusMessage(null)

    if (!email.trim()) {
      setStatusMessage('AUTH-001')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await resendConfirmation({
        email: email.trim(),
        captchaToken,
      })

      // Always display neutral outcome AUTH-010
      setStatusMessage(result.code || 'AUTH-010')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-h2 font-bold font-accent text-(--color-brand)">
            إعادة إرسال رسالة التفعيل
          </h1>
          <p className="text-small text-(--color-text-muted)">
            أدخل بريدك الإلكتروني لإعادة إرسال رابط تأكيد الحساب.
          </p>
        </div>

        {statusMessage && <AuthAlert code={statusMessage} />}

        {statusMessage !== 'AUTH-010' && (
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

            <Turnstile onVerify={(token) => setCaptchaToken(token)} />

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 rounded-(--radius-pill) bg-(--color-brand) text-small font-semibold text-(--color-brand-contrast) transition-opacity hover:opacity-90 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
            >
              {isSubmitting ? 'جارٍ الإرسال...' : 'إرسال رابط التفعيل'}
            </button>
          </form>
        )}

        <div className="text-center text-small text-(--color-text-muted)">
          العودة إلى{' '}
          <Link to="/login" className="font-semibold text-(--color-brand) hover:underline">
            تسجيل الدخول
          </Link>
        </div>
      </div>
    </div>
  )
}

import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AuthAlert } from '../features/auth/AuthAlert'
import { useAuth } from '../features/auth/AuthProvider'
import { Turnstile } from '../features/auth/Turnstile'
import type { AuthErrorCode } from '../features/auth/types'
import { useLanguage } from '@/i18n/LanguageProvider'
import { Button } from '@/components/ui/Button'

export default function RegisterPage() {
  const { signUp, resendConfirmation } = useAuth()
  const { t } = useLanguage()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | undefined>()
  const [statusMessage, setStatusMessage] = useState<AuthErrorCode | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendSent, setResendSent] = useState(false)

  async function handleResend() {
    if (isResending || !email.trim()) return
    setIsResending(true)
    setResendSent(false)
    try {
      await resendConfirmation({ email: email.trim() })
      setResendSent(true)
    } finally {
      setIsResending(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setStatusMessage(null)

    if (!email.trim() || !password || !confirmPassword) {
      setStatusMessage('AUTH-001')
      return
    }

    if (password.length < 10) {
      setStatusMessage('AUTH-008')
      return
    }

    if (password !== confirmPassword) {
      setStatusMessage('AUTH-013')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await signUp({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        captchaToken,
      })

      // Always display neutral outcome AUTH-010 (even on existing email)
      setStatusMessage(result.code || 'AUTH-010')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="auth-panel rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-h2 font-bold font-accent text-(--color-brand)">{t.auth.register}</h1>
          <p className="text-small text-(--color-text-muted)">{t.auth.registerSubtitle}</p>
        </div>

        {statusMessage === 'AUTH-010' ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface-tint) p-6 text-center space-y-4"
          >
            <div className="mx-auto flex size-12 items-center justify-center rounded-(--radius-pill) bg-(--color-brand)/10 text-(--color-brand)">
              <svg
                className="size-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
            <div className="space-y-1.5">
              <h2 className="text-h3 font-bold font-accent text-(--color-brand)">
                {t.auth.checkYourEmail}
              </h2>
              <p className="text-small text-(--color-text)">{t.auth.checkEmailDesc}</p>
              <p className="text-caption text-(--color-text-muted)">{t.auth.checkSpamFolder}</p>
            </div>
            <div className="pt-2 space-y-2">
              {resendSent ? (
                <p
                  role="status"
                  aria-live="polite"
                  className="text-small font-semibold text-(--color-brand)"
                >
                  {t.auth.checkEmailDesc}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending}
                  className="inline-flex h-10 items-center justify-center rounded-(--radius-pill) border border-(--color-border-input) bg-(--color-surface) px-4 text-small font-semibold text-(--color-brand) hover:bg-(--color-surface-2) focus:outline-none focus:ring-2 focus:ring-(--color-focus) disabled:opacity-50"
                >
                  {isResending ? t.auth.sendingConfirmationLink : t.auth.resendNoticeLink}
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {statusMessage && <AuthAlert code={statusMessage} />}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-1">
                <label
                  htmlFor="name-input"
                  className="text-small font-semibold text-(--color-text)"
                >
                  {t.auth.fullName}
                </label>
                <input
                  id="name-input"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t.auth.fullNamePlaceholder}
                  className="w-full h-11 rounded-(--radius-pill) border border-(--color-border-input) bg-(--color-bg) px-4 text-small text-(--color-text) focus:border-(--color-brand) focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="email-input"
                  className="text-small font-semibold text-(--color-text)"
                >
                  {t.auth.email}
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
                <label
                  htmlFor="password-input"
                  className="text-small font-semibold text-(--color-text)"
                >
                  {t.auth.password}
                </label>
                <div className="relative flex items-center">
                  <input
                    id="password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full h-11 rounded-(--radius-pill) border border-(--color-border-input) bg-(--color-bg) ps-4 pe-11 text-small text-(--color-text) focus:border-(--color-brand) focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? t.auth.hidePassword : t.auth.showPassword}
                    className="absolute end-3 inline-flex size-7 items-center justify-center rounded-(--radius-pill) text-(--color-text-muted) hover:text-(--color-brand) focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
                  >
                    {showPassword ? (
                      <svg
                        className="size-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                        <line x1="2" x2="22" y1="2" y2="22" />
                      </svg>
                    ) : (
                      <svg
                        className="size-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-caption text-(--color-text-muted)">{t.auth.passwordMinLength}</p>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="confirm-password-input"
                  className="text-small font-semibold text-(--color-text)"
                >
                  {t.auth.confirmPassword}
                </label>
                <div className="relative flex items-center">
                  <input
                    id="confirm-password-input"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full h-11 rounded-(--radius-pill) border border-(--color-border-input) bg-(--color-bg) ps-4 pe-11 text-small text-(--color-text) focus:border-(--color-brand) focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? t.auth.hidePassword : t.auth.showPassword}
                    className="absolute end-3 inline-flex size-7 items-center justify-center rounded-(--radius-pill) text-(--color-text-muted) hover:text-(--color-brand) focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
                  >
                    {showConfirmPassword ? (
                      <svg
                        className="size-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                        <line x1="2" x2="22" y1="2" y2="22" />
                      </svg>
                    ) : (
                      <svg
                        className="size-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <Turnstile onVerify={(token) => setCaptchaToken(token)} />

              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-11 w-full text-small disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
              >
                {isSubmitting ? t.auth.creatingAccount : t.auth.registerButton}
              </Button>
            </form>
          </>
        )}

        <div className="text-center text-small text-(--color-text-muted)">
          {t.auth.haveAccount}{' '}
          <Link to="/login" className="font-semibold text-(--color-brand) hover:underline">
            {t.auth.login}
          </Link>
        </div>
      </div>
    </div>
  )
}

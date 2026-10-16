import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Ltr } from '../components/ui/Ltr'
import { PearlLoader } from '../components/ui/PearlLoader'
import { AuthAlert } from '../features/auth/AuthAlert'
import { useAuth } from '../features/auth/AuthProvider'
import type { AuthErrorCode, MfaEnrollResult } from '../features/auth/types'
import { useLanguage } from '../i18n/LanguageProvider'

export default function MfaEnrollPage() {
  const { t } = useLanguage()
  const { enrollTotp, challengeAndVerify } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isAdminMfa = location.pathname.startsWith('/admin')

  const [enrollData, setEnrollData] = useState<MfaEnrollResult | null>(null)
  const [loadingEnroll, setLoadingEnroll] = useState(false)
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorCode, setErrorCode] = useState<AuthErrorCode | null>(null)

  const startEnrollment = async () => {
    setLoadingEnroll(true)
    setErrorCode(null)
    try {
      const res = await enrollTotp()
      if (res.data) setEnrollData(res.data)
      else setErrorCode(res.error || 'AUTH-016')
    } catch {
      setErrorCode('AUTH-016')
    } finally {
      setLoadingEnroll(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!enrollData || !/^\d{6}$/.test(code.trim())) {
      setErrorCode('AUTH-006')
      return
    }

    setSubmitting(true)
    setErrorCode(null)

    try {
      const result = await challengeAndVerify(enrollData.id, code.trim())
      if (result.success) {
        navigate(isAdminMfa ? '/admin' : '/account/security', { replace: true })
      } else {
        setErrorCode(result.code || 'AUTH-006')
      }
    } catch {
      setErrorCode('AUTH-006')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <div className="mb-6 text-center">
          <h1 className="text-h2 font-bold text-brand">{t('mfa.enrollTitle')}</h1>
          <p className="mt-2 text-small text-text-muted">{t('mfa.enrollDescription')}</p>
        </div>

        {isAdminMfa && <AuthAlert code="ADM-002" className="mb-6" />}
        {errorCode && <AuthAlert code={errorCode} className="mb-6" />}

        {loadingEnroll ? (
          <div className="flex h-48 items-center justify-center text-brand">
            <PearlLoader loading />
          </div>
        ) : enrollData ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col items-center justify-center rounded-card border border-border bg-surface p-4 text-center">
              {enrollData.totp.qr_code && (
                <div className="mb-3 size-48 overflow-hidden rounded-chip border border-border bg-surface">
                  <img
                    src={enrollData.totp.qr_code}
                    alt={t('mfa.qrAlt')}
                    className="size-full object-contain p-2"
                  />
                </div>
              )}

              <p className="mb-1 text-caption font-medium text-text-muted">{t('mfa.manualKey')}</p>
              <div className="rounded-chip bg-surface-tint p-2 text-caption font-mono font-semibold text-brand select-all">
                <Ltr>{enrollData.totp.secret}</Ltr>
              </div>

              <p className="mt-3 text-caption text-text-muted">{t('mfa.secondDevice')}</p>
            </div>

            <Input
              label={t('mfa.appCode')}
              name="totpCode"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              dir="ltr"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              disabled={submitting}
              className="text-center font-mono tracking-widest text-h3"
            />

            <Button type="submit" variant="primary" disabled={submitting} className="w-full">
              {submitting ? t('mfa.verifying') : t('mfa.activate')}
            </Button>
          </form>
        ) : (
          <Button className="w-full" onClick={() => void startEnrollment()}>
            {errorCode ? t('mfa.retry') : t('mfa.start')}
          </Button>
        )}
      </Card>
    </div>
  )
}

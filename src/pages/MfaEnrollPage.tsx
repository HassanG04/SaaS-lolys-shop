import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Ltr } from '../components/ui/Ltr'
import { PearlLoader } from '../components/ui/PearlLoader'
import { AuthAlert } from '../features/auth/authErrors'
import { useAuth } from '../features/auth/AuthProvider'
import type { AuthErrorCode, MfaEnrollResult } from '../features/auth/types'

export default function MfaEnrollPage() {
  const { enrollTotp, challengeAndVerify } = useAuth()
  const navigate = useNavigate()

  const [enrollData, setEnrollData] = useState<MfaEnrollResult | null>(null)
  const [loadingEnroll, setLoadingEnroll] = useState(true)
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorCode, setErrorCode] = useState<AuthErrorCode | null>(null)

  useEffect(() => {
    let isMounted = true

    void enrollTotp('Lolys Admin')
      .then((res) => {
        if (!isMounted) return
        if (res.data) {
          setEnrollData(res.data)
        } else if (res.error) {
          setErrorCode(res.error)
        }
      })
      .finally(() => {
        if (isMounted) setLoadingEnroll(false)
      })

    return () => {
      isMounted = false
    }
  }, [enrollTotp])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!enrollData || code.trim().length !== 6) {
      setErrorCode('AUTH-006')
      return
    }

    setSubmitting(true)
    setErrorCode(null)

    try {
      const result = await challengeAndVerify(enrollData.id, code.trim())
      if (result.success) {
        navigate('/admin', { replace: true })
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
          <h1 className="text-h2 font-bold text-brand">إعداد التحقق بخطوتين (TOTP)</h1>
          <p className="mt-2 text-small text-text-muted">
            لحماية لوحة التحكم، يجب تفعيل المصادقة الثنائية عبر تطبيق مثل Google Authenticator أو
            1Password.
          </p>
        </div>

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
                    alt="رمز الاستجابة السريعة للتحقق بخطوتين"
                    className="size-full object-contain p-2"
                  />
                </div>
              )}

              <p className="mb-1 text-caption font-medium text-text-muted">
                المفتاح اليدوي للإدخال:
              </p>
              <div className="rounded-chip bg-surface-tint p-2 text-caption font-mono font-semibold text-brand select-all">
                <Ltr>{enrollData.totp.secret}</Ltr>
              </div>

              <p className="mt-3 text-caption text-text-muted">
                نوصي بمسح الرمز باستخدام جهاز إضافي لضمان عدم فقدان الوصول.
              </p>
            </div>

            <Input
              label="رمز التحقق من التطبيق (6 أرقام)"
              name="totpCode"
              type="text"
              inputMode="numeric"
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
              {submitting ? 'جارٍ التحقق...' : 'تأكيد وتفعيل'}
            </Button>
          </form>
        ) : (
          <div className="text-center text-small text-danger">
            تعذر توليد بيانات التحقق بخطوتين.
          </div>
        )}
      </Card>
    </div>
  )
}

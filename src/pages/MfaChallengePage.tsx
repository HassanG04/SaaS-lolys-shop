import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { AuthAlert } from '../features/auth/authErrors'
import { useAuth } from '../features/auth/AuthProvider'
import type { AuthErrorCode } from '../features/auth/types'

export default function MfaChallengePage() {
  const { factors, challengeAndVerify } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorCode, setErrorCode] = useState<AuthErrorCode | null>('AUTH-005')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (code.trim().length !== 6) {
      setErrorCode('AUTH-006')
      return
    }

    const targetFactor = factors.find((f) => f.status === 'verified') || factors[0]
    if (!targetFactor) {
      setErrorCode('AUTH-005')
      return
    }

    setSubmitting(true)
    setErrorCode(null)

    try {
      const result = await challengeAndVerify(targetFactor.id, code.trim())
      if (result.success) {
        const redirectTo = searchParams.get('redirect') || '/admin'
        navigate(redirectTo, { replace: true })
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
          <h1 className="text-h2 font-bold text-brand">التحقق بخطوتين</h1>
          <p className="mt-2 text-small text-text-muted">
            أدخل الرمز المكوّن من 6 أرقام من تطبيق المصادقة للمتابعة.
          </p>
        </div>

        {errorCode && <AuthAlert code={errorCode} className="mb-6" />}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="رمز التحقق (6 أرقام)"
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
            {submitting ? 'جارٍ التحقق...' : 'تأكيد الرمز والمتابعة'}
          </Button>
        </form>
      </Card>
    </div>
  )
}

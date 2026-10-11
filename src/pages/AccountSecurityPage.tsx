import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Ltr } from '../components/ui/Ltr'
import { AuthAlert } from '../features/auth/authErrors'
import { useAal, useAuth } from '../features/auth/AuthProvider'
import type { AuthErrorCode } from '../features/auth/types'

export default function AccountSecurityPage() {
  const { factors, unenrollFactor } = useAuth()
  const { isAal2 } = useAal()
  const [unenrollError, setUnenrollError] = useState<AuthErrorCode | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const handleUnenroll = async (factorId: string) => {
    if (!isAal2) {
      setUnenrollError('AUTH-005')
      return
    }
    setProcessingId(factorId)
    setUnenrollError(null)
    try {
      const result = await unenrollFactor(factorId)
      if (!result.success && result.code) {
        setUnenrollError(result.code)
      }
    } catch {
      setUnenrollError('AUTH-001')
    } finally {
      setProcessingId(null)
    }
  }

  const hasFactors = factors.length > 0

  return (
    <div className="space-y-6">
      <Card className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 sm:p-8">
        <div>
          <h1 className="text-h1 font-bold font-accent text-brand">الأمان والتحقق بخطوتين</h1>
          <p className="mt-2 text-body text-text-muted">
            إدارة أمان الحساب وتفعيل التحقق بخطوتين (MFA) لحماية بياناتك.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/account/orders"
            className="inline-flex h-11 items-center justify-center rounded-pill border border-border-input bg-surface-2 px-4 text-small font-semibold text-text hover:border-brand focus:outline-none focus:ring-2 focus:ring-focus"
          >
            العودة لطلباتي
          </Link>
        </div>
      </Card>

      {unenrollError && <AuthAlert code={unenrollError} />}

      <Card className="p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-h2 font-semibold text-text">حالة التحقق بخطوتين (MFA)</h2>
          <Badge
            variant={hasFactors ? 'sale' : 'sold-out'}
            label={hasFactors ? 'مفعّل' : 'غير مفعّل'}
          />
        </div>

        <p className="text-body text-text-muted">
          التحقق بخطوتين يوفر حماية إضافية لحسابك باستخدام تطبيق المصادقة (Authenticator app). يمنع
          الوصول إلى حسابك حتى لو تم تسريب كلمة المرور.
        </p>

        {hasFactors && (
          <div className="space-y-4">
            <h3 className="text-h3 font-semibold text-brand">الأجهزة المرتبطة:</h3>
            <div className="divide-y divide-border rounded-card border border-border bg-surface">
              {factors.map((factor) => (
                <div key={factor.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-semibold text-text">
                      {factor.friendly_name || 'تطبيق المصادقة'}
                    </p>
                    <p className="text-caption text-text-muted">
                      المعرف: <Ltr>{factor.id.slice(0, 8)}...</Ltr>
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="default"
                    disabled={processingId === factor.id}
                    onClick={() => handleUnenroll(factor.id)}
                    className="text-danger hover:bg-surface-tint"
                  >
                    {processingId === factor.id ? 'جارٍ الإلغاء...' : 'إلغاء التفعيل'}
                  </Button>
                </div>
              ))}
            </div>

            <p className="text-caption text-text-muted">
              نوصي بإضافة جهاز ثانٍ احتياطي لضمان عدم فقدان الوصول إلى حسابك في حال فقدان جهازك
              الأساسي.
            </p>
          </div>
        )}

        <div className="pt-2">
          <Link to="/account/mfa/enroll">
            <Button variant="primary">
              {hasFactors ? 'إضافة جهاز مصادقة إضافي' : 'تفعيل التحقق بخطوتين الآن'}
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}

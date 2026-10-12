import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Ltr } from '../components/ui/Ltr'
import { AuthAlert } from '../features/auth/AuthAlert'
import { useAal, useAuth } from '../features/auth/AuthProvider'
import type { AuthErrorCode } from '../features/auth/types'

export default function AccountSecurityPage() {
  const { user, factors, unenrollFactor, updatePassword, updateEmail, signOut } = useAuth()
  const { isAal2 } = useAal()
  const navigate = useNavigate()

  // Password change state
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSubmitting, setPasswordSubmitting] = useState(false)
  const [passwordError, setPasswordError] = useState<AuthErrorCode | null>(null)
  const [passwordMismatch, setPasswordMismatch] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  // Email change state
  const [newEmail, setNewEmail] = useState('')
  const [emailSubmitting, setEmailSubmitting] = useState(false)
  const [emailNotice, setEmailNotice] = useState<AuthErrorCode | null>(null)

  // Global sign out state
  const [globalSignOutLoading, setGlobalSignOutLoading] = useState(false)

  // MFA unenroll state
  const [unenrollError, setUnenrollError] = useState<AuthErrorCode | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordMismatch(false)
    setPasswordSuccess(false)

    if (password.length < 10) {
      setPasswordError('AUTH-008')
      return
    }

    if (password !== confirmPassword) {
      setPasswordMismatch(true)
      return
    }

    setPasswordSubmitting(true)
    try {
      const result = await updatePassword(password)
      if (result.success) {
        setPasswordSuccess(true)
        setPassword('')
        setConfirmPassword('')
      } else if (result.code) {
        setPasswordError(result.code)
      } else {
        setPasswordError('AUTH-001')
      }
    } catch {
      setPasswordError('AUTH-001')
    } finally {
      setPasswordSubmitting(false)
    }
  }

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setEmailNotice(null)

    if (!newEmail.trim()) return

    setEmailSubmitting(true)
    try {
      const result = await updateEmail(newEmail.trim())
      if (result.code) {
        setEmailNotice(result.code)
      } else {
        setEmailNotice('AUTH-010')
      }
      setNewEmail('')
    } catch {
      setEmailNotice('AUTH-010')
    } finally {
      setEmailSubmitting(false)
    }
  }

  const handleGlobalSignOut = async () => {
    setGlobalSignOutLoading(true)
    try {
      await signOut({ scope: 'global' })
      navigate('/login', { replace: true })
    } finally {
      setGlobalSignOutLoading(false)
    }
  }

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
            إدارة أمان الحساب وتحديث كلمة المرور والبريد والتحقق بخطوتين.
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

      {/* Change Password Card */}
      <Card className="p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-h2 font-semibold text-text">تغيير كلمة المرور</h2>
          <p className="mt-1 text-small text-text-muted">
            استخدم كلمة مرور قوية مكونة من 10 أحرف أو أكثر. قد يطلب النظام إعادة تسجيل الدخول للتحقق
            من هويتك.
          </p>
        </div>

        {passwordError && <AuthAlert code={passwordError} />}
        {passwordMismatch && (
          <div
            role="alert"
            className="rounded-card border border-danger bg-surface p-4 text-small font-semibold text-danger"
          >
            كلمتا المرور غير متطابقتين.
          </div>
        )}
        {passwordSuccess && (
          <div
            role="status"
            className="rounded-card border border-border bg-surface-tint p-4 text-small font-semibold text-text"
          >
            تم تحديث كلمة المرور بنجاح.
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="max-w-md space-y-4">
          <Input
            id="new-password"
            label="كلمة المرور الجديدة"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••"
            required
            disabled={passwordSubmitting}
            hint="10 أحرف على الأقل"
          />

          <Input
            id="confirm-new-password"
            label="تأكيد كلمة المرور الجديدة"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••••"
            required
            disabled={passwordSubmitting}
          />

          <Button type="submit" variant="primary" disabled={passwordSubmitting}>
            {passwordSubmitting ? 'جارٍ الحفظ...' : 'تحديث كلمة المرور'}
          </Button>
        </form>
      </Card>

      {/* Change Email Card */}
      <Card className="p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-h2 font-semibold text-text">تغيير البريد الإلكتروني</h2>
          <p className="mt-1 text-small text-text-muted">
            البريد المسجل حاليًا:{' '}
            <span className="font-semibold text-brand">
              <Ltr>{user?.email || '—'}</Ltr>
            </span>
          </p>
          <p className="mt-1 text-caption text-text-muted">
            يتطلب تغيير البريد الإلكتروني تأكيد الرابط المرسل إلى كلا العنوانين (الحالي والجديد)
            لحماية حسابك.
          </p>
        </div>

        {emailNotice && <AuthAlert code={emailNotice} />}

        <form onSubmit={handleEmailSubmit} className="max-w-md space-y-4">
          <Input
            id="new-email"
            label="البريد الإلكتروني الجديد"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="new-email@example.com"
            required
            disabled={emailSubmitting}
          />

          <Button type="submit" variant="primary" disabled={emailSubmitting}>
            {emailSubmitting ? 'جارٍ الإرسال...' : 'تحديث البريد الإلكتروني'}
          </Button>
        </form>
      </Card>

      {/* Two-factor authentication Card */}
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

        {unenrollError && <AuthAlert code={unenrollError} />}

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

      {/* Sign Out of All Devices Card */}
      <Card className="p-6 sm:p-8 space-y-4">
        <div>
          <h2 className="text-h2 font-semibold text-text">تسجيل الخروج من كافة الأجهزة</h2>
          <p className="mt-1 text-small text-text-muted">
            إذا كنت تشك في نشاط غير مصرح به أو سجلت الدخول من أجهزة عامة، يمكنك إنهاء جميع الجلسات
            النشطة فورًا.
          </p>
        </div>

        <div>
          <Button variant="secondary" disabled={globalSignOutLoading} onClick={handleGlobalSignOut}>
            {globalSignOutLoading ? 'جارٍ تسجيل الخروج...' : 'تسجيل الخروج من كافة الأجهزة'}
          </Button>
        </div>
      </Card>
    </div>
  )
}

import { Link } from 'react-router-dom'

export default function AccountSecurityPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-h1 font-bold font-accent text-(--color-brand)">
            الأمان والتحقق بخطوتين
          </h1>
          <p className="mt-2 text-body text-(--color-text-muted)">
            إدارة أمان الحساب وتفعيل التحقق بخطوتين (MFA).
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/account/orders"
            className="inline-flex h-11 items-center justify-center rounded-(--radius-pill) border border-(--color-border-input) bg-(--color-surface-2) px-4 text-small font-semibold text-(--color-text) hover:border-(--color-brand) focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
          >
            العودة لطلباتي
          </Link>
        </div>
      </div>

      <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-6 sm:p-8 space-y-4">
        <h2 className="text-h2 font-semibold text-(--color-text)">حالة التحقق بخطوتين (MFA)</h2>
        <p className="text-body text-(--color-text-muted)">
          التحقق بخطوتين يوفر حماية إضافية لحسابك باستخدام تطبيق المصادقة (Authenticator app).
        </p>
        <button
          type="button"
          className="inline-flex h-11 items-center justify-center rounded-(--radius-pill) bg-(--color-brand) px-6 text-small font-semibold text-(--color-brand-contrast) transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
        >
          تفعيل التحقق بخطوتين
        </button>
      </div>
    </div>
  )
}

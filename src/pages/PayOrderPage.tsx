import { useParams, Link } from 'react-router-dom'

export default function PayOrderPage() {
  const { orderId } = useParams<{ orderId: string }>()

  return (
    <div className="space-y-6">
      <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-6 sm:p-8">
        <h1 className="text-h1 font-bold font-accent text-(--color-brand)">دفع الطلب #{orderId}</h1>
        <p className="mt-2 text-body text-(--color-text-muted)">
          صفحة تأكيد الدفع ورفع إثبات التحويل عبر إنستاباي.
        </p>
      </div>

      <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-6 sm:p-8 space-y-4">
        <div className="rounded-(--radius-chip) border border-(--color-border) bg-(--color-surface-tint) p-4 text-small text-(--color-brand)">
          امسح رمز QR من تطبيق البنك أو إنستاباي وارفع إشعار التحويل قبل انتهاء مهلة الدفع.
        </div>
        <div className="flex gap-4">
          <Link
            to="/account/orders"
            className="inline-flex h-11 items-center justify-center rounded-(--radius-pill) bg-(--color-brand) px-6 text-small font-semibold text-(--color-brand-contrast) transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
          >
            متابعة طلباتي
          </Link>
          <Link
            to="/"
            className="inline-flex h-11 items-center justify-center rounded-(--radius-pill) border border-(--color-border-input) bg-(--color-surface-2) px-6 text-small font-semibold text-(--color-text) hover:border-(--color-brand) focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
          >
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  )
}

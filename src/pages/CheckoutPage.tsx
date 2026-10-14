import { Link } from 'react-router-dom'

export default function CheckoutPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-6 sm:p-8">
        <h1 className="text-h1 font-bold font-accent text-(--color-brand)">
          إتمام الطلب وبيانات التوصيل
        </h1>
        <p className="mt-2 text-body text-(--color-text-muted)">
          أدخل بيانات الشحن والتوصيل واختر طريقة الدفع المناسبة.
        </p>
      </div>

      <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-6 sm:p-8 space-y-6">
        <p className="text-body text-(--color-text)">
          نموذج إتمام الطلب وتحديد المحافظة وطريقة الدفع (الدفع عند الاستلام أو إنستاباي).
        </p>
        <div className="flex gap-4">
          <Link
            to="/cart"
            className="inline-flex h-11 items-center justify-center rounded-(--radius-pill) border border-(--color-border-input) bg-(--color-surface-2) px-6 text-small font-semibold text-(--color-text) hover:border-(--color-brand) focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
          >
            العودة إلى السلة
          </Link>
          <Link
            to="/pay/1"
            className="inline-flex h-11 items-center justify-center rounded-(--radius-pill) bg-(--color-brand) px-6 text-small font-semibold text-(--color-brand-contrast) transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
          >
            تأكيد الطلب
          </Link>
        </div>
      </div>
    </div>
  )
}

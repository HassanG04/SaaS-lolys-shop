import { Link } from 'react-router-dom'

export default function CartPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-6 sm:p-8">
        <h1 className="text-h1 font-bold font-accent text-(--color-brand)">سلة التسوق</h1>
        <p className="mt-2 text-body text-(--color-text-muted)">
          استعرض المنتجات التي اخترتها وأكمل بيانات التوصيل والدفع.
        </p>
      </div>

      <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-8 text-center space-y-4">
        <p className="text-body text-(--color-text-muted)">
          سلتك فارغة حاليًا، استكشف تشكيلاتنا وابدأ التسوق!
        </p>
        <div className="flex justify-center gap-4">
          <Link
            to="/category/all"
            className="inline-flex h-11 items-center justify-center rounded-(--radius-pill) bg-(--color-brand) px-6 text-small font-semibold text-(--color-brand-contrast) transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
          >
            تصفّح المنتجات
          </Link>
          <Link
            to="/checkout"
            className="inline-flex h-11 items-center justify-center rounded-(--radius-pill) border border-(--color-border-input) bg-(--color-surface-2) px-6 text-small font-semibold text-(--color-text) hover:border-(--color-brand) focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
          >
            إتمام الطلب
          </Link>
        </div>
      </div>
    </div>
  )
}

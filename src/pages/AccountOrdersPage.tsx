import { Link } from 'react-router-dom'

export default function AccountOrdersPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-h1 font-bold font-accent text-(--color-brand)">طلباتي</h1>
          <p className="mt-2 text-body text-(--color-text-muted)">
            سجل طلباتك وحالات الشحن والتوصيل.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/account/security"
            className="inline-flex h-11 items-center justify-center rounded-(--radius-pill) border border-(--color-border-input) bg-(--color-surface-2) px-4 text-small font-semibold text-(--color-text) hover:border-(--color-brand) focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
          >
            إعدادات الأمان
          </Link>
        </div>
      </div>

      <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-8 text-center space-y-4">
        <p className="text-body text-(--color-text-muted)">لا توجد طلبات سابقة حتى الآن.</p>
        <Link
          to="/category/all"
          className="inline-flex h-11 items-center justify-center rounded-(--radius-pill) bg-(--color-brand) px-6 text-small font-semibold text-(--color-brand-contrast) transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
        >
          تسوّق الآن
        </Link>
      </div>
    </div>
  )
}

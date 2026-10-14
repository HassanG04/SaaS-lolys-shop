import { Link } from 'react-router-dom'
import { RibbonBow } from '../components/ui/ornaments'

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-lg text-center space-y-6 py-12">
      <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-8 sm:p-12 space-y-6">
        <div className="flex justify-center text-(--color-brand)">
          <RibbonBow className="size-16" />
        </div>
        <h1 className="text-display font-bold font-accent text-(--color-brand)">404</h1>
        <h2 className="text-h2 font-semibold text-(--color-text)">الصفحة غير موجودة</h2>
        <p className="text-body text-(--color-text-muted)">
          عذرًا، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
        </p>
        <div className="pt-2">
          <Link
            to="/"
            className="inline-flex h-11 items-center justify-center rounded-(--radius-pill) bg-(--color-brand) px-6 text-small font-semibold text-(--color-brand-contrast) transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
          >
            العودة إلى الصفحة الرئيسية
          </Link>
        </div>
      </div>
    </div>
  )
}

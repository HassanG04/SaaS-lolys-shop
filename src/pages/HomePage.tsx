import { Link } from 'react-router-dom'
import { Sparkle, RibbonBow } from '../components/ui/ornaments'

export default function HomePage() {
  return (
    <div className="space-y-12">
      {/* Hero section */}
      <section className="relative overflow-hidden rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-6 sm:p-12 text-center sm:text-start">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
          <div className="max-w-xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-(--radius-pill) bg-(--color-surface-tint) px-3 py-1 text-caption font-semibold text-(--color-accent-text)">
              <Sparkle className="size-4" />
              <span>أشياء لطيفة لأسلوبك ومساحتك</span>
            </div>
            <h1 className="font-accent text-display font-bold text-(--color-brand)">
              متجر لوليز للإكسسوارات والمنزل
            </h1>
            <p className="text-body text-(--color-text-muted) leading-relaxed">
              إكسسوارات ولمسات منزلية تضيف الحلاوة لأسلوبك ومكانك. تشكيلات مختارة بعناية وهدايا
              مميزة تناسب ذوقك.
            </p>
            <div className="pt-2 flex flex-wrap gap-4 justify-center sm:justify-start">
              <Link
                to="/category/all"
                className="inline-flex h-11 items-center justify-center rounded-(--radius-pill) bg-(--color-brand) px-6 text-small font-semibold text-(--color-brand-contrast) transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
              >
                تصفّح المنتجات
              </Link>
              <Link
                to="/about"
                className="inline-flex h-11 items-center justify-center rounded-(--radius-pill) border border-(--color-border-input) bg-(--color-surface-2) px-6 text-small font-semibold text-(--color-text) transition-colors hover:border-(--color-brand) focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
              >
                عن المتجر
              </Link>
            </div>
          </div>
          <div className="flex size-48 sm:size-64 items-center justify-center rounded-(--radius-card) border border-(--color-border) bg-(--color-surface-tint) text-(--color-brand)">
            <RibbonBow className="size-24 text-(--color-brand)" />
          </div>
        </div>
      </section>

      {/* Categories quick links */}
      <section className="space-y-4">
        <h2 className="text-h2 font-bold font-accent text-(--color-brand)">الأقسام المميزة</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { slug: 'earrings', name: 'أقراط' },
            { slug: 'chains', name: 'سلاسل' },
            { slug: 'rings', name: 'خواتم' },
            { slug: 'bracelets', name: 'أساور' },
          ].map((cat) => (
            <Link
              key={cat.slug}
              to={`/category/${cat.slug}`}
              className="flex h-24 flex-col items-center justify-center rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-4 text-center transition-transform hover:-translate-y-1 hover:border-(--color-brand) focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
            >
              <span className="text-body font-semibold text-(--color-text)">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { RibbonBow } from '../components/ui/ornaments'

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-6 sm:p-10 space-y-6 text-center sm:text-start">
        <div className="flex items-center justify-center sm:justify-start gap-3">
          <RibbonBow className="size-8 text-(--color-brand)" />
          <h1 className="text-h1 font-bold font-accent text-(--color-brand)">
            عن متجر لوليز (Lolys&apos;)
          </h1>
        </div>

        <p className="text-body text-(--color-text) leading-relaxed">
          لوليز هو متجر يقدم إكسسوارات راقية ولمسات منزلية دافئة ولطيفة تضيف لمسة جمالية لأسلوبك
          ومساحتك الشخصية.
        </p>

        <p className="text-body text-(--color-text-muted) leading-relaxed">
          نحرص على انتقاء قطع مميزة، تغليف أنيق ومناسب للإهداء، وتجربة تسوق مريحة مع توصيل موثوق في
          جميع أنحاء مصر.
        </p>

        <div className="pt-4">
          <Link
            to="/category/all"
            className="inline-flex h-11 items-center justify-center rounded-(--radius-pill) bg-(--color-brand) px-6 text-small font-semibold text-(--color-brand-contrast) transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
          >
            تصفّح التشكيلات
          </Link>
        </div>
      </div>
    </div>
  )
}

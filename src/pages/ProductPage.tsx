import { useParams, Link } from 'react-router-dom'

export default function ProductPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-small text-(--color-text-muted)">
        <ol className="flex items-center gap-2">
          <li>
            <Link to="/" className="hover:text-(--color-brand)">
              الرئيسية
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link to="/category/all" className="hover:text-(--color-brand)">
              المنتجات
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-semibold text-(--color-brand)">
            منتج #{id}
          </li>
        </ol>
      </nav>

      {/* Product Details Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-6 sm:p-10">
        <div className="aspect-square w-full rounded-(--radius-image) bg-(--color-surface-tint) flex items-center justify-center text-body text-(--color-text-muted)">
          صورة المنتج #{id}
        </div>
        <div className="flex flex-col justify-center space-y-4">
          <h1 className="text-h1 font-bold font-accent text-(--color-brand)">
            تفاصيل المنتج #{id}
          </h1>
          <p className="text-h2 font-semibold text-(--color-brand)">250 ج.م</p>
          <p className="text-body text-(--color-text-muted) leading-relaxed">
            وصف تفصيلي للمنتج ولمسات التصميم والخامات المستخدمة. إضافة مثالية لإطلالتك أو كهدية
            مميزة.
          </p>
          <div className="pt-4 flex gap-4">
            <Link
              to="/cart"
              className="inline-flex h-11 items-center justify-center rounded-(--radius-pill) bg-(--color-brand) px-8 text-small font-semibold text-(--color-brand-contrast) transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
            >
              أضف إلى السلة
            </Link>
            <Link
              to="/category/all"
              className="inline-flex h-11 items-center justify-center rounded-(--radius-pill) border border-(--color-border-input) bg-(--color-surface-2) px-6 text-small font-semibold text-(--color-text) hover:border-(--color-brand) focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
            >
              متابعة التسوق
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

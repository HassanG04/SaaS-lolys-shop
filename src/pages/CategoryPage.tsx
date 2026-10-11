import { useParams, Link } from 'react-router-dom'

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>()

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
          <li aria-current="page" className="font-semibold text-(--color-brand)">
            {slug === 'all' ? 'جميع المنتجات' : slug}
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-6 sm:p-8">
        <h1 className="text-h1 font-bold font-accent text-(--color-brand)">
          {slug === 'all' ? 'جميع المنتجات' : `قسم: ${slug}`}
        </h1>
        <p className="mt-2 text-body text-(--color-text-muted)">
          استعرض المنتجات والإكسسوارات المتاحة في هذا القسم.
        </p>
      </div>

      {/* Product grid placeholder */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((id) => (
          <Link
            key={id}
            to={`/product/${id}`}
            className="flex flex-col rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-6 transition-transform hover:-translate-y-1 hover:border-(--color-brand) focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
          >
            <div className="h-40 w-full rounded-(--radius-image) bg-(--color-surface-tint) flex items-center justify-center text-small text-(--color-text-muted)">
              صورة المنتج {id}
            </div>
            <div className="mt-4 space-y-1">
              <h2 className="text-body font-bold text-(--color-text)">منتج تجريبي #{id}</h2>
              <p className="text-small text-(--color-brand) font-semibold">250 ج.م</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { useFavorites, BowHeartIcon } from '@/features/favorites'
import { ProductCard } from '@/features/catalog/components/ProductCard'
import { useCart } from '@/features/cart'
import { useToast } from '@/components/ui/ToastProvider'
import { useLanguage } from '@/i18n/LanguageProvider'
import { Card } from '@/components/ui/Card'
import { PearlLoader } from '@/components/ui/PearlLoader'
import { ErrorPanel } from '@/components/ui/ErrorPanel'
import type { Product, ProductWithCategory } from '@/features/catalog/types'

export default function AccountFavoritesPage() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const { addItem } = useCart()
  const { success: toastSuccess } = useToast()

  const { data: favorites, isLoading, error, refetch } = useFavorites(user?.id)

  const handleAddToCart = (product: Product | ProductWithCategory) => {
    if (!product.in_stock || product.stock_quantity <= 0) return
    addItem(product.id, 1, product.stock_quantity)
    toastSuccess(t('product.addedToCart', { count: 1 }), product.name_ar || product.name)
  }

  const count = favorites?.length ?? 0

  return (
    <div className="space-y-6" data-testid="account-favorites-page">
      {/* Header and Sub-Navigation */}
      <div className="rounded-card border border-border bg-surface p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-card">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-h1 font-bold font-accent text-brand">
              {t.favorites?.title || 'المفضلة'}
            </h1>
            {!isLoading && (
              <span
                className="inline-flex items-center rounded-pill bg-surface-tint border border-border px-3 py-1 text-small font-semibold text-brand"
                data-testid="favorites-count-badge"
              >
                {t('favorites.itemCount', { count })}
              </span>
            )}
          </div>
          <p className="mt-2 text-body text-text-muted">
            المنتجات والإكسسوارات المفضلة التي قمت بحفظها للرجوع إليها في أي وقت.
          </p>
        </div>

        {/* Sub-Navigation Pills */}
        <div className="flex flex-wrap gap-2">
          <Link
            to="/account"
            className="inline-flex h-11 items-center justify-center rounded-pill border border-border-input bg-surface-2 px-4 text-small font-semibold text-text hover:border-brand focus:outline-none focus:ring-2 focus:ring-focus transition-colors"
          >
            {t.account?.details || 'بياناتي'}
          </Link>
          <Link
            to="/account/orders"
            className="inline-flex h-11 items-center justify-center rounded-pill border border-border-input bg-surface-2 px-4 text-small font-semibold text-text hover:border-brand focus:outline-none focus:ring-2 focus:ring-focus transition-colors"
          >
            {t.account?.orders || 'طلباتي'}
          </Link>
          <span
            aria-current="page"
            className="inline-flex h-11 items-center justify-center rounded-pill bg-brand px-4 text-small font-semibold text-brand-contrast shadow-pill"
          >
            {t.account?.favorites || 'المفضلة'}
          </span>
          <Link
            to="/account/security"
            className="inline-flex h-11 items-center justify-center rounded-pill border border-border-input bg-surface-2 px-4 text-small font-semibold text-text hover:border-brand focus:outline-none focus:ring-2 focus:ring-focus transition-colors"
          >
            {t.account?.security || 'الأمان'}
          </Link>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div
          role="status"
          aria-label="جاري تحميل المنتجات المفضلة"
          className="rounded-card border border-border bg-surface p-12 flex justify-center items-center text-brand"
        >
          <PearlLoader loading />
        </div>
      ) : error ? (
        <ErrorPanel error={error} onRetry={() => void refetch()} />
      ) : count === 0 ? (
        /* Empty State */
        <Card className="p-8 sm:p-12 text-center space-y-4" data-testid="favorites-empty-state">
          <div className="flex size-16 mx-auto items-center justify-center rounded-pill bg-surface-tint text-accent-text border border-border">
            <BowHeartIcon filled className="size-8 text-accent-text" />
          </div>
          <h2 className="text-h2 font-bold text-text">
            {t.favorites?.emptyTitle || 'قائمة المفضلة فارغة'}
          </h2>
          <p className="text-body text-text-muted max-w-md mx-auto">
            {t.favorites?.emptyDesc ||
              'لم تقم بإضافة أي منتجات إلى المفضلة بعد. استكشف مجموعتنا وأضف ما يعجبك!'}
          </p>
          <div className="pt-2">
            <Link
              to="/category/all"
              className="inline-flex h-11 items-center justify-center rounded-pill bg-brand px-8 text-small font-semibold text-brand-contrast transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-focus shadow-pill"
            >
              {t.favorites?.browse || 'تصفّح المنتجات'}
            </Link>
          </div>
        </Card>
      ) : (
        /* Products Grid */
        <div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
          data-testid="favorites-grid"
        >
          {favorites?.map((item) => (
            <ProductCard
              key={item.product_id}
              product={item.product}
              onAddToCart={handleAddToCart}
            />
          ))}
        </div>
      )}
    </div>
  )
}

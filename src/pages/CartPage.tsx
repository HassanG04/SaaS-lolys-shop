import { Link, useNavigate } from 'react-router-dom'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useOptionalAuth } from '@/features/auth/AuthProvider'
import { formatEGP } from '@/lib/format'
import { RibbonBow, PearlOrnament } from '@/components/ui/ornaments'
import { ProductImage } from '@/features/catalog'
import { Badge } from '@/components/ui/Badge'
import { useCart } from '@/features/cart'

export default function CartPage() {
  const { lang, t } = useLanguage()
  const auth = useOptionalAuth()
  const user = auth?.user ?? null
  const navigate = useNavigate()
  const { lines, totalCount, subtotal, updateQuantity, removeItem, clearCart } = useCart()

  const handleCheckoutClick = () => {
    if (!user) {
      navigate('/login?redirect=/checkout')
    } else {
      navigate('/checkout')
    }
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-3">
            <RibbonBow className="size-8 text-brand" />
            <h1 className="text-h1 font-bold font-accent text-brand">{t.cart.title}</h1>
            {totalCount > 0 && (
              <span className="inline-flex items-center justify-center rounded-pill bg-brand px-3 py-1 text-caption font-semibold text-brand-contrast">
                {totalCount}
              </span>
            )}
          </div>
          <p className="mt-2 text-body text-text-muted">{t.brand.tagline}</p>
        </div>

        {lines.length > 0 && (
          <button
            type="button"
            onClick={clearCart}
            className="self-start sm:self-auto text-small font-medium text-text-muted hover:text-danger focus:outline-none focus:underline"
          >
            {t.cart.clear}
          </button>
        )}
      </div>

      {/* Cart Content */}
      {lines.length === 0 ? (
        <div className="rounded-card border border-border bg-surface p-12 text-center space-y-6 shadow-card">
          <div className="flex justify-center text-sand">
            <PearlOrnament className="size-20" />
          </div>
          <h2 className="text-h2 font-semibold text-text">{t.cart.empty}</h2>
          <p className="text-body text-text-muted max-w-md mx-auto">{t.cart.emptyDesc}</p>
          <div className="pt-2">
            <Link
              to="/category/all"
              className="inline-flex h-11 items-center justify-center rounded-pill bg-brand px-8 text-small font-semibold text-brand-contrast transition-opacity hover:opacity-90 focus:outline-none focus:border-2 focus:border-brand"
            >
              {t.cart.browseProducts}
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Cart Lines List (2 cols on desktop) */}
          <div className="lg:col-span-2 space-y-4">
            <ul className="divide-y divide-border rounded-card border border-border bg-surface p-4 sm:p-6 shadow-card">
              {lines.map((line) => {
                const productName =
                  lang === 'ar'
                    ? line.product?.name_ar || line.product?.name || `منتج #${line.productId}`
                    : line.product?.name || `Product #${line.productId}`

                const categoryName = line.product?.category
                  ? lang === 'ar'
                    ? line.product.category.name_ar || line.product.category.name
                    : line.product.category.name
                  : null

                const isLowStock = line.maxStock > 0 && line.maxStock <= 5

                return (
                  <li
                    key={line.productId}
                    className="flex flex-col sm:flex-row gap-4 py-6 first:pt-0 last:pb-0"
                  >
                    {/* Thumbnail */}
                    <div className="size-20 sm:size-24 shrink-0 overflow-hidden rounded-image border border-border bg-surface-2">
                      <ProductImage
                        src={line.product?.image_url}
                        alt={productName}
                        aspectRatio="square"
                        className="size-full object-cover"
                      />
                    </div>

                    {/* Details */}
                    <div className="flex flex-1 flex-col justify-between gap-3">
                      <div>
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <Link
                              to={`/product/${line.productId}`}
                              className="text-body font-semibold text-text hover:text-brand transition-colors focus:outline-none focus:underline"
                            >
                              {productName}
                            </Link>
                            {categoryName && (
                              <p className="text-caption text-text-muted mt-0.5">{categoryName}</p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => removeItem(line.productId)}
                            aria-label={t('cart.removeAria', { name: productName })}
                            className="text-caption text-text-muted hover:text-danger p-1 rounded-chip transition-colors focus:outline-none focus:border-2 focus:border-brand"
                          >
                            <svg
                              className="size-5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                            >
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>

                        {/* Price per unit */}
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-small font-bold text-brand">
                            {formatEGP(line.unitPrice)}
                          </span>
                          {line.hasDiscount && line.originalPrice && (
                            <del className="text-caption text-text-muted">
                              {formatEGP(line.originalPrice)}
                            </del>
                          )}
                          {line.hasDiscount && (
                            <Badge variant="sale" label={`-${line.discountPercent}%`} />
                          )}
                        </div>
                      </div>

                      {/* Stepper, stock warning, and line total */}
                      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-border/50">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center rounded-pill border border-border bg-surface-2">
                            <button
                              type="button"
                              onClick={() => updateQuantity(line.productId, line.quantity - 1)}
                              aria-label={t.product.decreaseQty}
                              disabled={line.quantity <= 1}
                              className="flex size-8 items-center justify-center rounded-pill text-body font-bold text-text transition-colors hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none"
                            >
                              -
                            </button>
                            <span
                              aria-label={`${t.cart.quantity}: ${line.quantity}`}
                              className="w-10 text-center text-small font-semibold text-text"
                            >
                              {line.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(line.productId, line.quantity + 1, line.maxStock)
                              }
                              aria-label={t.product.increaseQty}
                              disabled={line.quantity >= line.maxStock}
                              className="flex size-8 items-center justify-center rounded-pill text-body font-bold text-text transition-colors hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none"
                            >
                              +
                            </button>
                          </div>

                          {isLowStock && (
                            <span className="text-caption font-medium text-warning">
                              {t('product.left', { n: line.maxStock })}
                            </span>
                          )}
                        </div>

                        <div className="text-end">
                          <span className="text-caption text-text-muted block">
                            {t.cart.total}:
                          </span>
                          <span className="text-body font-bold text-text">
                            {formatEGP(line.lineTotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Order Summary Card (1 col on desktop, sticky) */}
          <div className="lg:sticky lg:top-28 rounded-card border border-border bg-surface p-6 shadow-card space-y-6">
            <h2 className="text-h3 font-bold text-brand pb-3 border-b border-border">
              {t.cart.orderSummary}
            </h2>

            <div className="space-y-3 text-small">
              <div className="flex justify-between text-text">
                <span>{t.cart.subtotal}</span>
                <span className="font-semibold">{formatEGP(subtotal)}</span>
              </div>

              <div className="flex justify-between text-text-muted">
                <span>{t.cart.shipping}</span>
                <span className="text-caption">{t.cart.shippingCalculated}</span>
              </div>

              <div className="pt-3 border-t border-border flex justify-between text-body font-bold text-text">
                <span>{t.cart.total}</span>
                <span className="text-brand text-h3">{formatEGP(subtotal)}</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleCheckoutClick}
                className="flex w-full h-12 items-center justify-center rounded-pill bg-brand px-6 text-body font-semibold text-brand-contrast transition-opacity hover:opacity-90 focus:outline-none focus:border-2 focus:border-brand shadow-card"
              >
                {!user ? t.cart.loginToCheckout : t.cart.checkout}
              </button>

              <Link
                to="/category/all"
                className="flex w-full h-11 items-center justify-center rounded-pill border border-border bg-surface-2 px-6 text-small font-semibold text-text hover:border-brand focus:outline-none focus:border-2 focus:border-brand"
              >
                {t.cart.continueShopping}
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

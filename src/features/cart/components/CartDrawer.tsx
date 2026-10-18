import { useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useOptionalAuth } from '@/features/auth/AuthProvider'
import { formatEGP } from '@/lib/format'
import { RibbonBow, PearlOrnament } from '@/components/ui/ornaments'
import { ProductImage } from '@/features/catalog/components/ProductImage'
import { useCart } from '../CartProvider'

export function CartDrawer() {
  const { lang, t } = useLanguage()
  const auth = useOptionalAuth()
  const user = auth?.user ?? null
  const navigate = useNavigate()
  const { isDrawerOpen, closeDrawer, lines, totalCount, subtotal, updateQuantity, removeItem } =
    useCart()
  const drawerRef = useRef<HTMLDivElement>(null)

  // Handle escape key to close drawer
  useEffect(() => {
    if (!isDrawerOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeDrawer()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDrawerOpen, closeDrawer])

  // Prevent background scroll while drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isDrawerOpen])

  if (!isDrawerOpen) {
    return null
  }

  const handleCheckoutClick = () => {
    closeDrawer()
    if (!user) {
      navigate('/login?redirect=/checkout')
    } else {
      navigate('/checkout')
    }
  }

  const handleViewCartClick = () => {
    closeDrawer()
    navigate('/cart')
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.cart.title}
      className="fixed inset-0 z-50 flex justify-end"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-text/40 backdrop-blur-xs transition-opacity"
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div
        ref={drawerRef}
        className="relative z-10 flex h-full w-full max-w-md flex-col bg-surface border-s border-border shadow-card transition-transform duration-300 ease-in-out"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4 sm:px-6">
          <div className="flex items-center gap-2 text-brand">
            <RibbonBow className="size-6 text-brand" />
            <h2 className="text-h3 font-bold font-accent text-brand">{t.cart.title}</h2>
            {totalCount > 0 && (
              <span className="inline-flex items-center justify-center rounded-pill bg-brand px-2.5 py-0.5 text-caption font-semibold text-brand-contrast">
                {totalCount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label={t.cart.closeDrawer}
            className="flex h-9 w-9 items-center justify-center rounded-pill text-text-muted hover:bg-surface-2 hover:text-text focus:outline-none focus:border-2 focus:border-brand"
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
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {lines.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-12 text-center">
              <PearlOrnament className="size-16 text-sand mb-4" />
              <h3 className="text-h3 font-semibold text-text mb-2">{t.cart.empty}</h3>
              <p className="text-body text-text-muted max-w-xs mb-6">{t.cart.emptyDesc}</p>
              <button
                type="button"
                onClick={() => {
                  closeDrawer()
                  navigate('/category/all')
                }}
                className="inline-flex h-11 items-center justify-center rounded-pill bg-brand px-6 text-small font-semibold text-brand-contrast transition-opacity hover:opacity-90 focus:outline-none focus:border-2 focus:border-brand"
              >
                {t.cart.browseProducts}
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {lines.map((line) => {
                const productName =
                  lang === 'ar'
                    ? line.product?.name_ar || line.product?.name || `منتج #${line.productId}`
                    : line.product?.name || `Product #${line.productId}`

                return (
                  <li key={line.productId} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                    {/* Thumbnail */}
                    <div className="size-16 shrink-0 overflow-hidden rounded-image border border-border bg-surface-2">
                      <ProductImage
                        src={line.product?.image_url}
                        alt={productName}
                        aspectRatio="square"
                        className="size-full object-cover"
                      />
                    </div>

                    {/* Details */}
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <Link
                            to={`/product/${line.productId}`}
                            onClick={closeDrawer}
                            className="text-small font-semibold text-text hover:text-brand line-clamp-2 focus:outline-none focus:underline"
                          >
                            {productName}
                          </Link>
                          <button
                            type="button"
                            onClick={() => removeItem(line.productId)}
                            aria-label={t('cart.removeAria', { name: productName })}
                            className="text-caption text-text-muted hover:text-danger p-1 rounded-chip focus:outline-none focus:border-2 focus:border-brand"
                          >
                            <svg
                              className="size-4"
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

                        {/* Price */}
                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="text-small font-bold text-brand">
                            {formatEGP(line.unitPrice)}
                          </span>
                          {line.hasDiscount && line.originalPrice && (
                            <del className="text-caption text-text-muted">
                              {formatEGP(line.originalPrice)}
                            </del>
                          )}
                        </div>
                      </div>

                      {/* Stepper & Line Total */}
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center rounded-pill border border-border bg-surface-2">
                          <button
                            type="button"
                            onClick={() => updateQuantity(line.productId, line.quantity - 1)}
                            aria-label={t.product.decreaseQty}
                            disabled={line.quantity <= 1}
                            className="flex size-7 items-center justify-center rounded-pill text-small font-bold text-text transition-colors hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none"
                          >
                            -
                          </button>
                          <span
                            aria-label={`${t.cart.quantity}: ${line.quantity}`}
                            className="w-8 text-center text-caption font-semibold text-text"
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
                            className="flex size-7 items-center justify-center rounded-pill text-small font-bold text-text transition-colors hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none"
                          >
                            +
                          </button>
                        </div>

                        <span className="text-small font-semibold text-text">
                          {formatEGP(line.lineTotal)}
                        </span>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        {lines.length > 0 && (
          <div className="border-t border-border bg-surface-2 p-4 sm:p-6 space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between text-body font-semibold text-text">
                <span>{t.cart.subtotal}</span>
                <span className="text-brand font-bold">{formatEGP(subtotal)}</span>
              </div>
              <p className="text-caption text-text-muted">{t.cart.shippingCalculated}</p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleCheckoutClick}
                className="flex w-full h-11 items-center justify-center rounded-pill bg-brand px-6 text-small font-semibold text-brand-contrast transition-opacity hover:opacity-90 focus:outline-none focus:border-2 focus:border-brand"
              >
                {!user ? t.cart.loginToCheckout : t.cart.checkout}
              </button>

              <button
                type="button"
                onClick={handleViewCartClick}
                className="flex w-full h-11 items-center justify-center rounded-pill border border-border bg-surface px-6 text-small font-semibold text-text hover:border-brand focus:outline-none focus:border-2 focus:border-brand"
              >
                {t.cart.viewCart}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CartDrawer

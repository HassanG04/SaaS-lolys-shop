import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { RibbonBow, Sparkle } from '@/components/ui/ornaments'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorPanel } from '@/components/ui/ErrorPanel'
import { useToast } from '@/components/ui/ToastProvider'
import { useProduct, useProductsByCategory, ProductCard, ProductImage } from '@/features/catalog'
import { useCart } from '@/features/cart'
import { useLanguage } from '@/i18n/LanguageProvider'
import { formatEGP } from '@/lib/format'

export default function ProductPage() {
  const { id } = useParams<{ id: string }>()
  const { lang, t } = useLanguage()
  const { success } = useToast()
  const { addItem } = useCart()

  const productId = id ? Number(id) : null

  // 1. Fetch product data
  const { data: product, isLoading: isProductLoading, error: productError } = useProduct(productId)

  // 2. State for active gallery image
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  // 3. State for quantity stepper
  const [quantity, setQuantity] = useState(1)

  // All gallery images
  const allImages = useMemo(() => {
    if (!product) return []
    const images: string[] = []
    if (product.image_url) {
      images.push(product.image_url)
    }
    if (Array.isArray(product.extra_images)) {
      for (const img of product.extra_images) {
        if (img && typeof img === 'string' && !images.includes(img)) {
          images.push(img)
        }
      }
    }
    return images
  }, [product])

  const currentDisplayImage = selectedImage || product?.image_url || null

  // Derived stock calculations
  const isSoldOut = Boolean(!product || !product.in_stock || product.stock_quantity <= 0)
  const maxStock = product ? Math.max(0, product.stock_quantity) : 0
  const isLowStock = Boolean(product && product.stock_quantity > 0 && product.stock_quantity <= 5)
  const hasDiscount = Boolean(product && product.discount_percent && product.discount_percent > 0)

  const finalPrice =
    typeof product?.final_price === 'number'
      ? product.final_price
      : hasDiscount && product
        ? Math.round(product.price * (1 - (product.discount_percent ?? 0) / 100))
        : (product?.price ?? 0)

  // 4. Fetch related products from the same category
  const categorySlug = product?.category?.slug || product?.categories?.slug || null
  const { data: relatedProductsData } = useProductsByCategory(categorySlug)

  const relatedProducts = useMemo(() => {
    if (!relatedProductsData || !product) return []
    return relatedProductsData.filter((p) => p.id !== product.id).slice(0, 4)
  }, [relatedProductsData, product])

  // Stepper handlers
  const handleDecrease = () => {
    setQuantity((prev) => Math.max(1, prev - 1))
  }

  const handleIncrease = () => {
    setQuantity((prev) => Math.min(maxStock, prev + 1))
  }

  const handleAddToCart = () => {
    if (isSoldOut || !product) return
    addItem(product.id, quantity, product.stock_quantity)
    success(t('product.addedToCart', { count: quantity }), product.name_ar || product.name)
  }

  // 5. Unknown or missing product shows 404
  if (!isProductLoading && (!product || !productId || Number.isNaN(productId))) {
    return (
      <div className="mx-auto max-w-lg text-center space-y-6 py-12" role="region" aria-label="404">
        <div className="rounded-card border border-border bg-surface p-8 sm:p-12 space-y-6 shadow-card">
          <div className="flex justify-center text-brand">
            <RibbonBow className="size-16" />
          </div>
          <h1 className="text-display font-bold font-accent text-brand">404</h1>
          <h2 className="text-h2 font-semibold text-text">{t.product.notFound}</h2>
          <p className="text-body text-text-muted">{t.product.notFoundDesc}</p>
          <div className="pt-2">
            <Link
              to="/category/all"
              className="inline-flex h-11 items-center justify-center rounded-pill bg-brand px-6 text-small font-semibold text-brand-contrast transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-focus"
            >
              {t.catalog.allProducts}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (productError) {
    return <ErrorPanel error={productError} />
  }

  if (isProductLoading || !product) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-6 w-48 rounded-chip" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 rounded-card border border-border bg-surface p-6 sm:p-10 shadow-card">
          <Skeleton className="aspect-square w-full rounded-image" />
          <div className="space-y-6">
            <Skeleton className="h-10 w-3/4 rounded-chip" />
            <Skeleton className="h-8 w-1/3 rounded-chip" />
            <Skeleton className="h-24 w-full rounded-card" />
            <Skeleton className="h-12 w-full rounded-pill" />
          </div>
        </div>
      </div>
    )
  }

  const displayName = lang === 'ar' ? product.name_ar || product.name : product.name
  const displayDescription =
    (lang === 'ar' ? product.description_ar : product.description) ||
    product.description ||
    product.description_ar ||
    ''

  const categoryName = product.category
    ? lang === 'ar'
      ? product.category.name_ar || product.category.name
      : product.category.name
    : null

  return (
    <div className="space-y-12">
      {/* 1. Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="text-small text-text-muted">
        <ol className="flex items-center gap-2 flex-wrap">
          <li>
            <Link
              to="/"
              className="transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus rounded-chip px-1"
            >
              {t.catalog.breadcrumbsHome}
            </Link>
          </li>
          <li aria-hidden="true" className="text-sand">
            /
          </li>
          {categorySlug && categoryName ? (
            <>
              <li>
                <Link
                  to={`/category/${categorySlug}`}
                  className="transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus rounded-chip px-1"
                >
                  {categoryName}
                </Link>
              </li>
              <li aria-hidden="true" className="text-sand">
                /
              </li>
            </>
          ) : (
            <>
              <li>
                <Link
                  to="/category/all"
                  className="transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus rounded-chip px-1"
                >
                  {t.catalog.allProducts}
                </Link>
              </li>
              <li aria-hidden="true" className="text-sand">
                /
              </li>
            </>
          )}
          <li aria-current="page" className="font-semibold text-brand px-1">
            {displayName}
          </li>
        </ol>
      </nav>

      {/* 2. Main Product Showcase */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 rounded-card border border-border bg-surface p-6 sm:p-10 shadow-card">
        {/* Left column: Gallery */}
        <div className="space-y-4">
          <div className="relative aspect-square w-full overflow-hidden rounded-image border border-border bg-surface-tint">
            <ProductImage
              src={currentDisplayImage}
              alt={displayName}
              className="size-full"
              imageClassName="size-full object-cover"
            />

            {/* Badges Overlay */}
            <div className="pointer-events-none absolute top-3 inset-x-3 flex items-center justify-between gap-2">
              {hasDiscount ? (
                <Badge variant="sale" label={`-${product.discount_percent}%`} />
              ) : (
                <span />
              )}
              {isSoldOut ? <Badge variant="sold-out" label={t.product.soldout} /> : null}
            </div>
          </div>

          {/* Gallery Thumbnails */}
          {allImages.length > 1 ? (
            <div
              className="flex items-center gap-3 overflow-x-auto pb-2"
              role="region"
              aria-label="Gallery thumbnails"
            >
              {allImages.map((img, idx) => {
                const isActive = img === currentDisplayImage
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImage(img)}
                    className={`relative size-16 sm:size-20 shrink-0 overflow-hidden rounded-chip border transition-all ${
                      isActive
                        ? 'border-2 border-brand'
                        : 'border-border opacity-70 hover:opacity-100 hover:border-brand'
                    }`}
                    aria-label={`Thumbnail ${idx + 1}`}
                  >
                    <ProductImage
                      src={img}
                      alt={`${displayName} thumbnail ${idx + 1}`}
                      className="size-full"
                      imageClassName="size-full object-cover"
                    />
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>

        {/* Right column: Details & Purchase */}
        <div className="flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            {/* Title & Category pill */}
            <div className="space-y-2">
              {categoryName ? (
                <Link
                  to={`/category/${categorySlug}`}
                  className="inline-block text-small font-semibold text-text-muted hover:text-brand"
                >
                  {categoryName}
                </Link>
              ) : null}
              <h1 className="text-h1 font-bold font-accent text-brand">{displayName}</h1>
            </div>

            {/* Pricing block */}
            <div className="flex items-baseline gap-3">
              <span className="text-h2 font-bold text-brand">{formatEGP(finalPrice)}</span>
              {hasDiscount ? (
                <span className="text-body text-text-muted line-through">
                  {formatEGP(product.price)}
                </span>
              ) : null}
            </div>

            {/* Stock indicator note */}
            <div>
              {isSoldOut ? (
                <div className="inline-flex items-center gap-2 rounded-pill bg-surface-tint border border-border px-3 py-1 text-small font-semibold text-danger">
                  <span>{t.product.soldout}</span>
                </div>
              ) : isLowStock ? (
                <div className="inline-flex items-center gap-2 rounded-pill bg-surface-tint border border-warning px-3 py-1 text-small font-semibold text-warning">
                  <Sparkle className="size-4" />
                  <span>{t('product.left', { n: product.stock_quantity })}</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-pill bg-surface-tint border border-border px-3 py-1 text-small font-semibold text-success">
                  <span>{t.product.inStock}</span>
                </div>
              )}
            </div>

            {/* Description */}
            {displayDescription ? (
              <p className="text-body text-text-muted leading-relaxed pt-2">{displayDescription}</p>
            ) : null}
          </div>

          {/* Purchase actions */}
          <div className="space-y-6 border-t border-border pt-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              {/* Quantity Stepper */}
              <div className="flex items-center justify-between sm:justify-start gap-3 rounded-pill border border-border-input bg-surface p-1">
                <button
                  type="button"
                  onClick={handleDecrease}
                  disabled={quantity <= 1 || isSoldOut}
                  aria-label={t.product.decreaseQty}
                  className="flex size-9 items-center justify-center rounded-pill bg-surface-tint text-body font-bold text-brand transition-colors hover:bg-brand hover:text-brand-contrast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-40 disabled:hover:bg-surface-tint disabled:hover:text-brand"
                >
                  -
                </button>
                <span
                  className="min-w-8 text-center text-body font-bold text-text"
                  dir="ltr"
                  data-testid="quantity-value"
                >
                  {isSoldOut ? 0 : quantity}
                </span>
                <button
                  type="button"
                  onClick={handleIncrease}
                  disabled={quantity >= maxStock || isSoldOut}
                  aria-label={t.product.increaseQty}
                  className="flex size-9 items-center justify-center rounded-pill bg-surface-tint text-body font-bold text-brand transition-colors hover:bg-brand hover:text-brand-contrast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-40 disabled:hover:bg-surface-tint disabled:hover:text-brand"
                >
                  +
                </button>
              </div>

              {/* Add to Cart Button */}
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isSoldOut}
                className="flex-1 h-11 items-center justify-center rounded-pill bg-brand px-8 text-small font-semibold text-brand-contrast transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSoldOut ? t.product.soldout : t.product.add}
              </button>
            </div>

            {/* Delivery & Assurance Chips */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="rounded-card border border-border bg-surface-tint p-3 text-center">
                <span className="text-caption font-semibold text-brand block">
                  {t.product.fastDelivery}
                </span>
              </div>
              <div className="rounded-card border border-border bg-surface-tint p-3 text-center">
                <span className="text-caption font-semibold text-brand block">
                  {t.product.giftWrap}
                </span>
              </div>
              <div className="rounded-card border border-border bg-surface-tint p-3 text-center">
                <span className="text-caption font-semibold text-brand block">
                  {t.product.easyReturns}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Related Products Section */}
      {relatedProducts.length > 0 ? (
        <section aria-labelledby="related-heading" className="space-y-6 pt-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 id="related-heading" className="text-h2 font-bold font-accent text-brand">
              {t.product.relatedTitle}
            </h2>
            {categorySlug ? (
              <Link
                to={`/category/${categorySlug}`}
                className="text-small font-semibold text-brand hover:underline"
              >
                {t.catalog.allProducts}
              </Link>
            ) : null}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

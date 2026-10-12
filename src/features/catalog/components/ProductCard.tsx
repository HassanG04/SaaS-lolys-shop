import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useLanguage } from '@/i18n/LanguageProvider'
import { formatEGP } from '@/lib/format'
import { ProductImage } from './ProductImage'
import type { Product, ProductWithCategory } from '../types'

export interface ProductCardProps {
  product: Product | ProductWithCategory
  onAddToCart?: (product: Product | ProductWithCategory) => void
  isAddingToCart?: boolean
  className?: string
}

export function ProductCard({
  product,
  onAddToCart,
  isAddingToCart = false,
  className = '',
}: ProductCardProps) {
  const { t, lang } = useLanguage()

  const isSoldOut = Boolean(!product.in_stock || product.stock_quantity <= 0)
  const hasDiscount = Boolean(product.discount_percent && product.discount_percent > 0)

  const finalPrice =
    typeof product.final_price === 'number'
      ? product.final_price
      : hasDiscount
        ? Math.round(product.price * (1 - product.discount_percent / 100))
        : product.price

  const displayName = lang === 'ar' ? product.name_ar || product.name : product.name

  const productUrl = `/product/${product.id}`

  return (
    <Card
      className={`group flex h-full flex-col justify-between p-3 transition-shadow hover:shadow-card ${className}`}
      data-testid={`product-card-${product.id}`}
    >
      <div>
        {/* Image Container with Badges */}
        <div className="relative mb-3 overflow-hidden rounded-image">
          <Link to={productUrl} tabIndex={-1} aria-hidden="true" className="block">
            <ProductImage
              src={product.image_url}
              alt={displayName}
              imageClassName="transition-transform duration-300 group-hover:scale-105"
            />
          </Link>

          {/* Badges Overlay */}
          <div className="pointer-events-none absolute inset-x-2 top-2 flex items-center justify-between gap-1">
            {hasDiscount ? (
              <Badge variant="sale" label={`-${product.discount_percent}%`} />
            ) : (
              <span />
            )}

            {isSoldOut && <Badge variant="sold-out" label={t.product.soldout} />}
          </div>
        </div>

        {/* Product Info */}
        <div className="space-y-1 px-1">
          <h3 className="line-clamp-2 text-body font-semibold text-text transition-colors group-hover:text-brand">
            <Link to={productUrl} className="focus-visible:outline-none focus-visible:underline">
              {displayName}
            </Link>
          </h3>

          {/* Price display with optional struck-through original */}
          <div className="flex flex-wrap items-baseline gap-2 pt-1">
            <span className="text-h3 font-bold text-brand">{formatEGP(finalPrice, lang)}</span>
            {hasDiscount && (
              <del className="text-small text-text-muted">{formatEGP(product.price, lang)}</del>
            )}
          </div>
        </div>
      </div>

      {/* Add to cart action button */}
      <div className="mt-4 px-1 pb-1">
        <Button
          variant="primary"
          disabled={isSoldOut || isAddingToCart}
          aria-busy={isAddingToCart ? 'true' : undefined}
          onClick={() => onAddToCart?.(product)}
          className="w-full"
          aria-label={
            isSoldOut
              ? `${displayName} - ${t.product.soldout}`
              : `${t.product.add} - ${displayName}`
          }
        >
          {isSoldOut ? t.product.soldout : t.product.add}
        </Button>
      </div>
    </Card>
  )
}

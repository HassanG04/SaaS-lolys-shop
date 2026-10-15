import { Link } from 'react-router-dom'
import { useLanguage } from '@/i18n/LanguageProvider'
import { ProductImage } from './ProductImage'
import type { Category } from '../types'

export interface CategoryTileProps {
  category:
    | Category
    | {
        id: number
        name: string
        name_ar?: string | null
        slug: string
        image_url?: string | null
      }
  className?: string
}

export function CategoryTile({ category, className = '' }: CategoryTileProps) {
  const { lang } = useLanguage()

  const displayName = lang === 'ar' ? category.name_ar || category.name : category.name

  return (
    <Link
      to={`/category/${category.slug}`}
      className={`catalog-category group block w-full overflow-hidden rounded-card border border-border bg-surface p-2 sm:p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${className}`}
      data-testid={`category-tile-${category.slug}`}
      aria-label={displayName}
    >
      {/* Square photography suits jewelry and homeware equally. */}
      <ProductImage
        src={category.image_url}
        alt={displayName}
        aspectRatio="square"
        className="rounded-image"
      />

      {/* Keep the label readable independently of the photograph. */}
      <div className="flex min-h-14 items-center justify-center px-1 py-3 text-center">
        <span className="text-small font-semibold text-brand">{displayName}</span>
      </div>
    </Link>
  )
}

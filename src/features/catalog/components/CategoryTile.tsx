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
      className={`group relative block aspect-square w-full overflow-hidden rounded-card border border-border bg-surface transition-shadow hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${className}`}
      data-testid={`category-tile-${category.slug}`}
      aria-label={displayName}
    >
      {/* Full-bleed background image */}
      <ProductImage
        src={category.image_url}
        alt={displayName}
        aspectRatio="square"
        className="size-full rounded-card"
        imageClassName="size-full rounded-card object-cover transition-transform duration-500 group-hover:scale-105"
      />

      {/* Floating label chip */}
      <div className="absolute inset-x-3 bottom-3 flex items-center justify-center sm:inset-x-4 sm:bottom-4">
        <span className="inline-flex max-w-full truncate rounded-pill border border-border bg-surface/90 px-4 py-1.5 text-small font-bold text-text shadow-pill backdrop-blur-sm transition-colors group-hover:bg-brand group-hover:text-brand-contrast">
          {displayName}
        </span>
      </div>
    </Link>
  )
}

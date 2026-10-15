import { useState, type ChangeEvent } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { PearlOrnament, RibbonBow } from '@/components/ui/ornaments'
import { ProductCard, ProductImage } from '@/features/catalog'
import { useCategory, useBrowseProducts, type ProductSortOption } from '@/features/catalog'
import { Checkbox } from '@/components/ui/Checkbox'
import { CatalogSkeleton } from '@/features/catalog/components/CatalogSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorPanel } from '@/components/ui/ErrorPanel'
import { useLanguage } from '@/i18n/LanguageProvider'

const VALID_SORTS: ProductSortOption[] = ['best_sellers', 'newest', 'price_asc', 'price_desc']

export default function CategoryPage() {
  const { slug = 'all' } = useParams<{ slug: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const { lang, t } = useLanguage()

  // 1. Filter state initialized directly from URL search params
  const sortParam = searchParams.get('sort') as ProductSortOption | null
  const sortBy: ProductSortOption =
    sortParam && VALID_SORTS.includes(sortParam) ? sortParam : 'best_sellers'

  const soldOutParam = searchParams.get('sold_out')
  const showSoldOut = soldOutParam === '1' || soldOutParam === 'true'

  // Pagination limit (starts at 12, increases in steps of 12)
  const [limit, setLimit] = useState(12)

  const isAll = !slug || slug === 'all'

  // 2. Fetch category details (for slug !== 'all')
  const {
    data: category,
    isLoading: isCategoryLoading,
    error: categoryError,
  } = useCategory(isAll ? null : slug)

  // 3. Fetch products matching category, sort, and stock filters
  const {
    data: browseData,
    isLoading: isBrowseLoading,
    isFetching: isBrowseFetching,
    error: browseError,
    refetch,
  } = useBrowseProducts({
    categorySlug: slug,
    sortBy,
    limit,
    offset: 0,
    inStockOnly: !showSoldOut,
  })

  // Handlers for URL search params synchronization
  const handleSortChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newSort = e.target.value as ProductSortOption
    setLimit(12)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (newSort === 'best_sellers') {
        next.delete('sort')
      } else {
        next.set('sort', newSort)
      }
      return next
    })
  }

  const handleToggleSoldOut = (e: ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked
    setLimit(12)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (isChecked) {
        next.set('sold_out', '1')
      } else {
        next.delete('sold_out')
      }
      return next
    })
  }

  const handleLoadMore = () => {
    setLimit((prev) => prev + 12)
  }

  // 4. Unknown slug shows 404
  if (!isAll && !isCategoryLoading && !category) {
    return (
      <div className="mx-auto max-w-lg text-center space-y-6 py-12" role="region" aria-label="404">
        <div className="rounded-card border border-border bg-surface p-8 sm:p-12 space-y-6">
          <div className="flex justify-center text-brand">
            <RibbonBow className="size-16" />
          </div>
          <h1 className="text-display font-bold font-accent text-brand">404</h1>
          <h2 className="text-h2 font-semibold text-text">{t.catalog.categoryNotFound}</h2>
          <p className="text-body text-text-muted">{t.catalog.categoryNotFoundDesc}</p>
          <div className="pt-2">
            <Link
              to="/category/all"
              className="inline-flex h-11 items-center justify-center rounded-pill bg-brand px-6 text-small font-semibold text-brand-contrast transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-focus"
            >
              {t.catalog.browseCategories}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const categoryName = isAll
    ? t.catalog.allProducts
    : lang === 'ar'
      ? category?.name_ar || category?.name || slug
      : category?.name || slug

  const products = browseData?.products ?? []
  const totalCount = browseData?.totalCount ?? products.length

  return (
    <div className="space-y-8">
      {/* 1. Breadcrumb navigation */}
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
          <li>
            <Link
              to="/category/all"
              className={`transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus rounded-chip px-1 ${
                isAll ? 'font-semibold text-brand' : ''
              }`}
            >
              {t.catalog.allProducts}
            </Link>
          </li>
          {!isAll ? (
            <>
              <li aria-hidden="true" className="text-sand">
                /
              </li>
              <li aria-current="page" className="font-semibold text-brand px-1">
                {categoryName}
              </li>
            </>
          ) : null}
        </ol>
      </nav>

      {/* 2. Category Header with Square Photo & Ornaments */}
      <header className="relative overflow-hidden rounded-card border border-border bg-surface p-6 sm:p-8 shadow-card">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-start flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h1 className="text-h1 font-bold font-accent text-brand">{categoryName}</h1>
              <span className="rounded-pill bg-surface-tint border border-border px-3 py-0.5 text-caption font-semibold text-brand">
                {t('product.items', { count: totalCount })}
              </span>
            </div>
            <p className="text-body text-text-muted max-w-xl">
              {isAll ? t.catalog.aboutStory : t.catalog.shippingDetails}
            </p>
          </div>

          {category?.image_url ? (
            <div className="relative shrink-0">
              <div className="w-28 rounded-card border border-border bg-surface-tint p-2 shadow-card sm:w-36">
                <ProductImage
                  src={category.image_url}
                  alt={categoryName}
                  loading="eager"
                  fetchPriority="high"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center text-brand shrink-0">
              <PearlOrnament className="h-6 w-28 text-sand" />
            </div>
          )}
        </div>
      </header>

      {/* 3. Filter Bar (Sort dropdown & Show Sold Out toggle) */}
      <section
        aria-label="Filter products"
        className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 rounded-card border border-border bg-surface p-4 shadow-card"
      >
        {/* "Show sold out" toggle */}
        <div className="flex items-center">
          <Checkbox
            id="show-sold-out-toggle"
            label={t.catalog.showSoldOut}
            checked={showSoldOut}
            onChange={handleToggleSoldOut}
          />
        </div>

        {/* Sort option select */}
        <div className="flex items-center gap-2 justify-end">
          <label
            htmlFor="category-sort-select"
            className="text-small font-semibold text-text whitespace-nowrap"
          >
            {t.catalog.sortBy}:
          </label>
          <select
            id="category-sort-select"
            value={sortBy}
            onChange={handleSortChange}
            className="rounded-pill border border-border-input bg-surface px-4 py-2 text-small text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <option value="best_sellers">{t.catalog.sortBestSellers}</option>
            <option value="newest">{t.catalog.sortNewest}</option>
            <option value="price_asc">{t.catalog.sortPriceAsc}</option>
            <option value="price_desc">{t.catalog.sortPriceDesc}</option>
          </select>
        </div>
      </section>

      {/* 4. Products grid & Feedback states */}
      {categoryError ? (
        <ErrorPanel error={categoryError} />
      ) : browseError ? (
        <ErrorPanel error={browseError} onRetry={() => refetch()} />
      ) : isBrowseLoading && products.length === 0 ? (
        <CatalogSkeleton />
      ) : products.length === 0 ? (
        <EmptyState title={t.catalog.noProducts} />
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Load More Button */}
          {browseData?.hasMore ? (
            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={isBrowseFetching}
                className="h-11 rounded-pill border border-brand bg-surface px-8 text-small font-semibold text-brand transition-all hover:bg-brand hover:text-brand-contrast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50"
              >
                {isBrowseFetching ? '...' : t.catalog.loadMore}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

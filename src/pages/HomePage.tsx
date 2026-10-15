import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '@/i18n/LanguageProvider'
import {
  useCategories,
  useBestSellers,
  useBrowseProducts,
  ProductCard,
  CategoryTile,
  type ProductSortOption,
} from '@/features/catalog'
import { usePublicSettings } from '@/features/settings'
import { Sparkle, RibbonBow, RibbonDivider, PearlOrnament } from '@/components/ui/ornaments'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorPanel } from '@/components/ui/ErrorPanel'
import { CatalogSkeleton } from '@/features/catalog/components/CatalogSkeleton'
import { StorefrontHero } from '@/features/catalog/components/StorefrontHero'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export default function HomePage() {
  const { t, lang } = useLanguage()
  const { data: settings } = usePublicSettings()
  const {
    data: categories = [],
    isLoading: isCategoriesLoading,
    error: categoriesError,
  } = useCategories()
  const { data: bestSellers = [] } = useBestSellers(4)

  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<ProductSortOption>('best_sellers')
  const [limit, setLimit] = useState<number>(12)

  const {
    data: browseData,
    isLoading: isBrowseLoading,
    error: browseError,
  } = useBrowseProducts({
    categorySlug: selectedCategory === 'all' ? undefined : selectedCategory,
    sortBy,
    limit,
    offset: 0,
  })

  // Dynamic public settings with graceful copy deck fallbacks
  const salePercent = typeof settings?.sale_percent === 'number' ? settings.sale_percent : 0

  const heroTitle =
    (lang === 'ar' ? (settings?.hero_title_ar as string) : undefined) || t.hero.cozyTitle

  const heroSubtitle =
    (lang === 'ar' ? (settings?.hero_subtitle_ar as string) : undefined) || t.hero.subtitle

  const returnsText =
    (lang === 'ar' ? (settings?.returns_text_ar as string) : undefined) || t.hero.returnsSummary

  const handleCategorySelect = (slug: string) => {
    setSelectedCategory(slug)
    setLimit(12)
  }

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value as ProductSortOption)
    setLimit(12)
  }

  const handleLoadMore = () => {
    setLimit((prev) => prev + 12)
  }

  const activeCategoryObject = useMemo(() => {
    if (selectedCategory === 'all') return null
    return categories.find((c) => c.slug === selectedCategory) ?? null
  }, [categories, selectedCategory])

  return (
    <div className="space-y-12 pb-16 sm:space-y-16">
      <StorefrontHero
        title={heroTitle}
        subtitle={heroSubtitle}
        salePercent={salePercent}
        featured={bestSellers[0]}
      />

      {/* 2. CATEGORY PILLS (Quick Navigation) */}
      <nav aria-label={t.section.categories} className="space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => handleCategorySelect('all')}
            aria-pressed={selectedCategory === 'all'}
            className={`ui-control rounded-pill px-5 py-2 text-small font-semibold transition-colors ${
              selectedCategory === 'all'
                ? 'bg-brand text-brand-contrast shadow-pill'
                : 'border border-border bg-surface text-text hover:border-brand hover:text-brand'
            }`}
          >
            {t.catalog.allCategories}
          </button>
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.slug
            const displayName = lang === 'ar' ? cat.name_ar || cat.name : cat.name
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategorySelect(cat.slug)}
                aria-pressed={isSelected}
                className={`ui-control rounded-pill px-5 py-2 text-small font-semibold transition-colors ${
                  isSelected
                    ? 'bg-brand text-brand-contrast shadow-pill'
                    : 'border border-border bg-surface text-text hover:border-brand hover:text-brand'
                }`}
              >
                {displayName}
              </button>
            )
          })}
        </div>
      </nav>

      <RibbonDivider className="mx-auto h-6 w-48 text-pink" />

      {/* 3. STORE SECTION (Category Tiles) */}
      <section id="store" aria-labelledby="store-heading" className="space-y-8 scroll-mt-24">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 text-brand">
            <RibbonBow className="size-5" />
            <h2 id="store-heading" className="font-accent text-h2 font-bold text-brand">
              {t.section.categories}
            </h2>
            <RibbonBow className="size-5" />
          </div>
          <p className="text-body text-text-muted">{t.hero.collectionsSubtitle}</p>
        </div>

        {categoriesError ? (
          <ErrorPanel error={categoriesError} />
        ) : isCategoriesLoading ? (
          <CatalogSkeleton count={4} categories />
        ) : categories.length === 0 ? (
          <EmptyState title={t.ui.emptyState} />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {categories.map((cat) => (
              <CategoryTile key={cat.id} category={cat} />
            ))}
          </div>
        )}
      </section>

      <RibbonDivider className="mx-auto h-6 w-48 text-pink" />

      {/* 4. BROWSE SECTION (Catalog Filters, Best Sellers first, Load More) */}
      <section id="browse" aria-labelledby="browse-heading" className="space-y-8 scroll-mt-24">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h2 id="browse-heading" className="font-accent text-h2 font-bold text-brand">
              {activeCategoryObject
                ? lang === 'ar'
                  ? activeCategoryObject.name_ar || activeCategoryObject.name
                  : activeCategoryObject.name
                : t.section.all}
            </h2>
            <p className="text-caption text-text-muted mt-1">
              {browseData ? t('product.items', { count: browseData.totalCount }) : ''}
            </p>
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <label
              htmlFor="sort-select"
              className="text-small font-semibold text-text whitespace-nowrap"
            >
              {t.catalog.sortBy}:
            </label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={handleSortChange}
              className="ui-control rounded-pill border border-border-input bg-surface px-4 py-1.5 text-small text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <option value="best_sellers">{t.catalog.sortBestSellers}</option>
              <option value="newest">{t.catalog.sortNewest}</option>
              <option value="price_asc">{t.catalog.sortPriceAsc}</option>
              <option value="price_desc">{t.catalog.sortPriceDesc}</option>
            </select>
          </div>
        </div>

        {browseError ? (
          <ErrorPanel error={browseError} />
        ) : isBrowseLoading && !browseData ? (
          <CatalogSkeleton />
        ) : !browseData || browseData.products.length === 0 ? (
          <EmptyState title={t.catalog.noProducts} />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {browseData.products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Load more in steps of 12 */}
            {browseData.hasMore && (
              <div className="flex justify-center pt-8">
                <Button
                  variant="secondary"
                  onClick={handleLoadMore}
                  disabled={isBrowseLoading}
                  className="px-8 py-2.5"
                >
                  {t.catalog.loadMore}
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      <RibbonDivider className="mx-auto h-6 w-48 text-pink" />

      {/* 5. ABOUT AND DELIVERY INFO SECTION */}
      <section id="about" aria-labelledby="about-heading" className="space-y-8 scroll-mt-24">
        <div className="text-center space-y-2">
          <h2 id="about-heading" className="font-accent text-h2 font-bold text-brand">
            {t.section.about}
          </h2>
          <p className="text-body text-text-muted">
            {(lang === 'ar' ? (settings?.tagline_ar as string) : undefined) || t.brand.tagline}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 rounded-card bg-surface-tint p-4 md:grid-cols-3 sm:gap-6 sm:p-6">
          {/* About story card */}
          <Card className="p-6 space-y-4 rounded-card border border-border bg-surface shadow-card">
            <div className="inline-flex size-12 items-center justify-center rounded-pill bg-surface-tint text-brand">
              <RibbonBow className="size-6 text-brand" />
            </div>
            <h3 className="text-h3 font-bold text-brand">{t.section.about}</h3>
            <p className="text-body text-text-muted leading-relaxed">{t.catalog.aboutStory}</p>
          </Card>

          {/* Delivery & Payment card */}
          <Card className="p-6 space-y-4 rounded-card border border-border bg-surface shadow-card">
            <div className="inline-flex size-12 items-center justify-center rounded-pill bg-surface-tint text-brand">
              <Sparkle className="size-6 text-brand" />
            </div>
            <h3 className="text-h3 font-bold text-brand">{t.section.delivery}</h3>
            <p className="text-body text-text-muted leading-relaxed">{t.catalog.shippingDetails}</p>
            <div className="flex flex-wrap gap-2 pt-2">
              {settings?.payment_methods_enabled?.includes('cod') && (
                <span className="rounded-pill bg-surface-tint border border-border px-3 py-1 text-caption font-semibold text-brand">
                  {t.payment.cod}
                </span>
              )}
              {settings?.payment_methods_enabled?.includes('instapay_qr') && (
                <span className="rounded-pill bg-surface-tint border border-border px-3 py-1 text-caption font-semibold text-brand">
                  {t.payment.instapay}
                </span>
              )}
            </div>
          </Card>

          {/* Returns & Exchange Guarantee card */}
          <Card className="p-6 space-y-4 rounded-card border border-border bg-surface shadow-card">
            <div className="inline-flex size-12 items-center justify-center rounded-pill bg-surface-tint text-brand">
              <PearlOrnament className="h-6 w-12 text-brand" />
            </div>
            <h3 className="text-h3 font-bold text-brand">{t.catalog.returnsPolicy}</h3>
            <p className="text-body text-text-muted leading-relaxed">{returnsText}</p>
            <div className="pt-2">
              <Link to="/returns" className="text-small font-semibold text-brand hover:underline">
                {t.footer.returns} <span aria-hidden="true">{lang === 'ar' ? '←' : '→'}</span>
              </Link>
            </div>
          </Card>
        </div>
      </section>
    </div>
  )
}

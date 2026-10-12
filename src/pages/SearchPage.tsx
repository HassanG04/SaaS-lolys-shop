import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageProvider'
import { useSearchProducts } from '../features/catalog/hooks'
import { ProductCard } from '../features/catalog/components/ProductCard'
import { Skeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorPanel } from '../components/ui/ErrorPanel'
import { useSeo } from '../features/seo'

export default function SearchPage() {
  const { t } = useLanguage()
  const [searchParams, setSearchParams] = useSearchParams()
  const urlQuery = (searchParams.get('q') ?? '').trim()
  const [inputValue, setInputValue] = useState(urlQuery)
  const [prevUrlQuery, setPrevUrlQuery] = useState(urlQuery)

  // Synchronize local input state if URL search query changes externally
  if (urlQuery !== prevUrlQuery) {
    setPrevUrlQuery(urlQuery)
    setInputValue(urlQuery)
  }

  // Debounced search query update to URL search params (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = inputValue.trim()
      if (trimmed !== urlQuery) {
        if (trimmed) {
          setSearchParams({ q: trimmed }, { replace: true })
        } else {
          setSearchParams({}, { replace: true })
        }
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [inputValue, urlQuery, setSearchParams])

  useSeo({
    title: urlQuery ? `${urlQuery} - ${t.search.title}` : t.search.title,
    description: urlQuery ? `${t.search.resultsFor} ${urlQuery}` : t.search.placeholder,
  })

  const { data: products, isLoading, isError, error, refetch } = useSearchProducts(urlQuery, 40)

  const handleClear = () => {
    setInputValue('')
    setSearchParams({}, { replace: true })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = inputValue.trim()
    if (trimmed !== urlQuery) {
      if (trimmed) {
        setSearchParams({ q: trimmed }, { replace: true })
      } else {
        setSearchParams({}, { replace: true })
      }
    }
  }

  return (
    <div className="space-y-8">
      {/* Search Header */}
      <div className="flex flex-col gap-4">
        <h1 className="font-accent text-h2 font-bold text-brand">{t.search.title}</h1>

        {/* Debounced Search Bar */}
        <form role="search" onSubmit={handleSubmit} className="relative max-w-xl">
          <input
            type="search"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={t.search.placeholder}
            aria-label={t.ui.search}
            className="w-full h-12 rounded-pill border border-border-input bg-surface ps-5 pe-24 text-body text-text placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-focus"
          />

          <div className="absolute end-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {inputValue && (
              <button
                type="button"
                onClick={handleClear}
                aria-label={t.search.clearSearch}
                className="flex h-8 w-8 items-center justify-center rounded-pill text-text-muted hover:text-text focus:outline-none focus:ring-2 focus:ring-focus"
              >
                <svg
                  className="size-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}

            <button
              type="submit"
              aria-label={t.ui.search}
              className="flex h-9 w-9 items-center justify-center rounded-pill bg-brand text-brand-contrast transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-focus"
            >
              <svg
                className="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </button>
          </div>
        </form>
      </div>

      {/* Main Content Areas */}
      {!urlQuery ? (
        <EmptyState
          title={t.search.noQueryTitle}
          description={t.search.noQueryMessage}
          action={
            <Link
              to="/category/all"
              className="inline-flex h-11 items-center justify-center rounded-pill bg-brand px-6 text-body font-semibold text-brand-contrast transition-opacity hover:opacity-95"
            >
              {t.nav.browse}
            </Link>
          }
        />
      ) : isError ? (
        <ErrorPanel error={error} onRetry={() => void refetch()} retryLabel={t.ui.retry} />
      ) : isLoading ? (
        <div
          role="status"
          aria-label="Searching products"
          className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4"
        >
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={idx}
              className="flex flex-col gap-3 rounded-card border border-border bg-surface p-3 shadow-card"
            >
              <Skeleton className="aspect-square w-full rounded-image" />
              <Skeleton className="h-4 w-3/4 rounded-pill" />
              <Skeleton className="h-4 w-1/3 rounded-pill" />
            </div>
          ))}
        </div>
      ) : products && products.length === 0 ? (
        <EmptyState
          description={t.empty.search}
          action={
            <Link
              to="/category/all"
              className="inline-flex h-11 items-center justify-center rounded-pill bg-brand px-6 text-body font-semibold text-brand-contrast transition-opacity hover:opacity-95"
            >
              {t.nav.browse}
            </Link>
          }
        />
      ) : products ? (
        <div className="space-y-6">
          {/* Query Summary & Results Count */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 text-small text-text-muted">
            <p>
              <span>{t.search.resultsFor} </span>
              <strong className="text-brand">«{urlQuery}»</strong>
            </p>
            <p className="font-semibold text-text">
              {t('search.productsCount', { count: products.length })}
            </p>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

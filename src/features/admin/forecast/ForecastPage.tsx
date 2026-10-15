import { useState, useMemo } from 'react'
import { useLanguage } from '@/i18n/LanguageProvider'
import { ErrorPanel } from '@/components/ui/ErrorPanel'
import { PearlLoader } from '@/components/ui/PearlLoader'
import { formatNumber } from '@/lib/format'
import {
  useAdminForecasts,
  useAdminReorderList,
  useForecastCategories,
  useForecastProducts,
} from './hooks'
import { ForecastBadges } from './ForecastBadges'
import { ForecastChart } from './ForecastChart'
import { ReorderTable } from './ReorderTable'
import { useForecastI18n } from './i18n'
import type { SeriesType } from './types'

export default function ForecastPage() {
  const { lang } = useLanguage()
  const t = useForecastI18n(lang)

  // Series selection state
  const [seriesType, setSeriesType] = useState<SeriesType>('shop')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [productId, setProductId] = useState<number | null>(null)

  // Reorder calculation parameters
  const [leadTime, setLeadTime] = useState<number>(7)
  const [serviceZ, setServiceZ] = useState<number>(1.28)

  // Options queries
  const { data: categories = [] } = useForecastCategories()
  const { data: products = [] } = useForecastProducts()

  // Active series ID
  const activeSeriesId = useMemo(() => {
    if (seriesType === 'category') return categoryId ?? categories[0]?.id ?? null
    if (seriesType === 'product') return productId ?? products[0]?.id ?? null
    return null
  }, [seriesType, categoryId, productId, categories, products])

  // Forecast query
  const {
    data: forecastData,
    isLoading: isForecastLoading,
    isError: isForecastError,
    error: forecastError,
    refetch: refetchForecast,
  } = useAdminForecasts(seriesType, activeSeriesId)

  // Reorder list query
  const {
    data: reorderItems = [],
    isLoading: isReorderLoading,
    isError: isReorderError,
    error: reorderError,
    refetch: refetchReorder,
  } = useAdminReorderList(leadTime, serviceZ)

  // Key for readiness lookup in notes
  const seriesKey = useMemo(() => {
    if (seriesType === 'category' && activeSeriesId) return `category_${activeSeriesId}`
    if (seriesType === 'product' && activeSeriesId) return `product_${activeSeriesId}`
    return 'shop'
  }, [seriesType, activeSeriesId])

  // Summary Metrics
  const summary = useMemo(() => {
    const totalPredictedUnits = (forecastData?.forecasts || []).reduce(
      (sum, f) => sum + Number(f.predicted_units),
      0,
    )
    const needsReorderCount = reorderItems.filter((i) => i.needs_reorder).length
    const stockRiskCount = reorderItems.filter((i) => i.days_of_cover <= 14).length
    const deadStockCount = reorderItems.filter(
      (i) => i.is_dead_stock || i.days_since_last_sale >= 60,
    ).length

    return {
      totalPredictedUnits,
      needsReorderCount,
      stockRiskCount,
      deadStockCount,
    }
  }, [forecastData, reorderItems])

  return (
    <div className="space-y-8" data-testid="admin-forecast-page">
      {/* Page Header */}
      <div className="rounded-card border border-border bg-surface p-6 sm:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-card">
        <div>
          <h1 className="text-h1 font-bold font-accent text-brand">{t.title}</h1>
          <p className="mt-2 text-body text-text-muted">{t.subtitle}</p>
        </div>

        {forecastData?.run && (
          <div className="text-caption text-text-muted space-y-1 md:text-end">
            <p>
              {t.runInfo}:{' '}
              <strong className="text-text font-mono">
                {new Date(forecastData.run.run_at).toLocaleDateString(
                  lang === 'ar' ? 'ar-EG' : 'en-US',
                )}
              </strong>
            </p>
            <p>
              {t.version}: <span className="font-mono">{forecastData.run.model_version}</span>
              {forecastData.run.git_commit && (
                <span className="ms-1.5 opacity-75 font-mono">
                  ({forecastData.run.git_commit.slice(0, 7)})
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Next Period Forecast Units */}
        <div className="rounded-card border border-border bg-surface p-5 shadow-card">
          <p className="text-caption font-semibold text-text-muted">{t.viewUnits}</p>
          <p className="mt-2 text-h2 font-bold font-accent text-brand">
            {isForecastLoading
              ? '…'
              : formatNumber(Math.round(summary.totalPredictedUnits), undefined, lang)}
          </p>
          <p className="mt-1 text-caption text-text-muted">
            {lang === 'ar' ? 'إجمالي التوقع للفترة القادمة' : 'Total projected units next period'}
          </p>
        </div>

        {/* Needs Reorder */}
        <div className="rounded-card border border-border bg-surface p-5 shadow-card">
          <p className="text-caption font-semibold text-danger">{t.tabNeedsReorder}</p>
          <p className="mt-2 text-h2 font-bold font-accent text-danger">
            {isReorderLoading ? '…' : formatNumber(summary.needsReorderCount, undefined, lang)}
          </p>
          <p className="mt-1 text-caption text-text-muted">
            {lang === 'ar' ? 'المخزون أقل من نقطة الطلب' : 'Stock at or below reorder point'}
          </p>
        </div>

        {/* Stock Risk */}
        <div className="rounded-card border border-border bg-surface p-5 shadow-card">
          <p className="text-caption font-semibold text-warning">{t.tabStockRisk}</p>
          <p className="mt-2 text-h2 font-bold font-accent text-warning">
            {isReorderLoading ? '…' : formatNumber(summary.stockRiskCount, undefined, lang)}
          </p>
          <p className="mt-1 text-caption text-text-muted">
            {lang === 'ar' ? 'تغطية المخزون 14 يومًا أو أقل' : 'Days of cover ≤ 14 days'}
          </p>
        </div>

        {/* Dead Stock */}
        <div className="rounded-card border border-border bg-surface p-5 shadow-card">
          <p className="text-caption font-semibold text-text-muted">{t.tabDeadStock}</p>
          <p className="mt-2 text-h2 font-bold font-accent text-text">
            {isReorderLoading ? '…' : formatNumber(summary.deadStockCount, undefined, lang)}
          </p>
          <p className="mt-1 text-caption text-text-muted">
            {lang === 'ar' ? 'بدون مبيعات منذ 60 يومًا' : 'No sales in last 60 days'}
          </p>
        </div>
      </div>

      {/* Series Level Switcher & Sub-Selector */}
      <div className="rounded-card border border-border bg-surface p-4 shadow-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Level Tabs */}
          <div className="inline-flex rounded-pill border border-border bg-surface-2 p-1 text-caption">
            <button
              type="button"
              onClick={() => {
                setSeriesType('shop')
              }}
              className={`rounded-pill px-4 py-1.5 font-semibold transition-colors ${
                seriesType === 'shop'
                  ? 'bg-brand text-brand-contrast shadow-pill'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              {t.shopLevel}
            </button>
            <button
              type="button"
              onClick={() => {
                setSeriesType('category')
                if (!categoryId && categories[0]) setCategoryId(categories[0].id)
              }}
              className={`rounded-pill px-4 py-1.5 font-semibold transition-colors ${
                seriesType === 'category'
                  ? 'bg-brand text-brand-contrast shadow-pill'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              {t.categoryLevel}
            </button>
            <button
              type="button"
              onClick={() => {
                setSeriesType('product')
                if (!productId && products[0]) setProductId(products[0].id)
              }}
              className={`rounded-pill px-4 py-1.5 font-semibold transition-colors ${
                seriesType === 'product'
                  ? 'bg-brand text-brand-contrast shadow-pill'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              {t.productLevel}
            </button>
          </div>

          {/* Sub-selectors for Category or Product */}
          {seriesType === 'category' && (
            <div className="flex items-center gap-2 text-caption">
              <label htmlFor="category-select" className="font-medium text-text">
                {t.selectCategory}:
              </label>
              <select
                id="category-select"
                value={categoryId ?? (categories[0]?.id || '')}
                onChange={(e) => setCategoryId(Number(e.target.value))}
                className="rounded-pill border border-border bg-surface px-3 py-1.5 text-caption text-text"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_ar}
                  </option>
                ))}
              </select>
            </div>
          )}

          {seriesType === 'product' && (
            <div className="flex items-center gap-2 text-caption">
              <label htmlFor="product-select" className="font-medium text-text">
                {t.selectProduct}:
              </label>
              <select
                id="product-select"
                value={productId ?? (products[0]?.id || '')}
                onChange={(e) => setProductId(Number(e.target.value))}
                className="rounded-pill border border-border bg-surface px-3 py-1.5 text-caption text-text max-w-xs truncate"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name_ar} (#{p.id})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Badges for selected series */}
        <ForecastBadges
          status={forecastData?.status ?? 'ok'}
          run={forecastData?.run}
          metrics={forecastData?.metrics}
          seriesKey={seriesKey}
        />
      </div>

      {/* Forecast Chart Section */}
      {isForecastLoading ? (
        <div className="flex h-72 items-center justify-center text-brand">
          <PearlLoader loading />
        </div>
      ) : isForecastError ? (
        <ErrorPanel
          title={lang === 'ar' ? 'تعذر تحميل بيانات التوقعات' : 'Failed to load forecasts'}
          message={forecastError?.message}
          onRetry={refetchForecast}
        />
      ) : (
        <ForecastChart
          forecasts={forecastData?.forecasts ?? []}
          history={forecastData?.history ?? []}
        />
      )}

      {/* Reorder & Stock Risk Section */}
      {isReorderError ? (
        <ErrorPanel
          title={lang === 'ar' ? 'تعذر تحميل قائمة إعادة الطلب' : 'Failed to load reorder list'}
          message={reorderError?.message}
          onRetry={refetchReorder}
        />
      ) : (
        <ReorderTable
          items={reorderItems}
          isLoading={isReorderLoading}
          leadTime={leadTime}
          setLeadTime={setLeadTime}
          serviceZ={serviceZ}
          setServiceZ={setServiceZ}
          categories={categories}
        />
      )}
    </div>
  )
}

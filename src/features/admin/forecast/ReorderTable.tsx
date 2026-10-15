import { useState, useMemo } from 'react'
import { useLanguage } from '@/i18n/LanguageProvider'
import { formatNumber } from '@/lib/format'
import { buildCsv, downloadCsv, getExportFilename } from '../export/csv'
import { useForecastI18n } from './i18n'
import type { ForecastCategoryOption, ReorderItem } from './types'

type FilterTab = 'needs_reorder' | 'stock_risk' | 'dead_stock' | 'all'

interface ReorderTableProps {
  items: ReorderItem[]
  isLoading: boolean
  leadTime: number
  setLeadTime: (v: number) => void
  serviceZ: number
  setServiceZ: (v: number) => void
  categories?: ForecastCategoryOption[]
}

export function ReorderTable({
  items,
  isLoading,
  leadTime,
  setLeadTime,
  serviceZ,
  setServiceZ,
  categories = [],
}: ReorderTableProps) {
  const { lang } = useLanguage()
  const t = useForecastI18n(lang)
  const [activeTab, setActiveTab] = useState<FilterTab>('needs_reorder')
  const [searchQuery, setSearchQuery] = useState('')

  const categoryMap = useMemo(() => {
    const map = new Map<number, string>()
    categories.forEach((c) => map.set(c.id, c.name_ar))
    return map
  }, [categories])

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Tab filter
      if (activeTab === 'needs_reorder' && !item.needs_reorder) return false
      if (activeTab === 'stock_risk' && item.days_of_cover > 14) return false
      if (activeTab === 'dead_stock' && !item.is_dead_stock && item.days_since_last_sale < 60)
        return false

      // 2. Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchesName =
          item.name_ar.toLowerCase().includes(q) || item.name.toLowerCase().includes(q)
        const matchesId = String(item.product_id).includes(q)
        if (!matchesName && !matchesId) return false
      }

      return true
    })
  }, [items, activeTab, searchQuery])

  // Counts for tabs
  const counts = useMemo(() => {
    const needs = items.filter((i) => i.needs_reorder).length
    const risk = items.filter((i) => i.days_of_cover <= 14).length
    const dead = items.filter((i) => i.is_dead_stock || i.days_since_last_sale >= 60).length
    return { needs, risk, dead, all: items.length }
  }, [items])

  const handleExportCsv = () => {
    const headers = [
      '# ID',
      t.productCol,
      t.categoryCol,
      t.stockCol,
      t.dailyMeanCol,
      t.daysOfCoverCol,
      t.reorderPointCol,
      t.suggestedQtyCol,
      t.statusCol,
      t.lastSaleCol,
    ]

    const rows = filteredItems.map((item) => {
      const catName = categoryMap.get(item.category_id) || item.category_id
      let statusStr = lang === 'ar' ? 'مستقر' : 'Stable'
      if (item.needs_reorder) statusStr = t.tabNeedsReorder
      else if (item.days_of_cover <= 14) statusStr = t.tabStockRisk
      else if (item.is_dead_stock || item.days_since_last_sale >= 60) statusStr = t.tabDeadStock

      return [
        item.product_id,
        item.name_ar || item.name,
        catName,
        item.stock_quantity,
        item.daily_forecast,
        item.days_of_cover >= 999 ? '—' : item.days_of_cover,
        item.reorder_point,
        item.suggested_quantity,
        statusStr,
        item.days_since_last_sale >= 999 ? '—' : `${item.days_since_last_sale} ${t.daysUnit}`,
      ]
    })

    const csvContent = buildCsv(headers, rows)
    const filename = getExportFilename(`reorder-${activeTab}`)
    downloadCsv(csvContent, filename)
  }

  return (
    <div className="rounded-card border border-border bg-surface p-6 shadow-card space-y-5">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-h3 text-text">{t.reorderTitle}</h3>
          <p className="text-small text-text-muted">{t.subtitle}</p>
        </div>

        {/* Lead time & Service Level Parameters */}
        <div className="flex flex-wrap items-center gap-3 text-caption">
          <label className="flex items-center gap-1.5 font-medium text-text">
            <span>{t.leadTimeLabel}</span>
            <input
              type="number"
              min="1"
              max="90"
              value={leadTime}
              onChange={(e) => setLeadTime(Math.max(1, Number(e.target.value) || 7))}
              className="w-14 rounded-pill border border-border bg-surface px-2 py-1 text-center font-bold text-text"
              aria-label={t.leadTimeLabel}
            />
          </label>

          <label className="flex items-center gap-1.5 font-medium text-text">
            <span>{t.serviceZLabel}</span>
            <input
              type="number"
              step="0.01"
              min="0.5"
              max="3.0"
              value={serviceZ}
              onChange={(e) => setServiceZ(Math.max(0.5, Number(e.target.value) || 1.28))}
              className="w-16 rounded-pill border border-border bg-surface px-2 py-1 text-center font-bold text-text"
              aria-label={t.serviceZLabel}
            />
          </label>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!filteredItems.length}
            className="inline-flex items-center gap-1.5 rounded-pill border border-border bg-surface px-3 py-1 font-medium text-text hover:bg-surface-2 disabled:opacity-50 transition-colors shadow-pill"
          >
            <svg
              className="size-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {t.exportCsv}
          </button>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'needs_reorder'}
            onClick={() => setActiveTab('needs_reorder')}
            className={`inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-caption font-semibold transition-colors ${
              activeTab === 'needs_reorder'
                ? 'bg-danger text-surface shadow-pill'
                : 'text-text-muted hover:text-text hover:bg-surface-2'
            }`}
          >
            {t.tabNeedsReorder}
            <span className="rounded-pill bg-surface-tint px-1.5 py-0.2 text-caption">
              {counts.needs}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'stock_risk'}
            onClick={() => setActiveTab('stock_risk')}
            className={`inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-caption font-semibold transition-colors ${
              activeTab === 'stock_risk'
                ? 'bg-warning text-surface shadow-pill'
                : 'text-text-muted hover:text-text hover:bg-surface-2'
            }`}
          >
            {t.tabStockRisk}
            <span className="rounded-pill bg-surface-tint px-1.5 py-0.2 text-caption">
              {counts.risk}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'dead_stock'}
            onClick={() => setActiveTab('dead_stock')}
            className={`inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-caption font-semibold transition-colors ${
              activeTab === 'dead_stock'
                ? 'bg-brand text-brand-contrast shadow-pill'
                : 'text-text-muted hover:text-text hover:bg-surface-2'
            }`}
          >
            {t.tabDeadStock}
            <span className="rounded-pill bg-surface-tint px-1.5 py-0.2 text-caption">
              {counts.dead}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'all'}
            onClick={() => setActiveTab('all')}
            className={`inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-caption font-semibold transition-colors ${
              activeTab === 'all'
                ? 'bg-brand text-brand-contrast shadow-pill'
                : 'text-text-muted hover:text-text hover:bg-surface-2'
            }`}
          >
            {t.tabAll}
            <span className="rounded-pill bg-surface-tint px-1.5 py-0.2 text-caption">
              {counts.all}
            </span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === 'ar' ? 'بحث بالاسم أو الكود...' : 'Search product...'}
            className="w-full rounded-pill border border-border bg-surface px-3 py-1.5 text-caption text-text placeholder:text-text-muted focus:border-brand focus:outline-none"
          />
        </div>
      </div>

      {/* Reorder Table */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center text-text-muted text-small">
          {lang === 'ar' ? 'جارٍ تحميل بيانات إعادة الطلب...' : 'Loading reorder data...'}
        </div>
      ) : !filteredItems.length ? (
        <div className="rounded-card border border-dashed border-border p-8 text-center text-text-muted">
          <p className="font-medium">
            {activeTab === 'needs_reorder' && t.noReorderItems}
            {activeTab === 'stock_risk' && t.noRiskItems}
            {activeTab === 'dead_stock' && t.noDeadStockItems}
            {activeTab === 'all' &&
              (lang === 'ar' ? 'لا توجد منتجات مسجلة.' : 'No products found.')}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-small text-start">
            <thead>
              <tr className="border-b border-border text-caption font-semibold text-text-muted">
                <th className="py-2.5 px-3 text-start">{t.productCol}</th>
                <th className="py-2.5 px-3 text-start">{t.categoryCol}</th>
                <th className="py-2.5 px-3 text-center">{t.stockCol}</th>
                <th className="py-2.5 px-3 text-center">{t.dailyMeanCol}</th>
                <th className="py-2.5 px-3 text-center">{t.daysOfCoverCol}</th>
                <th className="py-2.5 px-3 text-center">{t.reorderPointCol}</th>
                <th className="py-2.5 px-3 text-center">{t.suggestedQtyCol}</th>
                <th className="py-2.5 px-3 text-center">{t.statusCol}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredItems.map((item) => {
                const catName = categoryMap.get(item.category_id) || `—`
                const isRisk = item.days_of_cover <= 14
                const isDead = item.is_dead_stock || item.days_since_last_sale >= 60

                return (
                  <tr key={item.product_id} className="hover:bg-surface-2/40 transition-colors">
                    {/* Product Name */}
                    <td className="py-3 px-3">
                      <div>
                        <p className="font-semibold text-text">{item.name_ar || item.name}</p>
                        <p className="text-caption text-text-muted font-mono">#{item.product_id}</p>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-3 text-text-muted">{catName}</td>

                    {/* Current Stock */}
                    <td className="py-3 px-3 text-center font-bold">
                      <span className={item.stock_quantity <= 0 ? 'text-danger' : ''}>
                        {formatNumber(item.stock_quantity, undefined, lang)}
                      </span>
                    </td>

                    {/* Daily Forecast */}
                    <td className="py-3 px-3 text-center text-text-muted font-mono">
                      {item.daily_forecast.toFixed(2)}
                    </td>

                    {/* Days of Cover */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block font-semibold ${
                          item.days_of_cover <= 14 ? 'text-danger' : 'text-text'
                        }`}
                      >
                        {item.days_of_cover >= 999 ? '—' : `${item.days_of_cover} ${t.daysUnit}`}
                      </span>
                    </td>

                    {/* Reorder Point */}
                    <td className="py-3 px-3 text-center font-mono font-medium text-text-muted">
                      {item.reorder_point}
                    </td>

                    {/* Suggested Quantity */}
                    <td className="py-3 px-3 text-center">
                      {item.suggested_quantity > 0 ? (
                        <span className="inline-flex items-center justify-center rounded-pill bg-surface-2 px-2.5 py-0.5 font-bold text-brand">
                          +{formatNumber(item.suggested_quantity, undefined, lang)}
                        </span>
                      ) : (
                        <span className="text-text-muted">0</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-3 text-center">
                      {item.needs_reorder ? (
                        <span className="inline-flex items-center rounded-pill bg-surface-tint px-2.5 py-0.5 text-caption font-bold text-danger border border-danger">
                          {t.tabNeedsReorder}
                        </span>
                      ) : isRisk ? (
                        <span className="inline-flex items-center rounded-pill bg-surface-tint px-2.5 py-0.5 text-caption font-bold text-warning border border-warning">
                          {t.tabStockRisk}
                        </span>
                      ) : isDead ? (
                        <span className="inline-flex items-center rounded-pill bg-surface-2 px-2.5 py-0.5 text-caption font-medium text-text-muted border border-border">
                          {t.tabDeadStock}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-pill bg-surface-tint px-2.5 py-0.5 text-caption font-medium text-success border border-success">
                          {lang === 'ar' ? 'مستقر' : 'Stable'}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

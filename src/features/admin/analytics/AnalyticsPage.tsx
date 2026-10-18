import type { ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { PearlLoader } from '@/components/ui/PearlLoader'
import { ExportCsvButton } from '@/features/admin/export/ExportCsvButton'
import { buildCsv, downloadCsv, getExportFilename } from '@/features/admin/export/csv'
import { useLanguage } from '@/i18n/LanguageProvider'
import { BasketAnalysisSection } from './BasketAnalysisSection'
import { CohortRetentionSection } from './CohortRetentionSection'
import { CustomerSegmentsSection } from './CustomerSegmentsSection'
import { DiscountEffectSection } from './DiscountEffectSection'
import { FulfilmentQualitySection } from './FulfilmentQualitySection'
import { GeographySection } from './GeographySection'
import { ProductPerformanceSection } from './ProductPerformanceSection'
import { SalesOverviewSection } from './SalesOverviewSection'
import { useAnalyticsInsights } from './hooks'
import { useAnalyticsI18n } from './i18n'

export default function AnalyticsPage(): ReactNode {
  const { lang } = useLanguage()
  const t = useAnalyticsI18n(lang)

  const { data, isLoading, isError, refetch, isFetching } = useAnalyticsInsights()

  const handleExportCsv = () => {
    if (!data) return

    // Build consolidated descriptive insights CSV
    const headers = [
      lang === 'ar' ? 'القسم التحليلي' : 'Analytics Section',
      lang === 'ar' ? 'البند / المقياس' : 'Item / Metric',
      lang === 'ar' ? 'القيمة 1' : 'Value 1',
      lang === 'ar' ? 'القيمة 2' : 'Value 2',
      lang === 'ar' ? 'ملاحظات' : 'Notes',
    ]

    const rows: (string | number)[][] = []

    // 1. Fulfilment Quality
    rows.push(['Fulfilment', 'Total Orders', data.fulfilment_quality.total_orders, '', ''])
    rows.push([
      'Fulfilment',
      'Cancellation Rate %',
      data.fulfilment_quality.cancellation_rate_pct,
      '',
      '',
    ])
    rows.push([
      'Fulfilment',
      'Payment Refusal Rate %',
      data.fulfilment_quality.refusal_rate_pct,
      '',
      '',
    ])
    rows.push([
      'Fulfilment',
      'Unpaid Expiry Rate %',
      data.fulfilment_quality.expiry_rate_pct,
      '',
      '',
    ])
    rows.push([
      'Fulfilment',
      'Median Delivery Days',
      data.fulfilment_quality.median_delivery_days,
      '',
      '',
    ])
    rows.push(['Fulfilment', 'Avg Proof Hours', data.fulfilment_quality.avg_proof_hours, '', ''])

    // 2. Discount Effect
    rows.push([
      'Discount Effect',
      'Promo Weekly Units',
      data.discount_effect.promo_weekly_units,
      '',
      '',
    ])
    rows.push([
      'Discount Effect',
      'Baseline Weekly Units',
      data.discount_effect.baseline_weekly_units,
      '',
      '',
    ])
    rows.push([
      'Discount Effect',
      'Uplift %',
      data.discount_effect.uplift_pct,
      '',
      data.discount_effect.note_ar,
    ])

    // 3. Customer Segments
    for (const s of data.customer_segments) {
      rows.push([
        'Customer Segments',
        s.segment,
        s.customer_count,
        s.total_revenue,
        `AOV: ${s.avg_order_value}`,
      ])
    }

    // 4. Basket Pairs
    for (const bp of data.basket_pairs) {
      rows.push([
        'Market Basket',
        `${bp.product_a_name} + ${bp.product_b_name}`,
        `Lift: ${bp.lift}x`,
        `Orders: ${bp.sample_orders}`,
        `Support: ${(bp.support * 100).toFixed(1)}%`,
      ])
    }

    // 5. Geography
    for (const g of data.geography) {
      rows.push([
        'Geography',
        g.governorate,
        g.customer_count,
        g.orders_count,
        `Revenue: ${g.total_revenue}`,
      ])
    }

    const csvContent = buildCsv(headers, rows)
    const filename = getExportFilename('analytics-insights')
    downloadCsv(csvContent, filename)
  }

  return (
    <div className="space-y-6 pb-12" data-testid="admin-analytics-page">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-h2 font-accent font-bold text-text">{t.title}</h1>
          <p className="text-caption text-text-muted mt-1">{t.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="flex items-center gap-2"
          >
            <svg
              className={`size-4 ${isFetching ? 'animate-spin' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 21h5v-5" />
            </svg>
            <span>{t.refresh}</span>
          </Button>

          <ExportCsvButton
            label={t.exportCsv}
            successMessage={t.exportSuccess}
            onExport={handleExportCsv}
            disabled={isLoading || !data}
          />
        </div>
      </div>

      {/* Loading & Error States */}
      {isLoading && (
        <div
          role="status"
          aria-label={t.loading}
          className="flex h-64 w-full items-center justify-center text-brand"
        >
          <PearlLoader loading />
        </div>
      )}

      {isError && (
        <div
          role="alert"
          className="rounded-card border border-danger bg-surface-tint p-5 text-danger flex items-center justify-between"
        >
          <p className="text-small font-semibold">{t.error}</p>
          <Button variant="danger" onClick={() => void refetch()}>
            {t.refresh}
          </Button>
        </div>
      )}

      {/* Main Content */}
      {!isLoading && !isError && data && (
        <div className="space-y-6">
          <SalesOverviewSection data={data.sales_overview} />
          <ProductPerformanceSection data={data.product_performance} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CustomerSegmentsSection data={data.customer_segments} />
            <DiscountEffectSection data={data.discount_effect} />
          </div>
          <CohortRetentionSection data={data.cohorts} />
          <BasketAnalysisSection data={data.basket_pairs} />
          <FulfilmentQualitySection data={data.fulfilment_quality} />
          <GeographySection data={data.geography} />
        </div>
      )}
    </div>
  )
}

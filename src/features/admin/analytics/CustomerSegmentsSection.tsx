import type { ReactNode } from 'react'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useAnalyticsI18n } from './i18n'
import type { CustomerSegmentItem } from './types'

interface CustomerSegmentsSectionProps {
  data: CustomerSegmentItem[]
}

export function CustomerSegmentsSection({ data }: CustomerSegmentsSectionProps): ReactNode {
  const { lang } = useLanguage()
  const t = useAnalyticsI18n(lang)

  const getSegmentTitle = (segment: string) => {
    switch (segment) {
      case 'champions':
        return t.segmentChampions
      case 'loyal':
        return t.segmentLoyal
      case 'promising':
        return t.segmentPromising
      case 'at_risk':
        return t.segmentAtRisk
      case 'lost':
        return t.segmentLost
      default:
        return t.segmentOther
    }
  }

  const getSegmentColor = (segment: string) => {
    switch (segment) {
      case 'champions':
        return 'border-success text-success bg-surface-tint'
      case 'loyal':
        return 'border-brand text-brand bg-surface-tint'
      case 'promising':
        return 'border-brand text-brand bg-surface-2'
      case 'at_risk':
        return 'border-warning text-warning bg-surface-tint'
      case 'lost':
        return 'border-danger text-danger bg-surface-tint'
      default:
        return 'border-border text-text-muted bg-surface-2'
    }
  }

  return (
    <section
      data-testid="analytics-customer-segments"
      className="rounded-card border border-border bg-surface p-5 space-y-4"
    >
      <div>
        <h2 className="text-h3 font-bold text-text">{t.segmentsTitle}</h2>
        <p className="text-caption text-text-muted mt-0.5">{t.segmentsDesc}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.length === 0 ? (
          <div className="col-span-full py-6 text-center text-text-muted">{t.empty}</div>
        ) : (
          data.map((seg) => (
            <div
              key={seg.segment}
              className={`rounded-card border p-4 space-y-3 ${getSegmentColor(seg.segment)}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-body">{getSegmentTitle(seg.segment)}</span>
                <span className="font-mono text-caption px-2 py-0.5 rounded-pill border border-current">
                  {seg.customer_count} {t.customerCount}
                </span>
              </div>
              <div className="border-t border-current/20 pt-2 grid grid-cols-2 gap-2 text-small">
                <div>
                  <span className="text-caption opacity-80 block">{t.totalRevenue}</span>
                  <span className="font-semibold block">
                    {Number(seg.total_revenue).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                  </span>
                </div>
                <div>
                  <span className="text-caption opacity-80 block">{t.avgOrderValue}</span>
                  <span className="font-semibold block">
                    {Number(seg.avg_order_value).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

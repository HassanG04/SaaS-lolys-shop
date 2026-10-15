import type { ReactNode } from 'react'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useAnalyticsI18n } from './i18n'
import type { FulfilmentQualityItem } from './types'

interface FulfilmentQualitySectionProps {
  data: FulfilmentQualityItem
}

export function FulfilmentQualitySection({ data }: FulfilmentQualitySectionProps): ReactNode {
  const { lang } = useLanguage()
  const t = useAnalyticsI18n(lang)

  return (
    <section
      data-testid="analytics-fulfilment-quality"
      className="rounded-card border border-border bg-surface p-5 space-y-4"
    >
      <div>
        <h2 className="text-h3 font-bold text-text">{t.fulfilmentTitle}</h2>
        <p className="text-caption text-text-muted mt-0.5">{t.fulfilmentDesc}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-card border border-border bg-surface-2 p-3">
          <span className="text-caption text-text-muted block">{t.ordersCount}</span>
          <span className="text-h3 font-bold text-text mt-1 block">
            {Number(data.total_orders).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
          </span>
        </div>

        <div className="rounded-card border border-border bg-surface-2 p-3">
          <span className="text-caption text-text-muted block">{t.cancellationRate}</span>
          <span
            className={`text-h3 font-bold mt-1 block ${
              data.cancellation_rate_pct > 10 ? 'text-danger' : 'text-text'
            }`}
          >
            {data.cancellation_rate_pct}%
          </span>
        </div>

        <div className="rounded-card border border-border bg-surface-2 p-3">
          <span className="text-caption text-text-muted block">{t.refusalRate}</span>
          <span
            className={`text-h3 font-bold mt-1 block ${
              data.refusal_rate_pct > 5 ? 'text-danger' : 'text-text'
            }`}
          >
            {data.refusal_rate_pct}%
          </span>
        </div>

        <div className="rounded-card border border-border bg-surface-2 p-3">
          <span className="text-caption text-text-muted block">{t.expiryRate}</span>
          <span
            className={`text-h3 font-bold mt-1 block ${
              data.expiry_rate_pct > 10 ? 'text-warning' : 'text-text'
            }`}
          >
            {data.expiry_rate_pct}%
          </span>
        </div>

        <div className="rounded-card border border-border bg-surface-2 p-3">
          <span className="text-caption text-text-muted block">{t.medianDeliveryDays}</span>
          <span className="text-h3 font-bold text-brand mt-1 block">
            {data.median_delivery_days} {t.days}
          </span>
        </div>

        <div className="rounded-card border border-border bg-surface-2 p-3">
          <span className="text-caption text-text-muted block">{t.avgProofHours}</span>
          <span className="text-h3 font-bold text-brand mt-1 block">
            {data.avg_proof_hours} {t.hours}
          </span>
        </div>
      </div>
    </section>
  )
}

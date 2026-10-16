import type { ReactNode } from 'react'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useAnalyticsI18n } from './i18n'
import type { DiscountEffectItem } from './types'

interface DiscountEffectSectionProps {
  data: DiscountEffectItem
}

export function DiscountEffectSection({ data }: DiscountEffectSectionProps): ReactNode {
  const { lang } = useLanguage()
  const t = useAnalyticsI18n(lang)

  const isPositiveLift = data.uplift_pct > 0
  const displayNumber = (value: unknown) =>
    typeof value === 'number' && Number.isFinite(value)
      ? value.toLocaleString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', {
          maximumFractionDigits: 1,
        })
      : '—'

  return (
    <section
      data-testid="analytics-discount-effect"
      className="rounded-card border border-border bg-surface p-5 space-y-4"
    >
      <div>
        <h2 className="text-h3 font-bold text-text">{t.discountTitle}</h2>
        <p className="text-caption text-text-muted mt-0.5">{t.discountDesc}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-card border border-border bg-surface-2 p-4">
          <span className="text-caption text-text-muted block">{t.promoUnits}</span>
          <span className="text-h2 font-bold text-brand mt-1 block">
            {displayNumber(data.promo_weekly_units)}
          </span>
        </div>
        <div className="rounded-card border border-border bg-surface-2 p-4">
          <span className="text-caption text-text-muted block">{t.regularUnits}</span>
          <span className="text-h2 font-bold text-text mt-1 block">
            {displayNumber(data.baseline_weekly_units)}
          </span>
        </div>
        <div className="rounded-card border border-border bg-surface-2 p-4">
          <span className="text-caption text-text-muted block">{t.uplift}</span>
          <span
            className={`text-h3 font-bold mt-1 block break-words ${
              isPositiveLift ? 'text-success' : 'text-text-muted'
            }`}
          >
            {Number.isFinite(data.uplift_pct)
              ? `${isPositiveLift ? '+' : ''}${displayNumber(data.uplift_pct)}%`
              : '—'}
          </span>
        </div>
      </div>

      {/* Mandatory Disclaimer Alert */}
      <div
        role="alert"
        className="rounded-card border border-warning bg-surface-tint p-4 text-warning"
        data-testid="discount-disclaimer"
      >
        <div className="flex items-center gap-3">
          <svg
            className="size-5 shrink-0 text-warning"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-small font-semibold">
            {lang === 'ar'
              ? data.note_ar || t.discountDisclaimer
              : data.note_en || t.discountDisclaimer}
          </p>
        </div>
      </div>
    </section>
  )
}

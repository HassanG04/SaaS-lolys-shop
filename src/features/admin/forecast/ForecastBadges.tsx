import type { ReactNode } from 'react'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useForecastI18n } from './i18n'
import type { ForecastMetric, ForecastRun } from './types'

interface ForecastBadgesProps {
  status: 'ok' | 'no_data' | 'preliminary' | 'insufficient_data'
  run?: ForecastRun
  metrics?: ForecastMetric[]
  seriesKey?: string
}

export function ForecastBadges({
  status,
  run,
  metrics = [],
  seriesKey = 'shop',
}: ForecastBadgesProps): ReactNode {
  const { lang } = useLanguage()
  const t = useForecastI18n(lang)

  const selectedMetric = metrics.find((m) => m.is_selected) || metrics[0]
  const readiness = run?.notes?.readiness_summary?.[seriesKey] ?? status
  const isDriftAlert = Boolean(run?.notes?.drift_alert)
  const isPreliminary = readiness === 'preliminary' || status === 'preliminary'
  const isInsufficient =
    readiness === 'insufficient_data' || status === 'no_data' || status === 'insufficient_data'

  return (
    <div className="space-y-3" data-testid="forecast-badges">
      {/* Drift alert banner if active */}
      {isDriftAlert && (
        <div
          role="alert"
          className="rounded-card border border-warning bg-surface-tint p-4 text-warning"
          data-testid="forecast-drift-banner"
        >
          <div className="flex items-start gap-3">
            <svg
              className="size-5 shrink-0 text-warning mt-0.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div>
              <p className="font-bold text-small">{t.driftAlertTitle}</p>
              <p className="text-small opacity-90 mt-1">{t.driftAlertDesc}</p>
            </div>
          </div>
        </div>
      )}

      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status badges */}
        {isInsufficient ? (
          <span
            className="inline-flex items-center gap-1.5 rounded-pill bg-surface-tint px-3 py-1 text-caption font-semibold text-danger border border-danger"
            data-testid="badge-insufficient"
          >
            <span className="size-1.5 rounded-pill bg-danger" />
            {t.insufficientBadge} ({t.insufficientCode})
          </span>
        ) : isPreliminary ? (
          <span
            className="inline-flex items-center gap-1.5 rounded-pill bg-surface-tint px-3 py-1 text-caption font-semibold text-warning border border-warning"
            data-testid="badge-preliminary"
          >
            <span className="size-1.5 rounded-pill bg-warning" />
            {t.preliminaryBadge}
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1.5 rounded-pill bg-surface-tint px-3 py-1 text-caption font-semibold text-success border border-success"
            data-testid="badge-ready"
          >
            <span className="size-1.5 rounded-pill bg-success" />
            {lang === 'ar' ? 'بيانات مكتملة' : 'Ready'}
          </span>
        )}

        {/* Model badge and plain error explanation */}
        {selectedMetric && (
          <span
            className="inline-flex items-center gap-1.5 rounded-pill bg-surface-2 px-3 py-1 text-caption font-medium text-brand border border-border"
            data-testid="badge-model"
          >
            <svg
              className="size-3.5 text-brand"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            <span>
              {t.modelSelected}: <strong>{selectedMetric.model_name}</strong>
            </span>
            <span className="text-text-muted">•</span>
            <span>
              {t.modelError}: <strong>{(selectedMetric.wape * 100).toFixed(1)}%</strong>
            </span>
          </span>
        )}
      </div>
    </div>
  )
}

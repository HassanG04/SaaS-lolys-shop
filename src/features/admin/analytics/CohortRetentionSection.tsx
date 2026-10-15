import type { ReactNode } from 'react'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useAnalyticsI18n } from './i18n'
import type { CohortRetentionItem } from './types'

interface CohortRetentionSectionProps {
  data: CohortRetentionItem[]
}

export function CohortRetentionSection({ data }: CohortRetentionSectionProps): ReactNode {
  const { lang } = useLanguage()
  const t = useAnalyticsI18n(lang)

  // Group items by cohort_month
  const cohortsByMonth: Record<string, { size: number; periods: Record<number, number> }> = {}
  let maxPeriod = 0

  for (const item of data) {
    const monthKey = item.cohort_month.substring(0, 7) // YYYY-MM
    if (!cohortsByMonth[monthKey]) {
      cohortsByMonth[monthKey] = { size: item.cohort_size, periods: {} }
    }
    cohortsByMonth[monthKey].periods[item.period_months] = item.retention_rate
    if (item.period_months > maxPeriod) {
      maxPeriod = item.period_months
    }
  }

  const sortedMonths = Object.keys(cohortsByMonth).sort().reverse()
  const periodCols = Array.from({ length: Math.min(maxPeriod + 1, 6) }, (_, i) => i)

  return (
    <section
      data-testid="analytics-cohort-retention"
      className="rounded-card border border-border bg-surface p-5 space-y-4"
    >
      <div>
        <h2 className="text-h3 font-bold text-text">{t.cohortTitle}</h2>
        <p className="text-caption text-text-muted mt-0.5">{t.cohortDesc}</p>
      </div>

      <div className="overflow-x-auto rounded-card border border-border">
        <table className="w-full text-start text-small">
          <thead className="bg-surface-2 text-text-muted border-b border-border">
            <tr>
              <th className="py-2.5 px-3 text-start font-semibold">{t.cohortMonth}</th>
              <th className="py-2.5 px-3 text-start font-semibold">{t.cohortSize}</th>
              {periodCols.map((p) => (
                <th key={p} className="py-2.5 px-3 text-center font-semibold">
                  {p === 0 ? 'M+0' : `M+${p}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedMonths.length === 0 ? (
              <tr>
                <td colSpan={2 + periodCols.length} className="py-6 text-center text-text-muted">
                  {t.empty}
                </td>
              </tr>
            ) : (
              sortedMonths.map((m) => {
                const row = cohortsByMonth[m]
                return (
                  <tr key={m} className="hover:bg-surface-2 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium text-text">{m}</td>
                    <td className="py-2.5 px-3 text-text font-semibold">{row.size}</td>
                    {periodCols.map((p) => {
                      const rate = row.periods[p]
                      if (rate === undefined) {
                        return (
                          <td key={p} className="py-2.5 px-3 text-center text-text-muted">
                            —
                          </td>
                        )
                      }
                      const pct = Math.round(rate * 100)
                      return (
                        <td key={p} className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-block min-w-12 py-0.5 px-1.5 rounded-pill text-caption font-bold ${
                              pct >= 50
                                ? 'bg-surface-tint text-success border border-success'
                                : pct >= 20
                                  ? 'bg-surface-2 text-brand border border-brand'
                                  : 'bg-surface-2 text-text-muted border border-border'
                            }`}
                          >
                            {pct}%
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

import type { ReactNode } from 'react'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useAnalyticsI18n } from './i18n'
import type { SalesOverviewItem } from './types'

interface SalesOverviewSectionProps {
  data: SalesOverviewItem[]
}

export function SalesOverviewSection({ data }: SalesOverviewSectionProps): ReactNode {
  const { lang } = useLanguage()
  const t = useAnalyticsI18n(lang)

  const latest = data.length > 0 ? data[data.length - 1] : null

  return (
    <section
      data-testid="analytics-sales-overview"
      className="rounded-card border border-border bg-surface p-5 space-y-4"
    >
      <div>
        <h2 className="text-h3 font-bold text-text">{t.salesOverviewTitle}</h2>
        <p className="text-caption text-text-muted mt-0.5">{t.salesOverviewDesc}</p>
      </div>

      {latest && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-card border border-border bg-surface-2 p-3">
            <span className="text-caption text-text-muted block">{t.salesUnitsMa7}</span>
            <span className="text-h3 font-bold text-brand mt-1 block">
              {Number(latest.units_ma7).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
            </span>
          </div>
          <div className="rounded-card border border-border bg-surface-2 p-3">
            <span className="text-caption text-text-muted block">{t.salesRevenueMa7}</span>
            <span className="text-h3 font-bold text-brand mt-1 block">
              {Number(latest.revenue_ma7).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
            </span>
          </div>
          <div className="rounded-card border border-border bg-surface-2 p-3">
            <span className="text-caption text-text-muted block">{t.salesUnitsMa28}</span>
            <span className="text-h3 font-bold text-text mt-1 block">
              {Number(latest.units_ma28).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
            </span>
          </div>
          <div className="rounded-card border border-border bg-surface-2 p-3">
            <span className="text-caption text-text-muted block">{t.salesRevenueMa28}</span>
            <span className="text-h3 font-bold text-text mt-1 block">
              {Number(latest.revenue_ma28).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
            </span>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-card border border-border">
        <table className="w-full text-start text-small">
          <thead className="bg-surface-2 text-text-muted border-b border-border">
            <tr>
              <th className="py-2.5 px-3 text-start font-semibold">التاريخ</th>
              <th className="py-2.5 px-3 text-start font-semibold">{t.salesUnits}</th>
              <th className="py-2.5 px-3 text-start font-semibold">{t.salesRevenue}</th>
              <th className="py-2.5 px-3 text-start font-semibold">{t.salesUnitsMa7}</th>
              <th className="py-2.5 px-3 text-start font-semibold">{t.salesRevenueMa7}</th>
              <th className="py-2.5 px-3 text-start font-semibold">{t.salesUnitsMa28}</th>
              <th className="py-2.5 px-3 text-start font-semibold">{t.salesRevenueMa28}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-text-muted">
                  {t.empty}
                </td>
              </tr>
            ) : (
              data
                .slice(-14)
                .reverse()
                .map((row) => (
                  <tr key={row.day} className="hover:bg-surface-2 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-text">{row.day}</td>
                    <td className="py-2.5 px-3 text-text font-medium">{row.units}</td>
                    <td className="py-2.5 px-3 text-text">
                      {Number(row.revenue).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                    </td>
                    <td className="py-2.5 px-3 text-brand font-medium">{row.units_ma7}</td>
                    <td className="py-2.5 px-3 text-brand">
                      {Number(row.revenue_ma7).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                    </td>
                    <td className="py-2.5 px-3 text-text-muted">{row.units_ma28}</td>
                    <td className="py-2.5 px-3 text-text-muted">
                      {Number(row.revenue_ma28).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

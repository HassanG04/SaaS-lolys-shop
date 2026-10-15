import type { ReactNode } from 'react'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useAnalyticsI18n } from './i18n'
import type { GeographyItem } from './types'

interface GeographySectionProps {
  data: GeographyItem[]
}

export function GeographySection({ data }: GeographySectionProps): ReactNode {
  const { lang } = useLanguage()
  const t = useAnalyticsI18n(lang)

  return (
    <section
      data-testid="analytics-geography"
      className="rounded-card border border-border bg-surface p-5 space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-h3 font-bold text-text">{t.geographyTitle}</h2>
          <p className="text-caption text-text-muted mt-0.5">{t.geographyDesc}</p>
        </div>
        <span className="self-start sm:self-auto text-caption font-semibold px-2.5 py-1 rounded-pill border border-brand text-brand bg-surface-tint">
          {t.privacyBadge}
        </span>
      </div>

      <div className="overflow-x-auto rounded-card border border-border">
        <table className="w-full text-start text-small">
          <thead className="bg-surface-2 text-text-muted border-b border-border">
            <tr>
              <th className="py-2.5 px-3 text-start font-semibold">{t.governorate}</th>
              <th className="py-2.5 px-3 text-start font-semibold">{t.customerCount}</th>
              <th className="py-2.5 px-3 text-start font-semibold">{t.ordersCount}</th>
              <th className="py-2.5 px-3 text-start font-semibold">{t.totalRevenue}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-text-muted">
                  {t.empty}
                </td>
              </tr>
            ) : (
              data.map((item) => {
                const isOther = item.governorate === 'أخرى' || item.governorate === 'Other'
                return (
                  <tr key={item.governorate} className="hover:bg-surface-2 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-text">
                      {item.governorate}
                      {isOther && (
                        <span className="ms-2 text-caption px-2 py-0.5 rounded-pill border border-border bg-surface-2 text-text-muted">
                          {t.privacyBadge}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-text font-mono">
                      {Number(item.customer_count).toLocaleString(
                        lang === 'ar' ? 'ar-EG' : 'en-US',
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-text font-mono">
                      {Number(item.orders_count).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                    </td>
                    <td className="py-2.5 px-3 text-text font-semibold">
                      {Number(item.total_revenue).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="text-caption text-text-muted">{t.privacyNote}</p>
    </section>
  )
}

import type { ReactNode } from 'react'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useAnalyticsI18n } from './i18n'
import type { ProductPerformanceItem } from './types'

interface ProductPerformanceSectionProps {
  data: ProductPerformanceItem[]
}

export function ProductPerformanceSection({ data }: ProductPerformanceSectionProps): ReactNode {
  const { lang } = useLanguage()
  const t = useAnalyticsI18n(lang)

  const getAbcBadge = (abc: 'A' | 'B' | 'C') => {
    switch (abc) {
      case 'A':
        return 'border-success text-success bg-surface-tint'
      case 'B':
        return 'border-brand text-brand bg-surface-tint'
      case 'C':
        return 'border-border text-text-muted bg-surface-2'
    }
  }

  const getXyzBadge = (xyz: 'X' | 'Y' | 'Z') => {
    switch (xyz) {
      case 'X':
        return 'border-success text-success bg-surface-tint'
      case 'Y':
        return 'border-warning text-warning bg-surface-tint'
      case 'Z':
        return 'border-border text-text-muted bg-surface-2'
    }
  }

  return (
    <section
      data-testid="analytics-product-performance"
      className="rounded-card border border-border bg-surface p-5 space-y-4"
    >
      <div>
        <h2 className="text-h3 font-bold text-text">{t.productPerfTitle}</h2>
        <p className="text-caption text-text-muted mt-0.5">{t.productPerfDesc}</p>
      </div>

      <div className="overflow-x-auto rounded-card border border-border">
        <table className="w-full text-start text-small">
          <thead className="bg-surface-2 text-text-muted border-b border-border">
            <tr>
              <th className="py-2.5 px-3 text-start font-semibold">#</th>
              <th className="py-2.5 px-3 text-start font-semibold">{t.productName}</th>
              <th className="py-2.5 px-3 text-start font-semibold">{t.totalUnits}</th>
              <th className="py-2.5 px-3 text-start font-semibold">{t.totalRevenue}</th>
              <th className="py-2.5 px-3 text-start font-semibold">{t.revenueShare}</th>
              <th className="py-2.5 px-3 text-start font-semibold">{t.abcClass}</th>
              <th className="py-2.5 px-3 text-start font-semibold">{t.xyzClass}</th>
              <th className="py-2.5 px-3 text-start font-semibold">{t.cvDemand}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-6 text-center text-text-muted">
                  {t.empty}
                </td>
              </tr>
            ) : (
              data.map((item) => {
                const displayName = lang === 'ar' ? item.name_ar || item.name : item.name
                return (
                  <tr key={item.product_id} className="hover:bg-surface-2 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-text-muted">{item.product_id}</td>
                    <td className="py-2.5 px-3 font-medium text-text">{displayName}</td>
                    <td className="py-2.5 px-3 text-text">{item.total_units}</td>
                    <td className="py-2.5 px-3 text-text font-semibold">
                      {Number(item.total_revenue).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                    </td>
                    <td className="py-2.5 px-3 text-text">{item.revenue_share_pct}%</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-pill border text-caption font-bold ${getAbcBadge(
                          item.abc_class,
                        )}`}
                      >
                        {item.abc_class}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-pill border text-caption font-bold ${getXyzBadge(
                          item.xyz_class,
                        )}`}
                      >
                        {item.xyz_class}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-text-muted">
                      {item.cv_demand !== null ? item.cv_demand : '—'}
                    </td>
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

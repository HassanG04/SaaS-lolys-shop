import type { ReactNode } from 'react'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useAnalyticsI18n } from './i18n'
import type { BasketPairItem } from './types'

interface BasketAnalysisSectionProps {
  data: BasketPairItem[]
}

export function BasketAnalysisSection({ data }: BasketAnalysisSectionProps): ReactNode {
  const { lang } = useLanguage()
  const t = useAnalyticsI18n(lang)

  return (
    <section
      data-testid="analytics-basket-analysis"
      className="rounded-card border border-border bg-surface p-5 space-y-4"
    >
      <div>
        <h2 className="text-h3 font-bold text-text">{t.basketTitle}</h2>
        <p className="text-caption text-text-muted mt-0.5">{t.basketDesc}</p>
      </div>

      <div className="overflow-x-auto rounded-card border border-border">
        <table className="w-full text-start text-small">
          <thead className="bg-surface-2 text-text-muted border-b border-border">
            <tr>
              <th className="py-2.5 px-3 text-start font-semibold">{t.productA}</th>
              <th className="py-2.5 px-3 text-start font-semibold">{t.productB}</th>
              <th className="py-2.5 px-3 text-start font-semibold">{t.sampleOrders}</th>
              <th className="py-2.5 px-3 text-start font-semibold">{t.support}</th>
              <th className="py-2.5 px-3 text-start font-semibold">{t.confidence}</th>
              <th className="py-2.5 px-3 text-start font-semibold">{t.lift}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-text-muted">
                  {t.empty}
                </td>
              </tr>
            ) : (
              data.map((pair) => {
                const nameA =
                  lang === 'ar'
                    ? pair.product_a_name_ar || pair.product_a_name
                    : pair.product_a_name
                const nameB =
                  lang === 'ar'
                    ? pair.product_b_name_ar || pair.product_b_name
                    : pair.product_b_name
                const isHighLift = pair.lift > 1.2

                return (
                  <tr
                    key={`${pair.product_a_id}-${pair.product_b_id}`}
                    className="hover:bg-surface-2 transition-colors"
                  >
                    <td className="py-2.5 px-3 font-medium text-text">{nameA}</td>
                    <td className="py-2.5 px-3 font-medium text-text">{nameB}</td>
                    <td className="py-2.5 px-3 text-text font-mono">{pair.sample_orders}</td>
                    <td className="py-2.5 px-3 text-text font-mono">
                      {(pair.support * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-text font-mono">
                      {(pair.confidence * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-pill text-caption font-bold border ${
                          isHighLift
                            ? 'bg-surface-tint text-success border-success'
                            : 'bg-surface-2 text-text-muted border-border'
                        }`}
                      >
                        {pair.lift.toFixed(2)}x
                      </span>
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

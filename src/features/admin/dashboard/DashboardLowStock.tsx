import { Link } from 'react-router-dom'
import { useLanguage } from '../../../i18n/LanguageProvider'
import { formatNumber } from '../../../lib/format'
import type { DashboardLowStock as DashboardLowStockType } from './types'

interface DashboardLowStockProps {
  lowStock: DashboardLowStockType[]
}

export function DashboardLowStock({ lowStock }: DashboardLowStockProps) {
  const { t, lang } = useLanguage()

  return (
    <div className="ui-print-card rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-5 sm:p-6 shadow-(--shadow-card) print:border print:shadow-none">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-h3 font-bold font-accent text-(--color-brand)">
            {t.admin.lowStockTitle}
          </h3>
          <p className="text-small text-(--color-text-muted)">{t.admin.lowStockDesc}</p>
        </div>
        {lowStock.length > 0 && (
          <span
            role="status"
            className="self-start sm:self-auto rounded-(--radius-pill) bg-(--color-danger)/10 px-3 py-1 text-caption font-bold text-(--color-danger)"
          >
            {formatNumber(lowStock.length, undefined, lang)} تنبيه
          </span>
        )}
      </div>

      {lowStock.length === 0 ? (
        <div className="rounded-(--radius-chip) border border-(--color-border) bg-(--color-surface-2) p-4 text-center text-small font-medium text-(--color-success)">
          {t.admin.allStockSufficient}
        </div>
      ) : (
        <div className="divide-y divide-(--color-border)/50">
          {lowStock.map((item) => {
            const isOutOfStock = item.stock <= 0
            return (
              <div
                key={item.product_id}
                className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-(--radius-pill) text-caption font-bold ${
                      isOutOfStock
                        ? 'bg-(--color-danger) text-(--color-brand-contrast)'
                        : 'bg-(--color-warning) text-(--color-text)'
                    }`}
                  >
                    !
                  </span>
                  <div>
                    <h4 className="text-small font-bold text-(--color-text)">{item.name}</h4>
                    <p className="text-caption text-(--color-text-muted)">
                      {t.admin.remainingStock}:{' '}
                      <span
                        className={`font-semibold ${
                          isOutOfStock ? 'text-(--color-danger)' : 'text-(--color-warning)'
                        }`}
                      >
                        {formatNumber(item.stock, undefined, lang)}
                      </span>
                    </p>
                  </div>
                </div>

                <Link
                  to={`/admin/products?edit=${item.product_id}`}
                  className="inline-flex h-9 items-center justify-center rounded-(--radius-pill) border border-(--color-border-input) bg-(--color-surface-2) px-3 text-caption font-semibold text-(--color-text) hover:border-(--color-brand) hover:text-(--color-brand) focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
                >
                  {t.admin.editProduct}
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

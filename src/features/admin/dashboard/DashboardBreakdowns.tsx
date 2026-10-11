import { useLanguage } from '../../../i18n/LanguageProvider'
import { formatEGP, formatNumber } from '../../../lib/format'
import type { DashboardByGovernorateItem, DashboardByMethodItem } from './types'

interface DashboardBreakdownsProps {
  byStatus: Record<string, number>
  byMethod: DashboardByMethodItem[]
  byGovernorate: DashboardByGovernorateItem[]
}

export function DashboardBreakdowns({
  byStatus,
  byMethod,
  byGovernorate,
}: DashboardBreakdownsProps) {
  const { t, lang } = useLanguage()

  // Status mapping
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return t.order.pending
      case 'confirmed':
        return t.order.confirmed
      case 'shipped':
        return t.order.shipped
      case 'delivered':
        return t.order.delivered
      case 'cancelled':
        return t.order.cancelled
      default:
        return status
    }
  }

  const getMethodLabel = (method: string) => {
    if (method === 'representative') return t.admin.representative
    if (method === 'egypt_post' || method === 'post') return t.admin.egyptPost
    return method
  }

  const statusEntries = Object.entries(byStatus).filter(([, count]) => count >= 0)
  const totalStatusOrders = statusEntries.reduce((acc, [, count]) => acc + count, 0)

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* 1. Status Breakdown */}
      <div className="flex flex-col justify-between rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-5 sm:p-6 shadow-(--shadow-card)">
        <div>
          <h3 className="text-h3 font-bold font-accent text-(--color-brand) mb-4">
            {t.admin.breakdownStatus}
          </h3>
          {statusEntries.length === 0 || totalStatusOrders === 0 ? (
            <p className="text-small text-(--color-text-muted)">{t.admin.noStatusData}</p>
          ) : (
            <div className="space-y-3">
              {statusEntries.map(([status, count]) => {
                const percentage =
                  totalStatusOrders > 0 ? Math.round((count / totalStatusOrders) * 100) : 0
                return (
                  <div key={status} className="space-y-1">
                    <div className="flex items-center justify-between text-small">
                      <span className="font-medium text-(--color-text)">
                        {getStatusLabel(status)}
                      </span>
                      <span className="font-semibold text-(--color-text-muted)">
                        {formatNumber(count, undefined, lang)} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-(--radius-pill) bg-(--color-surface-2) overflow-hidden">
                      <div
                        className="h-full rounded-(--radius-pill) bg-(--color-brand) transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* 2. Delivery Method Breakdown */}
      <div className="flex flex-col justify-between rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-5 sm:p-6 shadow-(--shadow-card)">
        <div>
          <h3 className="text-h3 font-bold font-accent text-(--color-brand) mb-4">
            {t.admin.breakdownMethod}
          </h3>
          {byMethod.length === 0 ? (
            <p className="text-small text-(--color-text-muted)">{t.admin.noMethodData}</p>
          ) : (
            <div className="space-y-4">
              {byMethod.map((item) => (
                <div
                  key={item.method}
                  className="rounded-(--radius-chip) border border-(--color-border) bg-(--color-surface-2) p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-small font-bold text-(--color-text)">
                      {getMethodLabel(item.method)}
                    </span>
                    <span className="rounded-(--radius-pill) bg-(--color-surface-tint) px-2 py-0.5 text-caption font-semibold text-(--color-brand)">
                      {formatNumber(item.orders, undefined, lang)} {t.admin.chartOrders}
                    </span>
                  </div>
                  <div className="mt-2 text-small font-bold text-(--color-brand)">
                    {formatEGP(item.total, lang)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. Governorate Breakdown */}
      <div className="flex flex-col justify-between rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-5 sm:p-6 shadow-(--shadow-card)">
        <div>
          <h3 className="text-h3 font-bold font-accent text-(--color-brand) mb-4">
            {t.admin.breakdownGovernorate}
          </h3>
          {byGovernorate.length === 0 ? (
            <p className="text-small text-(--color-text-muted)">{t.admin.noGovernorateData}</p>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto pe-1">
              {byGovernorate.map((item) => (
                <div
                  key={item.governorate}
                  className="flex items-center justify-between border-b border-(--color-border)/50 pb-2 text-small"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-(--color-text)">{item.governorate}</span>
                    <span className="text-caption text-(--color-text-muted)">
                      {formatNumber(item.orders, undefined, lang)} {t.admin.chartOrders}
                    </span>
                  </div>
                  <span className="font-bold text-(--color-brand)">
                    {formatEGP(item.total, lang)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

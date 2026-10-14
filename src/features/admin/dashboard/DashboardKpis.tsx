import { useLanguage } from '../../../i18n/LanguageProvider'
import { formatEGP, formatNumber } from '../../../lib/format'
import type { DashboardKpis as DashboardKpisType } from './types'

interface DashboardKpisProps {
  kpis: DashboardKpisType
}

export function DashboardKpis({ kpis }: DashboardKpisProps) {
  const { t, lang } = useLanguage()

  const cards = [
    {
      id: 'orders',
      title: t.admin.kpiOrders,
      value: formatNumber(kpis.orders, undefined, lang),
      icon: (
        <svg
          className="size-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
          <path d="M3 6h18" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      ),
      highlight: false,
    },
    {
      id: 'pending',
      title: t.admin.kpiPending,
      value: formatNumber(kpis.pending, undefined, lang),
      icon: (
        <svg
          className="size-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      highlight: kpis.pending > 0,
      badgeText: kpis.pending > 0 ? `${kpis.pending} طلب` : undefined,
    },
    {
      id: 'booked_total',
      title: t.admin.kpiBookedTotal,
      value: formatEGP(kpis.booked_total, lang),
      icon: (
        <svg
          className="size-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="12" x2="12" y1="2" y2="22" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
      highlight: false,
    },
    {
      id: 'delivered_total',
      title: t.admin.kpiDeliveredTotal,
      value: formatEGP(kpis.delivered_total, lang),
      icon: (
        <svg
          className="size-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
      highlight: false,
    },
    {
      id: 'avg_order',
      title: t.admin.kpiAvgOrder,
      value: formatEGP(kpis.avg_order, lang),
      icon: (
        <svg
          className="size-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
          <path d="M22 12A10 10 0 0 0 12 2v10z" />
        </svg>
      ),
      highlight: false,
    },
    {
      id: 'awaiting_review',
      title: t.admin.kpiAwaitingReview,
      value: formatNumber(kpis.awaiting_review, undefined, lang),
      icon: (
        <svg
          className="size-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
          <line x1="12" x2="12" y1="8" y2="12" />
          <line x1="12" x2="12.01" y1="16" y2="16" />
        </svg>
      ),
      highlight: kpis.awaiting_review > 0,
      badgeText: kpis.awaiting_review > 0 ? `${kpis.awaiting_review}` : undefined,
    },
    {
      id: 'paid_total',
      title: t.admin.kpiPaidTotal,
      value: formatEGP(kpis.paid_total, lang),
      icon: (
        <svg
          className="size-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect width="20" height="14" x="2" y="5" rx="2" />
          <line x1="2" x2="22" y1="10" y2="10" />
        </svg>
      ),
      highlight: false,
    },
  ]

  return (
    <section
      aria-label={t.admin.kpisSection}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {cards.map((card) => (
        <div
          key={card.id}
          className={`ui-print-card flex flex-col justify-between rounded-(--radius-card) border bg-(--color-surface) p-5 shadow-(--shadow-card) transition-all print:border print:shadow-none ${
            card.highlight
              ? 'border-(--color-brand) bg-(--color-surface-tint)'
              : 'border-(--color-border)'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-small font-medium text-(--color-text-muted)">{card.title}</span>
            <div
              className={`flex size-9 items-center justify-center rounded-(--radius-pill) ${
                card.highlight
                  ? 'bg-(--color-brand) text-(--color-brand-contrast)'
                  : 'bg-(--color-surface-2) text-(--color-brand)'
              }`}
            >
              {card.icon}
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between gap-2">
            <span className="text-h2 font-bold font-accent text-(--color-text) tracking-tight">
              {card.value}
            </span>
            {card.badgeText && (
              <span className="rounded-(--radius-pill) bg-(--color-brand) px-2.5 py-0.5 text-caption font-semibold text-(--color-brand-contrast)">
                {card.badgeText}
              </span>
            )}
          </div>
        </div>
      ))}
    </section>
  )
}

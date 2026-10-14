import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { useLanguage } from '../../../i18n/LanguageProvider'
import { formatEGP, formatNumber } from '../../../lib/format'
import { downloadDailySeriesCsv } from './exportCsv'
import type { DashboardDailyItem } from './types'

interface DashboardChartProps {
  daily: DashboardDailyItem[]
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    color: string
    dataKey: string
  }>
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  const { lang, t } = useLanguage()

  if (!active || !payload || !payload.length) {
    return null
  }

  return (
    <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-3 shadow-(--shadow-popover) text-small">
      <p className="font-semibold text-(--color-text) mb-1.5">{label}</p>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-(--color-text-muted)">
              <span
                className="size-2.5 rounded-(--radius-pill)"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name === 'booked_total' ? t.admin.bookedRevenue : t.admin.deliveredRevenue}
            </span>
            <span className="font-bold text-(--color-text)">{formatEGP(entry.value, lang)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DashboardChart({ daily }: DashboardChartProps) {
  const { t, lang } = useLanguage()

  if (!daily || daily.length === 0) {
    return (
      <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-6 text-center text-(--color-text-muted) print:shadow-none ui-print-card">
        <h3 className="text-h3 font-bold text-(--color-brand) mb-2">{t.admin.dailyChartTitle}</h3>
        <p className="text-small">{t.admin.noStatusData}</p>
      </div>
    )
  }

  const totalDays = daily.length
  const totalOrders = daily.reduce((sum, d) => sum + d.orders, 0)
  const totalBooked = daily.reduce((sum, d) => sum + d.booked_total, 0)
  const totalDelivered = daily.reduce((sum, d) => sum + d.delivered_total, 0)

  const summaryText =
    lang === 'ar'
      ? `إجمالي ${formatNumber(totalDays, undefined, lang)} يوماً: ${formatNumber(totalOrders, undefined, lang)} طلبات، إجمالي محجوز ${formatEGP(totalBooked, lang)}، وإجمالي مسلّم ${formatEGP(totalDelivered, lang)}.`
      : `Total ${formatNumber(totalDays, undefined, lang)} days: ${formatNumber(totalOrders, undefined, lang)} orders, booked ${formatEGP(totalBooked, lang)}, and delivered ${formatEGP(totalDelivered, lang)}.`

  return (
    <div
      role="region"
      aria-label={t.admin.dailyChartTitle}
      className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-5 sm:p-6 shadow-(--shadow-card) print:shadow-none print:border-none print:p-0 ui-print-card"
    >
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-h3 font-bold font-accent text-(--color-brand)">
            {t.admin.dailyChartTitle}
          </h2>
          <p className="text-small text-(--color-text-muted)">{t.admin.dailyChartDesc}</p>
        </div>

        {/* CSV Export Button */}
        <div className="flex items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={() => downloadDailySeriesCsv(daily, { lang })}
            className="inline-flex items-center gap-1.5 rounded-(--radius-pill) border border-(--color-border) bg-(--color-surface-2) px-3 py-1.5 text-small font-semibold text-(--color-brand) hover:bg-(--color-surface-tint) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus)"
            aria-label={t.admin.exportCsv}
            title={t.admin.exportCsvDesc}
          >
            <svg
              className="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" x2="12" y1="15" y2="3" />
            </svg>
            <span>{t.admin.exportCsv}</span>
          </button>
        </div>
      </div>

      {/* Chart container */}
      <div
        className="h-80 w-full text-(--color-text-muted)"
        dir="ltr"
        role="img"
        aria-label={t.admin.dailyChartTitle}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={daily} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="day"
              stroke="currentColor"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="currentColor"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${v}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value: string) =>
                value === 'booked_total' ? t.admin.bookedRevenue : t.admin.deliveredRevenue
              }
              wrapperStyle={{ paddingTop: '16px' }}
            />
            <Area
              type="monotone"
              dataKey="booked_total"
              stroke="var(--color-brand)"
              strokeWidth={2}
              fillOpacity={0.15}
              fill="var(--color-brand)"
              name="booked_total"
            />
            <Area
              type="monotone"
              dataKey="delivered_total"
              stroke="var(--color-caramel)"
              strokeWidth={2}
              fillOpacity={0.15}
              fill="var(--color-caramel)"
              name="delivered_total"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Text summary fallback for accessibility and screen readers */}
      <div
        className="mt-4 rounded-(--radius-chip) border border-(--color-border) bg-(--color-surface-2) p-3 text-small text-(--color-text)"
        role="region"
        aria-label={t.admin.chartSummaryTitle}
      >
        <p className="font-semibold text-(--color-brand) mb-1">{t.admin.chartSummaryTitle}</p>
        <p className="text-small text-(--color-text-muted)">{summaryText}</p>
      </div>

      {/* Accessible data table for screen readers, fallback and print reports */}
      <details className="mt-4 rounded-(--radius-chip) border border-(--color-border) bg-(--color-surface-2) p-3 text-caption print:open print:block ui-print-details">
        <summary className="cursor-pointer font-semibold text-(--color-brand) hover:underline focus:outline-none print:hidden">
          {t.admin.chartDataTable} ({t.admin.dailyChartTitle})
        </summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-start text-caption" aria-label={t.admin.chartDataTable}>
            <caption className="sr-only">{t.admin.chartDataTable}</caption>
            <thead>
              <tr className="border-b border-(--color-border) text-(--color-text-muted)">
                <th scope="col" className="p-2 text-start font-semibold">
                  {t.admin.chartDay}
                </th>
                <th scope="col" className="p-2 text-start font-semibold">
                  {t.admin.chartOrders}
                </th>
                <th scope="col" className="p-2 text-start font-semibold">
                  {t.admin.bookedRevenue}
                </th>
                <th scope="col" className="p-2 text-start font-semibold">
                  {t.admin.deliveredRevenue}
                </th>
              </tr>
            </thead>
            <tbody>
              {daily.map((item) => (
                <tr
                  key={item.day}
                  className="border-b border-(--color-border)/50 text-(--color-text)"
                >
                  <td className="p-2 font-mono">{item.day}</td>
                  <td className="p-2">{formatNumber(item.orders, undefined, lang)}</td>
                  <td className="p-2">{formatEGP(item.booked_total, lang)}</td>
                  <td className="p-2">{formatEGP(item.delivered_total, lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}

export default DashboardChart

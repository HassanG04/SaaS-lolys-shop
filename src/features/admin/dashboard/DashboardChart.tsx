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
import { formatEGP } from '../../../lib/format'
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

export default function DashboardChart({ daily }: DashboardChartProps) {
  const { t, lang } = useLanguage()

  if (!daily || daily.length === 0) {
    return (
      <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-6 text-center text-(--color-text-muted)">
        <h3 className="text-h3 font-bold text-(--color-brand) mb-2">{t.admin.dailyChartTitle}</h3>
        <p className="text-small">{t.admin.noStatusData}</p>
      </div>
    )
  }

  return (
    <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-5 sm:p-6 shadow-(--shadow-card)">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-h3 font-bold font-accent text-(--color-brand)">
            {t.admin.dailyChartTitle}
          </h2>
          <p className="text-small text-(--color-text-muted)">{t.admin.dailyChartDesc}</p>
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

      {/* Accessible data table for screen readers and summaries */}
      <details className="mt-4 rounded-(--radius-chip) border border-(--color-border) bg-(--color-surface-2) p-3 text-caption">
        <summary className="cursor-pointer font-semibold text-(--color-brand) hover:underline focus:outline-none">
          {t.admin.dailyChartTitle} (جدول البيانات)
        </summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-start text-caption">
            <thead>
              <tr className="border-b border-(--color-border) text-(--color-text-muted)">
                <th className="p-2 text-start">{t.admin.chartDay}</th>
                <th className="p-2 text-start">{t.admin.chartOrders}</th>
                <th className="p-2 text-start">{t.admin.bookedRevenue}</th>
                <th className="p-2 text-start">{t.admin.deliveredRevenue}</th>
              </tr>
            </thead>
            <tbody>
              {daily.map((item) => (
                <tr
                  key={item.day}
                  className="border-b border-(--color-border)/50 text-(--color-text)"
                >
                  <td className="p-2 font-mono">{item.day}</td>
                  <td className="p-2">{item.orders}</td>
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

import { useState, useMemo } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { useLanguage } from '@/i18n/LanguageProvider'
import { formatEGP, formatNumber } from '@/lib/format'
import { useForecastI18n } from './i18n'
import type { ForecastPoint, HistoryPoint } from './types'

interface ForecastChartProps {
  forecasts: ForecastPoint[]
  history: HistoryPoint[]
  modelName?: string
}

interface ChartItem {
  date: string
  label: string
  history?: number
  forecast?: number
  lower_80?: number
  upper_80?: number
  interval?: [number, number]
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number | [number, number]
    color: string
    dataKey: string
  }>
  label?: string
  mode: 'units' | 'revenue'
}

function CustomTooltip({ active, payload, label, mode }: CustomTooltipProps) {
  const { lang } = useLanguage()
  const t = useForecastI18n(lang)

  if (!active || !payload || !payload.length) {
    return null
  }

  const formatVal = (v: number) =>
    mode === 'revenue' ? formatEGP(v, lang) : `${formatNumber(v, undefined, lang)} ${t.viewUnits}`

  return (
    <div className="rounded-card border border-border bg-surface p-3 shadow-popover text-small">
      <p className="font-semibold text-text mb-1.5">{label}</p>
      <div className="space-y-1">
        {payload.map((entry) => {
          if (Array.isArray(entry.value)) {
            const [low, high] = entry.value
            return (
              <div key={entry.dataKey} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-text-muted">
                  <span
                    className="size-2.5 rounded-pill"
                    style={{ backgroundColor: entry.color }}
                  />
                  {t.chartConfidenceBand}
                </span>
                <span className="font-semibold text-text">
                  [{formatVal(low)} – {formatVal(high)}]
                </span>
              </div>
            )
          }

          if (typeof entry.value === 'number') {
            return (
              <div key={entry.dataKey} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-text-muted">
                  <span
                    className="size-2.5 rounded-pill"
                    style={{ backgroundColor: entry.color }}
                  />
                  {entry.dataKey === 'history' ? t.chartHistory : t.chartForecast}
                </span>
                <span className="font-bold text-text">{formatVal(entry.value)}</span>
              </div>
            )
          }

          return null
        })}
      </div>
    </div>
  )
}

export function ForecastChart({ forecasts, history }: ForecastChartProps) {
  const { lang } = useLanguage()
  const t = useForecastI18n(lang)
  const [mode, setMode] = useState<'units' | 'revenue'>('units')
  const [showTable, setShowTable] = useState(false)

  const chartData = useMemo<ChartItem[]>(() => {
    const items: ChartItem[] = []

    // 1. History points
    history.forEach((h) => {
      const val = mode === 'revenue' ? Number(h.revenue) : Number(h.units)
      items.push({
        date: h.day,
        label: h.day,
        history: val,
      })
    })

    // Bridge point: Connect last history point to first forecast point if history exists
    if (history.length > 0 && forecasts.length > 0) {
      const lastHist = history[history.length - 1]
      const lastVal = mode === 'revenue' ? Number(lastHist.revenue) : Number(lastHist.units)
      const existing = items.find((i) => i.date === lastHist.day)
      if (existing) {
        existing.forecast = lastVal
      }
    }

    // 2. Forecast points
    forecasts.forEach((f) => {
      const pred = mode === 'revenue' ? Number(f.predicted_revenue) : Number(f.predicted_units)
      const ratio =
        mode === 'revenue' && Number(f.predicted_units) > 0
          ? Number(f.predicted_revenue) / Number(f.predicted_units)
          : 1
      const low = Math.max(0, mode === 'revenue' ? Number(f.lower_80) * ratio : Number(f.lower_80))
      const high = Math.max(
        low,
        mode === 'revenue' ? Number(f.upper_80) * ratio : Number(f.upper_80),
      )

      items.push({
        date: f.forecast_date,
        label: f.forecast_date,
        forecast: pred,
        lower_80: low,
        upper_80: high,
        interval: [low, high],
      })
    })

    return items
  }, [history, forecasts, mode])

  if (!chartData.length) {
    return (
      <div className="rounded-card border border-dashed border-border p-8 text-center text-text-muted">
        <p className="font-medium">{t.insufficientDesc}</p>
      </div>
    )
  }

  return (
    <div className="rounded-card border border-border bg-surface p-6 shadow-card space-y-4">
      {/* Header with Mode Toggle and Accessible Table Switch */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-h3 text-text">{t.chartTitle}</h3>
          <p className="text-small text-text-muted">
            {mode === 'units' ? t.viewUnits : t.viewRevenue} • {t.chartConfidenceBand}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Units / Revenue Switch */}
          <div className="inline-flex rounded-pill border border-border bg-surface-2 p-1 text-caption">
            <button
              type="button"
              onClick={() => setMode('units')}
              className={`rounded-pill px-3 py-1 font-medium transition-colors ${
                mode === 'units'
                  ? 'bg-brand text-brand-contrast shadow-pill'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              {t.viewUnits}
            </button>
            <button
              type="button"
              onClick={() => setMode('revenue')}
              className={`rounded-pill px-3 py-1 font-medium transition-colors ${
                mode === 'revenue'
                  ? 'bg-brand text-brand-contrast shadow-pill'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              {t.viewRevenue}
            </button>
          </div>

          {/* Table view toggle for accessibility */}
          <button
            type="button"
            onClick={() => setShowTable((prev) => !prev)}
            aria-expanded={showTable}
            aria-controls="forecast-accessible-table"
            className="rounded-pill border border-border bg-surface px-3 py-1.5 text-caption font-medium text-text-muted hover:text-text"
          >
            {showTable
              ? lang === 'ar'
                ? 'إخفاء الجدول'
                : 'Hide Table'
              : lang === 'ar'
                ? 'عرض كجدول'
                : 'View Table'}
          </button>
        </div>
      </div>

      {/* Recharts Visual Chart */}
      <div className="h-72 w-full pt-2 text-text-muted" aria-hidden={showTable ? 'true' : 'false'}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="currentColor"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-border)' }}
            />
            <YAxis
              stroke="currentColor"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-border)' }}
              tickFormatter={(v: number) => (mode === 'revenue' ? `${v}` : `${Math.round(v)}`)}
            />
            <Tooltip content={<CustomTooltip mode={mode} />} />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="circle"
              wrapperStyle={{ fontSize: '12px' }}
            />

            {/* 80% Conformal Interval Band */}
            <Area
              type="monotone"
              dataKey="interval"
              name={t.chartConfidenceBand}
              stroke="none"
              fill="var(--color-pink-line)"
              fillOpacity={0.25}
            />

            {/* Historical Sales Line */}
            <Line
              type="monotone"
              dataKey="history"
              name={t.chartHistory}
              stroke="var(--color-caramel)"
              strokeWidth={2}
              dot={{ r: 3, fill: 'var(--color-caramel)' }}
              activeDot={{ r: 5 }}
            />

            {/* Future Forecast Line */}
            <Line
              type="monotone"
              dataKey="forecast"
              name={t.chartForecast}
              stroke="var(--color-brand)"
              strokeWidth={2.5}
              strokeDasharray="4 4"
              dot={{ r: 4, fill: 'var(--color-brand)' }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Accessible Table */}
      {showTable && (
        <div id="forecast-accessible-table" className="overflow-x-auto pt-4 border-t border-border">
          <table className="w-full text-small text-start">
            <thead>
              <tr className="border-b border-border text-text-muted">
                <th className="py-2 px-3 text-start">{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                <th className="py-2 px-3 text-start">{t.chartHistory}</th>
                <th className="py-2 px-3 text-start">{t.chartForecast}</th>
                <th className="py-2 px-3 text-start">{t.chartConfidenceBand}</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((row) => (
                <tr key={row.date} className="border-b border-border/50">
                  <td className="py-2 px-3 font-mono">{row.date}</td>
                  <td className="py-2 px-3">{row.history !== undefined ? row.history : '—'}</td>
                  <td className="py-2 px-3 font-semibold">
                    {row.forecast !== undefined ? row.forecast : '—'}
                  </td>
                  <td className="py-2 px-3 text-text-muted">
                    {row.interval ? `[${row.interval[0]} – ${row.interval[1]}]` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

import { useLanguage } from '../../../i18n/LanguageProvider'
import type { DashboardDateRange, DashboardPreset } from './types'

interface DashboardRangeSelectorProps {
  preset: DashboardPreset
  onPresetChange: (preset: DashboardPreset) => void
  activeRange: DashboardDateRange
  customRange?: DashboardDateRange
  onCustomRangeChange: (range: DashboardDateRange) => void
}

export function DashboardRangeSelector({
  preset,
  onPresetChange,
  activeRange,
  customRange,
  onCustomRangeChange,
}: DashboardRangeSelectorProps) {
  const { t } = useLanguage()

  const presets: { id: DashboardPreset; label: string }[] = [
    { id: '7d', label: t.admin.preset7d },
    { id: '30d', label: t.admin.preset30d },
    { id: '90d', label: t.admin.preset90d },
    { id: 'custom', label: t.admin.presetCustom },
  ]

  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onCustomRangeChange({
      from: e.target.value,
      to: customRange?.to || activeRange.to,
    })
  }

  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onCustomRangeChange({
      from: customRange?.from || activeRange.from,
      to: e.target.value,
    })
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      {/* Preset pills */}
      <div
        role="group"
        aria-label={t.admin.rangePresetGroup}
        className="inline-flex rounded-(--radius-pill) border border-(--color-border) bg-(--color-surface-2) p-1 shadow-(--shadow-pill)"
      >
        {presets.map((p) => {
          const isSelected = preset === p.id
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onPresetChange(p.id)}
              className={`rounded-(--radius-pill) px-3 py-1.5 text-small font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus) ${
                isSelected
                  ? 'bg-(--color-brand) text-(--color-brand-contrast) shadow-(--shadow-pill)'
                  : 'text-(--color-text-muted) hover:text-(--color-text)'
              }`}
            >
              {p.label}
            </button>
          )
        })}
      </div>

      {/* Custom date range pickers */}
      {preset === 'custom' && (
        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor="admin-date-from"
            className="flex items-center gap-1.5 text-small font-medium text-(--color-text)"
          >
            <span>{t.admin.dateFrom}:</span>
            <input
              id="admin-date-from"
              type="date"
              aria-label={t.admin.dateFrom}
              value={customRange?.from ?? activeRange.from}
              onChange={handleFromChange}
              className="h-9 rounded-(--radius-chip) border border-(--color-border-input) bg-(--color-surface) px-2 text-small text-(--color-text) focus:border-(--color-brand) focus:outline-none focus:ring-1 focus:ring-(--color-focus)"
            />
          </label>
          <label
            htmlFor="admin-date-to"
            className="flex items-center gap-1.5 text-small font-medium text-(--color-text)"
          >
            <span>{t.admin.dateTo}:</span>
            <input
              id="admin-date-to"
              type="date"
              aria-label={t.admin.dateTo}
              value={customRange?.to ?? activeRange.to}
              onChange={handleToChange}
              className="h-9 rounded-(--radius-chip) border border-(--color-border-input) bg-(--color-surface) px-2 text-small text-(--color-text) focus:border-(--color-brand) focus:outline-none focus:ring-1 focus:ring-(--color-focus)"
            />
          </label>
        </div>
      )}
    </div>
  )
}

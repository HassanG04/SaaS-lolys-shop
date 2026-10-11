import type { DashboardDateRange, DashboardPreset } from './types'

/**
 * Formats a Date into YYYY-MM-DD string using Africa/Cairo local date.
 */
export function formatCairoDate(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

/**
 * Calculates inclusive from/to date strings for standard dashboard presets (7d, 30d, 90d).
 * Base date defaults to current time in Africa/Cairo.
 */
export function getPresetDateRange(
  preset: Exclude<DashboardPreset, 'custom'>,
  baseDate: Date = new Date(),
): DashboardDateRange {
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90

  const to = new Date(baseDate)
  const from = new Date(baseDate)
  from.setDate(from.getDate() - (days - 1))

  return {
    from: formatCairoDate(from),
    to: formatCairoDate(to),
  }
}

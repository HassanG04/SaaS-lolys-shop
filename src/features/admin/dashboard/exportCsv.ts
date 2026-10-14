import type { DashboardDailyItem } from './types'

export interface CsvExportOptions {
  filename?: string
  lang?: 'ar' | 'en'
}

/**
 * Formats daily revenue series points into a standard CSV string with UTF-8 BOM.
 */
export function formatDailySeriesCsv(
  daily: DashboardDailyItem[],
  lang: 'ar' | 'en' = 'ar',
): string {
  const isAr = lang === 'ar'
  const headers = isAr
    ? ['التاريخ', 'عدد الطلبات', 'المبيعات المحجوزة (ج.م)', 'المبيعات المسلّمة (ج.م)']
    : ['Date', 'Orders', 'Booked Revenue (EGP)', 'Delivered Revenue (EGP)']

  const rows = daily.map((item) => [
    item.day,
    item.orders.toString(),
    item.booked_total.toFixed(2),
    item.delivered_total.toFixed(2),
  ])

  // Prepend UTF-8 BOM (\uFEFF) for Excel / spreadsheet Arabic text compatibility
  return '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n')
}

/**
 * Triggers a browser download of the daily revenue series as a CSV file.
 */
export function downloadDailySeriesCsv(
  daily: DashboardDailyItem[],
  options: CsvExportOptions = {},
): void {
  const { lang = 'ar', filename = `daily-revenue-${new Date().toISOString().slice(0, 10)}.csv` } =
    options
  const csvContent = formatDailySeriesCsv(daily, lang)
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

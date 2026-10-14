/**
 * UTF-8 Byte Order Mark (\uFEFF).
 * Ensures spreadsheet applications (especially Microsoft Excel on Windows/Mac)
 * correctly decode Arabic UTF-8 text without mojibake.
 */
export const UTF8_BOM = '\uFEFF'

/**
 * Characters that can trigger formula execution in spreadsheet software (CSV Injection / Formula Injection).
 * SEC-14: Any cell starting with =, +, -, @, tab (\t), or carriage return (\r) must be prefixed with a single quote.
 */
export const FORMULA_INJECTION_REGEX = /^[\s]*[=+\-@]|^\t|^\r/

/**
 * Neutralizes spreadsheet formula injection (SEC-14).
 * If a cell value starts with '=', '+', '-', '@', '\t', or '\r',
 * it prefixes the string with a single quote (') so spreadsheet applications
 * interpret it as a literal string rather than an executable formula or command.
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  const str = String(value)
  if (FORMULA_INJECTION_REGEX.test(str)) {
    return "'" + str
  }
  return str
}

/**
 * Escapes a cell value according to RFC 4180 standard CSV rules, after formula neutralization.
 * If the sanitized value contains quotes, commas, newlines, or carriage returns:
 * - Internal double quotes are escaped as two double quotes ("")
 * - The entire cell is enclosed in double quotes ("...")
 */
export function escapeCsvCell(value: unknown): string {
  const sanitized = sanitizeCsvCell(value)
  if (/[",\r\n]/.test(sanitized)) {
    return `"${sanitized.replace(/"/g, '""')}"`
  }
  return sanitized
}

/**
 * Builds an RFC 4180 compliant CSV string with UTF-8 BOM, escaped headers, and sanitized rows.
 */
export function buildCsv(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][],
): string {
  const headerLine = headers.map(escapeCsvCell).join(',')
  const rowLines = rows.map((row) => row.map(escapeCsvCell).join(','))
  return UTF8_BOM + [headerLine, ...rowLines].join('\r\n')
}

/**
 * Generates an export filename with the current date (YYYY-MM-DD).
 */
export function getExportFilename(prefix: string, date: Date = new Date()): string {
  const dateStr = date.toISOString().slice(0, 10)
  return `${prefix}-${dateStr}.csv`
}

/**
 * Triggers a browser download of the CSV content with proper UTF-8 charset mime type.
 */
export function downloadCsv(csvContent: string, filename: string): void {
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

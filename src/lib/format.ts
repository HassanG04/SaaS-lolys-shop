/**
 * Localization and formatting utilities for Lolys.
 * Egyptian Pound (EGP), dates and numbers formatted with Western digits (nu-latn).
 */

export function resolveLocaleTag(locale: string = 'ar'): string {
  return locale === 'en' ? 'en-EG-u-nu-latn' : 'ar-EG-u-nu-latn'
}

/**
 * Formats a monetary amount in Egyptian Pounds (EGP) with Western digits.
 */
export function formatEGP(
  amount: number,
  locale: string = 'ar',
  options?: Intl.NumberFormatOptions,
): string {
  const tag = resolveLocaleTag(locale)
  return new Intl.NumberFormat(tag, {
    style: 'currency',
    currency: 'EGP',
    ...options,
  }).format(amount)
}

/**
 * Formats a date using ar-EG-u-nu-latn (or en-EG-u-nu-latn) with Western digits.
 */
export function formatDate(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
  locale: string = 'ar',
): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  const tag = resolveLocaleTag(locale)
  return new Intl.DateTimeFormat(tag, options).format(d)
}

/**
 * Formats a numeric value with Western digits.
 */
export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
  locale: string = 'ar',
): string {
  const tag = resolveLocaleTag(locale)
  return new Intl.NumberFormat(tag, options).format(value)
}

/**
 * Formats an order reference code in uppercase.
 */
export function formatOrderNumber(orderId: string): string {
  return orderId.toUpperCase().trim()
}

/**
 * Formats a phone number string for display.
 */
export function formatPhone(phone: string): string {
  return phone.trim()
}

/**
 * Returns HTML string attribute or wrapper for LTR content (phones, emails, order codes).
 */
export function wrapLtrHtml(value: string | number): string {
  return `<span dir="ltr">${value}</span>`
}

/**
 * Common HTML props for forcing LTR text direction in React/DOM elements.
 */
export const ltrProps = { dir: 'ltr' as const }

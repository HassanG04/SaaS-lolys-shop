import { describe, expect, it } from 'vitest'
import {
  formatDate,
  formatEGP,
  formatNumber,
  formatOrderNumber,
  formatPhone,
  ltrProps,
  resolveLocaleTag,
  wrapLtrHtml,
} from './format'

describe('format utilities', () => {
  it('resolves correct locale tags with Western digits (nu-latn)', () => {
    expect(resolveLocaleTag('ar')).toBe('ar-EG-u-nu-latn')
    expect(resolveLocaleTag('en')).toBe('en-EG-u-nu-latn')
  })

  it('formats EGP with Western digits in Arabic and English', () => {
    const arFormatted = formatEGP(150.5)
    // Must contain Western digits 150.5 or 150.50
    expect(arFormatted).toMatch(/150\.5/)
    // Must NOT contain Eastern Arabic numerals (٠-٩)
    expect(arFormatted).not.toMatch(/[٠-٩]/)
    // Must contain Egyptian Pound Arabic notation
    expect(arFormatted).toContain('ج.م')

    const enFormatted = formatEGP(150.5, 'en')
    expect(enFormatted).toMatch(/150\.5/)
    expect(enFormatted).toContain('EGP')
  })

  it('formats dates with Western digits', () => {
    const testDate = new Date('2026-10-11T12:00:00Z')
    const arDate = formatDate(testDate, { year: 'numeric', month: 'numeric', day: 'numeric' })
    expect(arDate).not.toMatch(/[٠-٩]/)
    expect(arDate).toMatch(/2026/)

    const enDate = formatDate(testDate, { year: 'numeric', month: 'numeric', day: 'numeric' }, 'en')
    expect(enDate).toMatch(/2026/)
  })

  it('formats numbers with Western digits', () => {
    const num = formatNumber(1234567.89)
    expect(num).not.toMatch(/[٠-٩]/)
    expect(num).toMatch(/1,?234,?567\.89/)
  })

  it('formats order numbers into uppercase trimmed identifiers', () => {
    expect(formatOrderNumber('  ord-1234-xyz  ')).toBe('ORD-1234-XYZ')
  })

  it('formats phone strings and provides LTR wrappers', () => {
    expect(formatPhone('  01012345678  ')).toBe('01012345678')
    expect(wrapLtrHtml('01012345678')).toBe('<span dir="ltr">01012345678</span>')
    expect(ltrProps).toEqual({ dir: 'ltr' })
  })
})

import { describe, it, expect } from 'vitest'
import { generateQrMatrix, generateThemedQrSvg, validateInstaPayLink } from './qr'

describe('validateInstaPayLink', () => {
  it('allows empty or whitespace strings', () => {
    expect(validateInstaPayLink('')).toEqual({ valid: true })
    expect(validateInstaPayLink('   ')).toEqual({ valid: true })
  })

  it('rejects URLs longer than 250 characters', () => {
    const longLink = `https://ipn.eg/S/user/${'a'.repeat(240)}`
    expect(validateInstaPayLink(longLink)).toEqual({
      valid: false,
      error: 'ADM-007',
      reason: 'too_long',
    })
  })

  it('rejects non-https protocols', () => {
    expect(validateInstaPayLink('http://ipn.eg/S/user')).toEqual({
      valid: false,
      error: 'ADM-007',
      reason: 'invalid_protocol',
    })
    expect(validateInstaPayLink('ftp://ipn.eg/S/user')).toEqual({
      valid: false,
      error: 'ADM-007',
      reason: 'invalid_protocol',
    })
  })

  it('rejects non-ipn.eg hostnames including subdomains and lookalikes', () => {
    expect(validateInstaPayLink('https://evil-ipn.eg/S/user')).toEqual({
      valid: false,
      error: 'ADM-007',
      reason: 'invalid_host',
    })
    expect(validateInstaPayLink('https://ipn.eg.attacker.com/S/user')).toEqual({
      valid: false,
      error: 'ADM-007',
      reason: 'invalid_host',
    })
    expect(validateInstaPayLink('https://pay.ipn.eg/S/user')).toEqual({
      valid: false,
      error: 'ADM-007',
      reason: 'invalid_host',
    })
  })

  it('rejects custom non-standard ports', () => {
    expect(validateInstaPayLink('https://ipn.eg:8443/S/user')).toEqual({
      valid: false,
      error: 'ADM-007',
      reason: 'invalid_host',
    })
  })

  it('rejects credentials in URL', () => {
    expect(validateInstaPayLink('https://admin:pass@ipn.eg/S/user')).toEqual({
      valid: false,
      error: 'ADM-007',
      reason: 'invalid_format',
    })
  })

  it('rejects path traversal patterns', () => {
    expect(validateInstaPayLink('https://ipn.eg/S/../user')).toEqual({
      valid: false,
      error: 'ADM-007',
      reason: 'invalid_format',
    })
    expect(validateInstaPayLink('https://ipn.eg/S/user\\payload')).toEqual({
      valid: false,
      error: 'ADM-007',
      reason: 'invalid_format',
    })
  })

  it('enforces recipient consistency when handle is provided', () => {
    const handle = 'alaa.ahm9624@instapay'
    // Matching link
    expect(validateInstaPayLink('https://ipn.eg/S/alaa.ahm9624/9912aa', handle)).toEqual({
      valid: true,
    })
    // Mismatched link
    expect(validateInstaPayLink('https://ipn.eg/S/hassan.other/9912aa', handle)).toEqual({
      valid: false,
      error: 'ADM-007',
      reason: 'mismatched_handle',
    })
  })

  it('validates official ipn.eg links correctly', () => {
    expect(validateInstaPayLink('https://ipn.eg/S/alaa.ahm9624')).toEqual({ valid: true })
    expect(validateInstaPayLink('https://ipn.eg/S/alaa.ahm9624/pay-token-123')).toEqual({
      valid: true,
    })
  })
})

describe('generateQrMatrix', () => {
  it('generates a valid QR matrix with correct dimensions', () => {
    const matrix = generateQrMatrix('https://ipn.eg/S/test', 'M')
    expect(matrix.version).toBeGreaterThanOrEqual(1)
    expect(matrix.size).toBe(matrix.version * 4 + 17)
    expect(matrix.modules).toHaveLength(matrix.size)
    expect(matrix.modules[0]).toHaveLength(matrix.size)
  })

  it('correctly sets up finder patterns in top-left, top-right, and bottom-left', () => {
    const matrix = generateQrMatrix('https://ipn.eg/S/test', 'M')
    const size = matrix.size

    // Check top-left finder center (3,3) is dark and surrounded by light ring
    expect(matrix.modules[3][3]).toBe(true)
    expect(matrix.modules[0][0]).toBe(true)
    expect(matrix.modules[0][6]).toBe(true)
    expect(matrix.modules[6][0]).toBe(true)
    expect(matrix.modules[6][6]).toBe(true)

    // Check top-right finder
    expect(matrix.modules[0][size - 7]).toBe(true)
    expect(matrix.modules[3][size - 4]).toBe(true)

    // Check bottom-left finder
    expect(matrix.modules[size - 7][0]).toBe(true)
    expect(matrix.modules[size - 4][3]).toBe(true)
  })
})

describe('generateThemedQrSvg', () => {
  it('generates an SVG with token brand colors and 4-module quiet zone', () => {
    const text = 'https://ipn.eg/S/alaa.ahm9624/token123'
    const svg = generateThemedQrSvg(text)

    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"')
    expect(svg).toContain('var(--color-qr-light-val)') // Cream background
    expect(svg).toContain('var(--color-qr-dark-val)') // Cocoa modules
    expect(svg).toContain('shape-rendering="crispEdges"')

    const matrix = generateQrMatrix(text, 'M')
    const expectedModules = matrix.size + 8 // 4-module quiet zone on each side
    expect(svg).toContain(`viewBox="0 0 ${expectedModules} ${expectedModules}"`)
  })

  it('allows customizing size, quiet zone and colors', () => {
    const svg = generateThemedQrSvg('https://ipn.eg/S/test', {
      size: 300,
      quietZone: 2,
      darkColor: 'currentColor',
      lightColor: 'transparent',
    })

    expect(svg).toContain('width="300"')
    expect(svg).toContain('height="300"')
    expect(svg).toContain('transparent')
    expect(svg).toContain('currentColor')
  })

  it('generates QR codes that roundtrip decode accurately across short and long payment URLs', () => {
    const testUrls = [
      'https://ipn.eg/S/alaa.ahm9624',
      'https://ipn.eg/S/alaa.ahm9624/d98f7e2a1b',
      'https://ipn.eg/S/alaa.ahm9624/very-long-opaque-share-token-with-many-alphanumeric-characters-1234567890-abcdefg',
    ]

    for (const url of testUrls) {
      const qr = generateQrMatrix(url, 'M')
      expect(qr.size).toBeGreaterThanOrEqual(21)
      expect(qr.modules).toBeDefined()
    }
  })
})

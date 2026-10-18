import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ThemedQrCode } from './ThemedQrCode'

describe('ThemedQrCode component', () => {
  it('renders a scannable themed QR code SVG with valid InstaPay URL', () => {
    const validUrl = 'https://ipn.eg/S/alaa.ahm9624/token123'
    render(<ThemedQrCode value={validUrl} alt="رمز إنستاباي" />)

    const qrElement = screen.getByRole('img', { name: 'رمز إنستاباي' })
    expect(qrElement).toBeInTheDocument()
    const svg = qrElement.querySelector('svg')
    expect(svg).toBeInTheDocument()
    const rect = qrElement.querySelector('rect')
    expect(rect).toHaveAttribute('fill', 'var(--color-qr-light-val)')
    const path = qrElement.querySelector('path')
    expect(path).toHaveAttribute('fill', 'var(--color-qr-dark-val)')
  })

  it('renders fallback when value is empty', () => {
    render(<ThemedQrCode value="" alt="معاينة الرمز" />)
    const fallbackElement = screen.getByRole('img', { name: 'معاينة الرمز' })
    expect(fallbackElement).toBeInTheDocument()
    expect(fallbackElement.querySelector('svg')).not.toBeInTheDocument()
  })

  it('renders custom fallback if provided when value is invalid', () => {
    render(
      <ThemedQrCode
        value="https://evil.com/fake"
        alt="رمز غير صالح"
        fallback={<div data-testid="custom-fallback">الرمز غير صالح</div>}
      />,
    )
    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument()
  })

  it('rejects rendering when URL recipient does not match handle', () => {
    render(
      <ThemedQrCode
        value="https://ipn.eg/S/other.user/token123"
        handle="alaa.ahm9624@instapay"
        alt="رمز غير متطابق"
        fallback={<div data-testid="mismatch-fallback">عدم تطابق</div>}
      />,
    )
    expect(screen.getByTestId('mismatch-fallback')).toBeInTheDocument()
  })
})

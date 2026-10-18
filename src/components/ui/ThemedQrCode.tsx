import { useMemo } from 'react'
import { generateThemedQrData, validateInstaPayLink } from '@/lib/qr'

export interface ThemedQrCodeProps {
  /** The payload or URL to encode into the QR code */
  value?: string | null
  /** Optional associated handle to validate recipient consistency */
  handle?: string | null
  /** Accessible label describing the QR code */
  alt?: string
  /** Size in pixels (default: 200) */
  size?: number
  /** Additional container classes */
  className?: string
  /** Custom fallback component if the value is missing or invalid */
  fallback?: React.ReactNode
}

/**
 * ThemedQrCode: Brand-tokenized, scannable QR code component for Lolys.
 * Enforces:
 * - 4-module quiet zone (ISO 18004 / DENSO WAVE)
 * - Cream background (#fffaf5) and dark cocoa squares (#3b2118) in both light and dark themes
 * - Decorative blush/pink border frame outside the scannable area
 * - Crisp square pixel modules without inversion, gradients, or overlapping artwork
 * - Pure React SVG rendering without dangerouslySetInnerHTML (SEC-07 compliant)
 */
export function ThemedQrCode({
  value,
  handle,
  alt = 'InstaPay QR Code',
  size = 200,
  className = '',
  fallback,
}: ThemedQrCodeProps) {
  const trimmed = value?.trim() || ''

  const validation = useMemo(() => {
    if (!trimmed) return { valid: false }
    return validateInstaPayLink(trimmed, handle)
  }, [trimmed, handle])

  const qrData = useMemo(() => {
    if (!trimmed || !validation.valid) return null
    try {
      return generateThemedQrData(trimmed, { quietZone: 4 })
    } catch {
      return null
    }
  }, [trimmed, validation.valid])

  if (!trimmed || !validation.valid || !qrData) {
    if (fallback) {
      return <>{fallback}</>
    }
    return (
      <div
        className={`flex size-48 flex-col items-center justify-center rounded-card border border-border bg-surface-2 p-4 text-center text-text-muted ${className}`}
        role="img"
        aria-label={alt}
      >
        <span className="text-small font-medium">{alt}</span>
      </div>
    )
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-card border-2 border-pink-line bg-surface p-3 shadow-card ${className}`}
    >
      <div role="img" aria-label={alt} className="overflow-hidden rounded-chip bg-qr-light p-1">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox={qrData.viewBox}
          width={size}
          height={size}
          shapeRendering="crispEdges"
        >
          <rect width="100%" height="100%" fill="var(--color-qr-light-val)" />
          <path d={qrData.pathData} fill="var(--color-qr-dark-val)" />
        </svg>
      </div>
    </div>
  )
}

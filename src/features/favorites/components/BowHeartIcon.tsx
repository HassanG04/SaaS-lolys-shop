export interface BowHeartIconProps {
  filled?: boolean
  className?: string
}

export function BowHeartIcon({ filled = false, className = 'size-5' }: BowHeartIconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Heart outer contour */}
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      {/* Delicate ribbon bow loops across the cleft */}
      <path
        d="M9.5 8c-2-2.5-4-1-3 1s3 1.5 5 1m1 0c2 .5 4 1 5-1s-1-3.5-3-1"
        stroke={filled ? 'var(--color-surface, #FFFAF5)' : 'currentColor'}
        strokeWidth="1.2"
        fill="none"
      />
      {/* Center ribbon knot */}
      <circle
        cx="12"
        cy="9"
        r="1.2"
        fill={filled ? 'var(--color-surface, #FFFAF5)' : 'currentColor'}
        stroke="none"
      />
    </svg>
  )
}

import { useState } from 'react'

interface StarRatingProps {
  value: number
  onChange?: (rating: number) => void
  readOnly?: boolean
  size?: 'sm' | 'md' | 'lg'
  showCount?: boolean
  count?: number
  className?: string
}

const STAR_SIZES = {
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-8',
}

const RATING_LABELS_AR: Record<number, string> = {
  1: 'سيء جدًا',
  2: 'مقبول',
  3: 'جيد',
  4: 'جيد جدًا',
  5: 'ممتاز',
}

export function StarRating({
  value,
  onChange,
  readOnly = false,
  size = 'md',
  showCount = false,
  count,
  className = '',
}: StarRatingProps) {
  const [hoveredValue, setHoveredValue] = useState<number | null>(null)

  const activeValue = hoveredValue !== null ? hoveredValue : value
  const starClass = STAR_SIZES[size]

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <div
        className="flex items-center gap-0.5"
        role={readOnly ? 'img' : 'radiogroup'}
        aria-label={readOnly ? `${value} من 5 نجوم` : 'اختر تقييمًا من 1 إلى 5 نجوم'}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= activeValue
          const isInteractive = !readOnly && Boolean(onChange)

          return (
            <button
              key={star}
              type="button"
              disabled={readOnly}
              onClick={() => isInteractive && onChange?.(star)}
              onMouseEnter={() => isInteractive && setHoveredValue(star)}
              onMouseLeave={() => isInteractive && setHoveredValue(null)}
              onFocus={() => isInteractive && setHoveredValue(star)}
              onBlur={() => isInteractive && setHoveredValue(null)}
              className={`p-0.5 rounded-chip transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                isInteractive
                  ? 'cursor-pointer hover:scale-125 active:scale-95 duration-150'
                  : 'cursor-default'
              }`}
              role={readOnly ? undefined : 'radio'}
              aria-checked={readOnly ? undefined : value === star}
              aria-label={`${star} ${star === 1 ? 'نجمة' : 'نجوم'}`}
            >
              <svg
                viewBox="0 0 24 24"
                className={`${starClass} transition-colors duration-150 ${
                  isFilled
                    ? 'fill-gold text-gold'
                    : 'fill-transparent text-border-input hover:text-sand'
                }`}
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
          )
        })}
      </div>

      {!readOnly && activeValue > 0 ? (
        <span className="text-small font-semibold text-brand transition-opacity duration-150 ms-1">
          {RATING_LABELS_AR[activeValue] || ''}
        </span>
      ) : null}

      {showCount && typeof count === 'number' ? (
        <span className="text-caption text-text-muted ms-1 font-mono">({count})</span>
      ) : null}
    </div>
  )
}

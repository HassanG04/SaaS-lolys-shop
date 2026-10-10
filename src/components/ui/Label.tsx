import type { ComponentPropsWithRef } from 'react'

type LabelProps = ComponentPropsWithRef<'span'>

export function Pill({ className = '', ...props }: LabelProps) {
  return (
    <span
      {...props}
      className={`inline-flex items-center rounded-pill bg-surface-tint px-3 py-1 text-small text-text ${className}`}
    />
  )
}

export function Chip({ className = '', ...props }: LabelProps) {
  return (
    <span
      {...props}
      className={`inline-flex items-center rounded-chip bg-surface-tint px-3 py-1 text-small text-text ${className}`}
    />
  )
}

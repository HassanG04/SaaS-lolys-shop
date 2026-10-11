import type { ComponentPropsWithRef, ReactElement } from 'react'
import { Sparkle } from './ornaments'

type BadgeProps = Omit<ComponentPropsWithRef<'span'>, 'children'> & { label: string } & (
    | { variant?: 'sale' | 'sold-out'; icon?: never }
    | { variant: 'payment-state'; icon: ReactElement }
  )

export function Badge({ variant = 'sale', label, icon, className = '', ...props }: BadgeProps) {
  const appearance =
    variant === 'sale'
      ? 'bg-brand text-brand-contrast'
      : variant === 'sold-out'
        ? 'bg-surface-tint text-text-muted'
        : 'border border-border bg-surface text-text'
  return (
    <span
      {...props}
      className={`ui-badge inline-flex items-center gap-2 rounded-pill px-3 py-1 text-caption font-semibold ${appearance} ${className}`}
    >
      {variant === 'sale' ? <Sparkle /> : null}
      {variant === 'payment-state' ? (
        <span aria-hidden="true" className="inline-flex">
          {icon}
        </span>
      ) : null}
      <span>{label}</span>
    </span>
  )
}

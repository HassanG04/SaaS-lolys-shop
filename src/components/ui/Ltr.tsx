import type { HTMLAttributes, ReactNode } from 'react'

export interface LtrProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode
}

/**
 * Renders LTR-isolated text (phone numbers, emails, order codes) within RTL/LTR contexts.
 */
export function Ltr({ children, className, ...rest }: LtrProps) {
  return (
    <span dir="ltr" className={className} {...rest}>
      {children}
    </span>
  )
}

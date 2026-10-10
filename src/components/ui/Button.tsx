import type { ComponentPropsWithRef } from 'react'

export type ButtonProps = ComponentPropsWithRef<'button'> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'default' | 'icon'
}

export function Button({
  variant = 'primary',
  size = 'default',
  type = 'button',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      data-variant={variant}
      className={`ui-control ui-button inline-flex items-center justify-center gap-2 rounded-pill font-semibold disabled:cursor-not-allowed ${size === 'icon' ? 'aspect-square p-2' : 'px-6 py-2'} ${className}`}
    />
  )
}

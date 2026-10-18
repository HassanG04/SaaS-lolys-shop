import type { ComponentPropsWithoutRef } from 'react'

type ToggleSwitchProps = Omit<
  ComponentPropsWithoutRef<'button'>,
  'children' | 'role' | 'aria-checked'
> & { checked: boolean }

export function ToggleSwitch({ checked, className = '', ...props }: ToggleSwitchProps) {
  return (
    <button
      {...props}
      type="button"
      role="switch"
      aria-checked={checked}
      className={`ui-control inline-flex shrink-0 items-center justify-center rounded-pill disabled:opacity-50 ${className}`}
    >
      <span
        aria-hidden="true"
        className={`ui-switch-track relative block h-6 w-11 rounded-pill border ${checked ? 'border-success bg-success' : 'border-border-input bg-surface-2'}`}
      >
        <span className="ui-switch-thumb" />
      </span>
    </button>
  )
}

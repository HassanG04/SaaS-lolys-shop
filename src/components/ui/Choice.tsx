import { useId, type ComponentPropsWithRef } from 'react'

export type ChoiceProps = Omit<ComponentPropsWithRef<'input'>, 'type' | 'children'> & {
  label: string
}

export function Choice({
  label,
  className = '',
  type,
  ...props
}: ChoiceProps & { type: 'checkbox' | 'radio' }) {
  const generated = useId()
  const id = props.id ?? generated
  return (
    <label
      htmlFor={id}
      className={`ui-control inline-flex items-center gap-3 ${props.disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className="relative inline-flex shrink-0">
        <input
          {...props}
          id={id}
          type={type}
          className={`peer ui-control ui-choice ${type === 'radio' ? 'rounded-pill' : 'rounded-chip'} ${className}`}
        />
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 24 24"
          className="ui-choice-mark pointer-events-none absolute m-auto hidden size-5 text-brand-contrast peer-checked:block"
        >
          {type === 'checkbox' ? (
            <path
              d="m5 12 4 4L19 6"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : (
            <circle cx="12" cy="12" r="5" fill="currentColor" />
          )}
        </svg>
      </span>
      <span>{label}</span>
    </label>
  )
}

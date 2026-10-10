import type { InputProps } from './Input'
import { Field, fieldClass, useField } from './Field'
import { IconButton } from './IconButton'
import { ui } from '../../i18n/ar.json'

type SearchInputProps = Omit<InputProps, 'type' | 'form' | 'onSubmit'> & {
  onSearch: (value: string) => void
}

export function SearchInput({
  label,
  hint,
  onSearch,
  name = 'search',
  className = '',
  ...props
}: SearchInputProps) {
  const field = useField(props.id, hint, props['aria-describedby'])
  return (
    <form
      role="search"
      aria-label={label}
      onSubmit={(event) => {
        event.preventDefault()
        const value = new FormData(event.currentTarget).get(name)
        if (!props.disabled && typeof value === 'string') onSearch(value)
      }}
    >
      <Field {...field} label={label} hint={hint}>
        <div className="relative">
          <input
            {...props}
            {...field}
            name={name}
            type="search"
            className={`${fieldClass} ui-search rounded-pill ${className}`}
          />
          <IconButton
            type="submit"
            aria-label={ui.search}
            disabled={props.disabled}
            className="ui-search-submit absolute end-1"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              focusable="false"
            >
              <circle cx="10" cy="10" r="6" />
              <path d="m15 15 6 6" />
            </svg>
          </IconButton>
        </div>
      </Field>
    </form>
  )
}

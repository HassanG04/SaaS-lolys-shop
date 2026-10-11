import type { ComponentPropsWithRef } from 'react'
import { Field, fieldClass, useField, type FieldProps } from './Field'

export function Textarea({
  label,
  hint,
  className = '',
  rows = 4,
  ...props
}: FieldProps & ComponentPropsWithRef<'textarea'>) {
  const field = useField(props.id, hint, props['aria-describedby'])
  return (
    <Field {...field} label={label} hint={hint}>
      <textarea
        {...props}
        {...field}
        rows={rows}
        className={`${fieldClass} rounded-image ${className}`}
      />
    </Field>
  )
}

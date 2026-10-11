import type { ComponentPropsWithRef } from 'react'
import { Field, fieldClass, useField, type FieldProps } from './Field'

export function Select({
  label,
  hint,
  className = '',
  ...props
}: FieldProps & ComponentPropsWithRef<'select'>) {
  const field = useField(props.id, hint, props['aria-describedby'])
  return (
    <Field {...field} label={label} hint={hint}>
      <select {...props} {...field} className={`${fieldClass} rounded-pill ${className}`} />
    </Field>
  )
}

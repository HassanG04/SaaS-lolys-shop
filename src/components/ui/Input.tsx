import type { ComponentPropsWithRef } from 'react'
import { Field, fieldClass, useField, type FieldProps } from './Field'

export type InputProps = FieldProps &
  Omit<ComponentPropsWithRef<'input'>, 'type'> & {
    type?: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url' | 'number'
  }

export function Input({ label, hint, className = '', ...props }: InputProps) {
  const field = useField(props.id, hint, props['aria-describedby'])
  return (
    <Field {...field} label={label} hint={hint}>
      <input {...props} {...field} className={`${fieldClass} rounded-pill ${className}`} />
    </Field>
  )
}

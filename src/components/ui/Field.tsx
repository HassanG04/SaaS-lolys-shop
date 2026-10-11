import { useId, type ReactNode } from 'react'

export type FieldProps = { label: string; hint?: ReactNode }

export const fieldClass =
  'ui-control ui-field block w-full min-w-0 border border-border-input bg-surface px-4 py-2 text-text placeholder:text-text-muted disabled:cursor-not-allowed'

export function useField(id: string | undefined, hint: ReactNode, describedBy?: string) {
  const generated = useId()
  const fieldId = id ?? generated
  return {
    id: fieldId,
    'aria-describedby':
      [describedBy, hint != null ? `${fieldId}-hint` : undefined].filter(Boolean).join(' ') ||
      undefined,
  }
}

export function Field({
  id,
  label,
  hint,
  children,
}: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-2">
      <label htmlFor={id} className="block text-small font-semibold">
        {label}
      </label>
      {children}
      {hint != null && (
        <div id={`${id}-hint`} className="text-small text-text-muted">
          {hint}
        </div>
      )}
    </div>
  )
}

import { useState, type ComponentPropsWithRef } from 'react'
import { Field, fieldClass, useField, type FieldProps } from './Field'
import { useLanguage } from '@/i18n/LanguageProvider'
import { generateSecurePassword } from '@/features/auth/passwordStrength'

export interface PasswordFieldProps
  extends FieldProps, Omit<ComponentPropsWithRef<'input'>, 'type'> {
  value: string
  allowGenerate?: boolean
  onGenerate?: (password: string) => void
  error?: string
}

export function PasswordField({
  label,
  hint,
  value,
  allowGenerate = false,
  onGenerate,
  error,
  className = '',
  id,
  disabled,
  autoComplete,
  ...props
}: PasswordFieldProps) {
  const { t } = useLanguage()
  const [show, setShow] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)
  const field = useField(id, hint ?? error, props['aria-describedby'])

  const handleCopy = async () => {
    if (!value || disabled) return
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value)
        setCopied(true)
        setCopyFeedback(t.auth.passwordCopied)
        setTimeout(() => {
          setCopied(false)
          setCopyFeedback(null)
        }, 2000)
      } else {
        setCopyFeedback(t.auth.copyFailed)
        setTimeout(() => setCopyFeedback(null), 2500)
      }
    } catch {
      setCopyFeedback(t.auth.copyFailed)
      setTimeout(() => setCopyFeedback(null), 2500)
    }
  }

  const handleGenerate = () => {
    if (disabled) return
    const generated = generateSecurePassword(20)
    if (onGenerate) {
      onGenerate(generated)
    }
  }

  return (
    <Field
      {...field}
      label={label}
      hint={error ? <span className="text-danger">{error}</span> : hint}
    >
      <div className="relative flex items-center">
        <input
          {...props}
          {...field}
          type={show ? 'text' : 'password'}
          value={value}
          disabled={disabled}
          autoComplete={autoComplete ?? (allowGenerate ? 'new-password' : 'current-password')}
          dir="ltr"
          className={`${fieldClass} rounded-pill pe-24 font-mono text-small ${className}`}
        />

        <div className="absolute inset-y-0 end-2 flex items-center gap-1">
          {allowGenerate && (
            <button
              type="button"
              disabled={disabled}
              onClick={handleGenerate}
              className="p-1.5 text-text-muted hover:text-brand transition-colors rounded-pill focus:ring-2 focus:ring-focus disabled:opacity-40"
              aria-label={t.auth.generatePassword}
              title={t.auth.generatePassword}
            >
              <svg
                className="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z" />
                <path d="m14 7 3 3" />
                <path d="M5 6v4" />
                <path d="M19 14v4" />
                <path d="M10 2v2" />
                <path d="M7 8H3" />
                <path d="M21 16h-4" />
                <path d="M11 3H9" />
              </svg>
            </button>
          )}

          <button
            type="button"
            disabled={!value || disabled}
            onClick={handleCopy}
            className="p-1.5 text-text-muted hover:text-brand transition-colors rounded-pill focus:ring-2 focus:ring-focus disabled:opacity-40"
            aria-label={copied ? t.auth.passwordCopied : t.auth.copyPassword}
            title={copied ? t.auth.passwordCopied : t.auth.copyPassword}
          >
            {copied ? (
              <svg
                className="size-4 text-success"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg
                className="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
              </svg>
            )}
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => setShow(!show)}
            className="p-1.5 text-text-muted hover:text-brand transition-colors rounded-pill focus:ring-2 focus:ring-focus disabled:opacity-40"
            aria-label={show ? t.auth.hidePassword : t.auth.showPassword}
            title={show ? t.auth.hidePassword : t.auth.showPassword}
          >
            {show ? (
              <svg
                className="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                <line x1="2" x2="22" y1="2" y2="22" />
              </svg>
            ) : (
              <svg
                className="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
      </div>
      {copyFeedback && (
        <div role="status" aria-live="polite" className="text-caption text-text-muted">
          {copyFeedback}
        </div>
      )}
    </Field>
  )
}

export default PasswordField

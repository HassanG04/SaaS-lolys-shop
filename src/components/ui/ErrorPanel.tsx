import type { ReactNode } from 'react'
import { useLanguage } from '../../i18n/LanguageProvider'
import { Button } from './Button'
import { Ltr } from './Ltr'

export interface ErrorPanelProps {
  title?: string
  message?: ReactNode
  code?: string
  onRetry?: () => void
  retryLabel?: string
  action?: ReactNode
  className?: string
}

export function ErrorPanel({
  title,
  message,
  code,
  onRetry,
  retryLabel,
  action,
  className = '',
}: ErrorPanelProps) {
  const { t } = useLanguage()
  const ui = t.ui

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`flex flex-col items-center justify-center rounded-card border border-border bg-surface p-6 text-center text-text shadow-pill sm:p-8 ${className}`}
    >
      <div className="mb-4 flex size-12 items-center justify-center rounded-pill bg-surface-tint text-danger">
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-6"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      <h3 className="text-h3 font-bold text-brand">{title || ui.errorOccurred}</h3>

      <div className="mt-2 max-w-md text-small text-text-muted">
        {message || ui.errorDescription}
      </div>

      {code && (
        <div className="mt-3">
          <span className="inline-block rounded-chip bg-surface-tint px-3 py-1 text-caption font-mono font-medium text-danger">
            <Ltr>
              {ui.errorCode} {code}
            </Ltr>
          </span>
        </div>
      )}

      {(onRetry || action) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {onRetry && (
            <Button variant="primary" onClick={onRetry}>
              {retryLabel || ui.retry}
            </Button>
          )}
          {action}
        </div>
      )}
    </div>
  )
}

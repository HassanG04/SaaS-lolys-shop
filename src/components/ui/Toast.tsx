import type { ReactNode } from 'react'

const states = {
  success: { color: 'text-success', path: 'm5 12 4 4L19 6' },
  info: { color: 'text-brand', path: 'M12 8v.01M12 11v6M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18' },
  warning: { color: 'text-warning', path: 'M12 4 3.5 20h17L12 4ZM12 10v4m0 3v.01' },
  danger: { color: 'text-danger', path: 'm7 7 10 10M17 7 7 17' },
}

export type ToastProps = {
  title: string
  message: ReactNode
  severity?: keyof typeof states
  onDismiss?: () => void
}

import { useLanguage } from '../../i18n/LanguageProvider'

export function Toast({ title, message, severity = 'info', onDismiss }: ToastProps) {
  const { t } = useLanguage()
  const ui = t.ui
  const state = states[severity]
  return (
    <div className="flex items-start gap-3 rounded-chip border border-border bg-surface p-3 text-text">
      <div
        role={severity === 'danger' ? 'alert' : 'status'}
        aria-atomic="true"
        className="flex min-w-0 flex-1 gap-3"
      >
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 24 24"
          className={`size-6 shrink-0 ${state.color}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={state.path} />
        </svg>
        <div className="min-w-0 break-words">
          <p className="font-semibold">{title}</p>
          <div>{message}</div>
        </div>
      </div>
      {onDismiss ? (
        <button
          type="button"
          aria-label={ui.dismissNotification}
          data-variant="ghost"
          className="ui-control ui-button inline-flex aspect-square items-center justify-center rounded-pill p-2"
          onClick={onDismiss}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      ) : null}
    </div>
  )
}

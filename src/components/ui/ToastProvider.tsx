import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { useOptionalLanguage } from '../../i18n/LanguageProvider'

export type ToastSeverity = 'info' | 'success' | 'warning' | 'danger'

export interface ToastItem {
  id: string
  title: string
  message: ReactNode
  severity?: ToastSeverity
  durationMs?: number
}

export interface ToastContextValue {
  toasts: ToastItem[]
  showToast: (options: Omit<ToastItem, 'id'>) => string
  dismissToast: (id: string) => void
  success: (message: ReactNode, title?: string) => string
  error: (message: ReactNode, title?: string) => string
  info: (message: ReactNode, title?: string) => string
  warning: (message: ReactNode, title?: string) => string
}

export const ToastContext = createContext<ToastContextValue | null>(null)

let toastSeq = 0

const toastIcons = {
  success: { color: 'text-success', path: 'm5 12 4 4L19 6' },
  info: { color: 'text-brand', path: 'M12 8v.01M12 11v6M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18' },
  warning: { color: 'text-warning', path: 'M12 4 3.5 20h17L12 4ZM12 10v4m0 3v.01' },
  danger: { color: 'text-danger', path: 'm7 7 10 10M17 7 7 17' },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const dismissToast = useCallback((id: string) => {
    clearTimeout(timers.current[id])
    delete timers.current[id]
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    ({ title, message, severity = 'info', durationMs = 5000 }: Omit<ToastItem, 'id'>) => {
      const id = `t-${++toastSeq}`
      setToasts((prev) => [...prev, { id, title, message, severity, durationMs }])
      if (durationMs > 0) timers.current[id] = setTimeout(() => dismissToast(id), durationMs)
      return id
    },
    [dismissToast],
  )

  const langContext = useOptionalLanguage()
  const t = langContext?.t
  const notify =
    (severity: ToastSeverity, key: 'toastSuccess' | 'toastError' | 'toastInfo' | 'toastWarning') =>
    (message: ReactNode, title?: string) =>
      showToast({ title: title ?? t?.ui[key] ?? '', message, severity })
  const success = notify('success', 'toastSuccess')
  const error = notify('danger', 'toastError')
  const info = notify('info', 'toastInfo')
  const warning = notify('warning', 'toastWarning')

  useEffect(() => {
    const t = timers.current
    return () => Object.values(t).forEach(clearTimeout)
  }, [])

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        dismissToast,
        success,
        error,
        info,
        warning,
      }}
    >
      {children}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          aria-label={t?.ui.notifications ?? 'الإشعارات'}
          className="fixed bottom-4 start-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 pointer-events-none"
        >
          {toasts.map((toast) => {
            const s = toastIcons[toast.severity ?? 'info']
            return (
              <div key={toast.id} className="pointer-events-auto shadow-pill">
                <div className="flex items-start gap-3 rounded-chip border border-border bg-surface p-3 text-text">
                  <div
                    role={toast.severity === 'danger' ? 'alert' : 'status'}
                    aria-atomic="true"
                    className="flex min-w-0 flex-1 gap-3"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className={`size-6 shrink-0 ${s.color}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d={s.path} />
                    </svg>
                    <div className="min-w-0 break-words">
                      <p className="font-semibold">{toast.title}</p>
                      <div>{toast.message}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label={t?.ui.dismissNotification ?? 'إغلاق'}
                    data-variant="ghost"
                    className="ui-control ui-button rounded-pill p-2"
                    onClick={() => dismissToast(toast.id)}
                  >
                    <svg
                      className="size-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path d="m6 6 12 12M18 6 6 18" />
                    </svg>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

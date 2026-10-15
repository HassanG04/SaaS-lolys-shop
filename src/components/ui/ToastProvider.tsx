import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Toast } from './Toast'

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

  const notify =
    (severity: ToastSeverity, def: string) =>
    (message: ReactNode, title = def) =>
      showToast({ title, message, severity })
  const success = notify('success', 'نجاح')
  const error = notify('danger', 'تنبيه')
  const info = notify('info', 'معلومة')
  const warning = notify('warning', 'تحذير')

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
          aria-label="الإشعارات"
          className="fixed bottom-4 start-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 pointer-events-none"
        >
          {toasts.map((toast) => (
            <div key={toast.id} className="pointer-events-auto shadow-pill">
              <Toast
                title={toast.title}
                message={toast.message}
                severity={toast.severity}
                onDismiss={() => dismissToast(toast.id)}
              />
            </div>
          ))}
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

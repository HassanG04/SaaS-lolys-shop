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

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismissToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    ({ title, message, severity = 'info', durationMs = 5000 }: Omit<ToastItem, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const newItem: ToastItem = { id, title, message, severity, durationMs }

      setToasts((prev) => [...prev, newItem])

      if (durationMs > 0) {
        const timer = setTimeout(() => {
          dismissToast(id)
        }, durationMs)
        timersRef.current.set(id, timer)
      }

      return id
    },
    [dismissToast],
  )

  const success = useCallback(
    (message: ReactNode, title = 'نجاح') => {
      return showToast({ title, message, severity: 'success' })
    },
    [showToast],
  )

  const error = useCallback(
    (message: ReactNode, title = 'تنبيه') => {
      return showToast({ title, message, severity: 'danger' })
    },
    [showToast],
  )

  const info = useCallback(
    (message: ReactNode, title = 'معلومة') => {
      return showToast({ title, message, severity: 'info' })
    },
    [showToast],
  )

  const warning = useCallback(
    (message: ReactNode, title = 'تحذير') => {
      return showToast({ title, message, severity: 'warning' })
    },
    [showToast],
  )

  useEffect(() => {
    const currentTimers = timersRef.current
    return () => {
      currentTimers.forEach((timer) => clearTimeout(timer))
      currentTimers.clear()
    }
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

import { Component, type ErrorInfo, type ReactNode } from 'react'

export interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode)
  onReset?: () => void
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, errorInfo)
  }

  resetError = (): void => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  override render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback(this.state.error, this.resetError)
      }
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-[50vh] items-center justify-center p-4">
          <div
            role="alert"
            aria-live="assertive"
            className="flex flex-col items-center justify-center rounded-card border border-border bg-surface p-6 text-center text-text shadow-pill sm:p-8"
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
            <h3 className="text-h3 font-bold text-brand">حدث خطأ غير متوقع في الصفحة</h3>
            <div className="mt-2 max-w-md text-small text-text-muted">
              <p>نعتذر عن هذا الخطأ. يمكنك محاولة إعادة التحميل أو العودة لاحقًا.</p>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                data-variant="secondary"
                className="ui-control ui-button inline-flex items-center justify-center gap-2 rounded-pill font-semibold disabled:cursor-not-allowed px-6 py-2"
                onClick={this.resetError}
              >
                إعادة المحاولة
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

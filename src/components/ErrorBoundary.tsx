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

      const isEn = typeof document !== 'undefined' && document.documentElement.lang === 'en'
      return (
        <div className="flex min-h-[50vh] items-center justify-center p-4">
          <div
            role="alert"
            aria-live="assertive"
            className="flex flex-col items-center justify-center rounded-card border border-border bg-surface p-6 text-center shadow-pill sm:p-8"
          >
            <div className="mb-4 flex size-12 items-center justify-center rounded-pill bg-surface-tint text-danger">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="size-6"
              >
                <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m0 6v4m0 4h.01" />
              </svg>
            </div>
            <h3 className="text-h3 font-bold text-brand">
              {isEn ? 'Unexpected error' : 'حدث خطأ غير متوقع في الصفحة'}
            </h3>
            <p className="mt-2 max-w-md text-small text-text-muted">
              {isEn ? 'Please refresh or try again.' : 'يرجى تحديث الصفحة أو المحاولة.'}
            </p>
            <button
              type="button"
              data-variant="secondary"
              className="ui-control ui-button mt-6 rounded-pill px-6 py-2 font-semibold"
              onClick={this.resetError}
            >
              {isEn ? 'Retry' : 'إعادة المحاولة'}
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

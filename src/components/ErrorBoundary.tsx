import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorPanel } from './ui/ErrorPanel'

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
          <ErrorPanel
            title="حدث خطأ غير متوقع في الصفحة"
            message="نعتذر عن هذا الخطأ. يمكنك محاولة إعادة التحميل أو العودة لاحقًا."
            onRetry={this.resetError}
            retryLabel="إعادة المحاولة"
          />
        </div>
      )
    }

    return this.props.children
  }
}

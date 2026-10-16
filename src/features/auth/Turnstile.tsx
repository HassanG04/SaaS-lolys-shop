import { useEffect, useRef } from 'react'
import { getEnv } from '../../lib/env'

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string
          callback: (token: string) => void
          'error-callback'?: () => void
          'expired-callback'?: () => void
          theme?: 'light' | 'dark' | 'auto'
        },
      ) => string
      reset: (widgetId?: string) => void
      remove: (widgetId: string) => void
    }
  }
}

export interface TurnstileProps {
  onVerify: (token: string) => void
  onError?: () => void
  onExpire?: () => void
  className?: string
}

export function Turnstile({ onVerify, onError, onExpire, className = '' }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)

  useEffect(() => {
    let siteKey = '1x00000000000000000000AA'
    try {
      const env = getEnv()
      if (env.VITE_TURNSTILE_SITE_KEY) {
        siteKey = env.VITE_TURNSTILE_SITE_KEY
      }
    } catch {
      // fallback if env is not configured in test
    }

    // Test environment mock: emit synthetic token only during automated tests
    if (import.meta.env.MODE === 'test') {
      const timer = setTimeout(() => {
        onVerify('test-turnstile-token')
      }, 0)
      return () => clearTimeout(timer)
    }

    if (typeof window === 'undefined') return

    let checkInterval: ReturnType<typeof setInterval> | null = null

    const renderWidget = () => {
      if (containerRef.current && window.turnstile && !widgetIdRef.current) {
        try {
          const id = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            callback: onVerify,
            'error-callback': onError,
            'expired-callback': onExpire,
            theme: 'auto',
          })
          widgetIdRef.current = id
        } catch {
          onError?.()
        }
      }
    }

    if (window.turnstile) {
      renderWidget()
    } else {
      let attempts = 0
      checkInterval = setInterval(() => {
        attempts++
        if (window.turnstile) {
          if (checkInterval) clearInterval(checkInterval)
          renderWidget()
        } else if (attempts > 50) {
          // Timeout after 5s
          if (checkInterval) clearInterval(checkInterval)
          onError?.()
        }
      }, 100)
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval)
      if (widgetIdRef.current && window.turnstile?.remove) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch {
          // ignore cleanup errors
        }
      }
    }
  }, [onVerify, onError, onExpire])

  return (
    <div
      ref={containerRef}
      className={`my-2 flex justify-center min-h-[65px] ${className}`}
      data-testid="turnstile-widget"
    />
  )
}

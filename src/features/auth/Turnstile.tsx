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
  const callbacks = useRef({ onVerify, onError, onExpire })

  useEffect(() => {
    callbacks.current = { onVerify, onError, onExpire }
  }, [onVerify, onError, onExpire])

  useEffect(() => {
    let siteKey: string
    try {
      siteKey = getEnv().VITE_TURNSTILE_SITE_KEY
    } catch {
      callbacks.current.onError?.()
      return
    }

    // Cloudflare's documented dummy keys must never protect a production form.
    if (import.meta.env.PROD && /^[123]x0+[A-Z]{2}$/.test(siteKey)) {
      callbacks.current.onError?.()
      return
    }

    let disposed = false
    let script: HTMLScriptElement | null = null
    let timeout: ReturnType<typeof setTimeout> | undefined
    let failed = false
    const fail = () => {
      if (disposed || failed) return
      failed = true
      clearTimeout(timeout)
      script?.remove()
      callbacks.current.onError?.()
    }

    const renderWidget = () => {
      clearTimeout(timeout)
      if (
        !disposed &&
        !failed &&
        containerRef.current &&
        window.turnstile &&
        !widgetIdRef.current
      ) {
        try {
          const id = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            callback: (token) => {
              if (!disposed) callbacks.current.onVerify(token)
            },
            'error-callback': () => {
              if (!disposed) callbacks.current.onError?.()
            },
            'expired-callback': () => {
              if (!disposed) callbacks.current.onExpire?.()
            },
            theme: 'auto',
          })
          widgetIdRef.current = id
        } catch {
          fail()
        }
      }
    }
    const loaded = () => {
      if (window.turnstile) renderWidget()
      else fail()
    }

    if (window.turnstile) {
      renderWidget()
    } else {
      const src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`)
      const isNew = !script
      script ??= document.createElement('script')
      script.src = src
      script.async = true
      script.addEventListener('load', loaded)
      script.addEventListener('error', fail)
      timeout = setTimeout(fail, 10000)
      if (isNew) document.head.append(script)
    }

    return () => {
      disposed = true
      clearTimeout(timeout)
      script?.removeEventListener('load', loaded)
      script?.removeEventListener('error', fail)
      if (widgetIdRef.current && window.turnstile?.remove) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch {
          // ignore cleanup errors
        }
      }
      widgetIdRef.current = null
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={`my-2 flex justify-center min-h-[65px] ${className}`}
      data-testid="turnstile-widget"
    />
  )
}

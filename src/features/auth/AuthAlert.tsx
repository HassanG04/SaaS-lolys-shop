import type { ReactNode } from 'react'
import type { AuthErrorCode } from './types'
import { getAuthMessage } from './authErrors'
import { useOptionalLanguage } from '../../i18n/LanguageProvider'

export interface AuthAlertProps {
  code: AuthErrorCode
  className?: string
}

/**
 * Renders an authentication alert adhering to Lolys error design spec:
 * - Arabic error sentence
 * - Small line: رمز الخطأ: AUTH-xxx (dir="ltr")
 * - Neutral messages (AUTH-010) styled as informative notices
 */
export function AuthAlert({ code, className = '' }: AuthAlertProps): ReactNode {
  const isNeutral = code === 'AUTH-010'
  const language = useOptionalLanguage()
  const isEn = language ? language.lang === 'en' : document.documentElement.lang === 'en'
  const message = getAuthMessage(code, isEn ? 'en' : 'ar')

  if (isNeutral) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`rounded-(--radius-card) border border-(--color-border) bg-(--color-surface-tint) p-4 text-(--color-text) space-y-1 ${className}`}
      >
        <p className="text-small font-medium">{message}</p>
      </div>
    )
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`rounded-(--radius-card) border border-(--color-danger) bg-(--color-surface) p-4 text-(--color-danger) space-y-2 ${className}`}
    >
      <p className="text-small font-semibold text-(--color-danger)">{message}</p>
      <div className="text-caption text-(--color-text-muted)">
        <span>{isEn ? 'Error code: ' : 'رمز الخطأ: '}</span>
        <span dir="ltr" className="font-mono font-semibold">
          {code}
        </span>
      </div>
    </div>
  )
}

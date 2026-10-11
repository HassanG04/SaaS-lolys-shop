import type { ReactNode } from 'react'
import type { AuthErrorCode } from './types'

export const AUTH_MESSAGES: Record<AuthErrorCode, string> = {
  'AUTH-001': 'تعذّر تسجيل الدخول. تحقّق من البيانات وحاول مرة أخرى.',
  'AUTH-002': 'محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.',
  'AUTH-003': 'تعذّر التحقق الأمني. أعد المحاولة.',
  'AUTH-004': 'انتهت الجلسة. سجّل الدخول مرة أخرى.',
  'AUTH-005': 'هذه الصفحة تتطلب التحقق بخطوتين.',
  'AUTH-006': 'رمز التحقق غير صحيح أو انتهت صلاحيته. جرّب رمزًا جديدًا.',
  'AUTH-007': 'لأجل أمانك، سجّل الدخول من جديد لإتمام هذا الإجراء.',
  'AUTH-008': 'كلمة المرور ضعيفة. استخدم 10 أحرف على الأقل.',
  'AUTH-009': 'الرابط غير صالح أو انتهت صلاحيته. اطلب رابطًا جديدًا.',
  'AUTH-010': 'إذا كان البريد الإلكتروني صحيحًا فستصلك رسالة خلال دقائق.',
  'AUTH-011': 'لا تملك صلاحية الوصول إلى هذه الصفحة.',
  'AUTH-012': 'تعذّر إرسال الرسالة الآن. حاول بعد قليل.',
}

export function getAuthMessage(code: AuthErrorCode): string {
  return AUTH_MESSAGES[code] || AUTH_MESSAGES['AUTH-001']
}

export function mapAuthError(error: unknown): AuthErrorCode {
  if (!error) return 'AUTH-001'

  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message).toLowerCase()
      : String(error).toLowerCase()

  const status =
    typeof error === 'object' && error !== null && 'status' in error
      ? Number((error as { status: unknown }).status)
      : 0

  if (message.includes('captcha') || message.includes('turnstile')) {
    return 'AUTH-003'
  }

  if (status === 429 || message.includes('rate limit') || message.includes('too many requests')) {
    return 'AUTH-002'
  }

  if (
    message.includes('totp') ||
    message.includes('invalid code') ||
    message.includes('expired code') ||
    message.includes('verification code')
  ) {
    return 'AUTH-006'
  }

  if (message.includes('mfa') || message.includes('aal2') || message.includes('two-factor')) {
    return 'AUTH-005'
  }

  if (
    message.includes('reauthenticate') ||
    message.includes('re-authenticate') ||
    message.includes('recent login') ||
    message.includes('stale') ||
    message.includes('session expired') ||
    message.includes('reauthentication')
  ) {
    return 'AUTH-007'
  }

  if (message.includes('password') && (message.includes('short') || message.includes('weak'))) {
    return 'AUTH-008'
  }

  // All other sign-in errors map to generic AUTH-001
  return 'AUTH-001'
}

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
  const message = getAuthMessage(code)

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
        <span>رمز الخطأ: </span>
        <span dir="ltr" className="font-mono font-semibold">
          {code}
        </span>
      </div>
    </div>
  )
}

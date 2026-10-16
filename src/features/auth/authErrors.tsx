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
  'AUTH-013': 'كلمتا المرور غير متطابقتين. تأكد من تطابقهما.',
  'AUTH-014': 'يرجى تأكيد بريدك الإلكتروني لتتمكن من إتمام الطلب.',
  'ADM-001': 'هذه العملية للمسؤول فقط.',
  'ADM-002': 'فعّل التحقق بخطوتين للدخول إلى لوحة التحكم.',
  'ADM-003': 'أكّد هويتك برمز التحقق لإتمام هذا الإجراء.',
}

export const AUTH_MESSAGES_EN: Record<AuthErrorCode, string> = {
  'AUTH-001': 'Unable to sign in. Please verify your credentials and try again.',
  'AUTH-002': 'Too many attempts. Please wait a moment and try again.',
  'AUTH-003': 'Security verification failed. Please try again.',
  'AUTH-004': 'Session expired. Please sign in again.',
  'AUTH-005': 'This page requires two-factor authentication.',
  'AUTH-006': 'Invalid or expired verification code. Please try a new code.',
  'AUTH-007': 'For your security, please sign in again to complete this action.',
  'AUTH-008': 'Password is too weak. Please use at least 10 characters.',
  'AUTH-009': 'Link is invalid or has expired. Please request a new link.',
  'AUTH-010': 'If the email address is valid, you will receive a message shortly.',
  'AUTH-011': 'You do not have permission to access this page.',
  'AUTH-012': 'Unable to send message right now. Please try again shortly.',
  'AUTH-013': 'Passwords do not match. Please verify both fields.',
  'AUTH-014': 'Please verify your email address to complete your order.',
  'ADM-001': 'This operation requires administrator privileges.',
  'ADM-002': 'Enable two-factor authentication to access the admin panel.',
  'ADM-003': 'Confirm your identity with a verification code to complete this action.',
}

export function getAuthMessage(code: AuthErrorCode, lang: 'ar' | 'en' = 'ar'): string {
  const messages = lang === 'en' ? AUTH_MESSAGES_EN : AUTH_MESSAGES
  return messages[code] || messages['AUTH-001']
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

  if (
    message.includes('otp_expired') ||
    message.includes('token_expired') ||
    message.includes('link is invalid') ||
    message.includes('link has expired') ||
    message.includes('email link is invalid') ||
    message.includes('token has expired') ||
    (message.includes('link') && (message.includes('expired') || message.includes('invalid')))
  ) {
    return 'AUTH-009'
  }

  if (
    message.includes('already registered') ||
    message.includes('already exists') ||
    message.includes('user_already_exists') ||
    message.includes('email_exists')
  ) {
    return 'AUTH-010'
  }

  // All other sign-in errors map to generic AUTH-001
  return 'AUTH-001'
}

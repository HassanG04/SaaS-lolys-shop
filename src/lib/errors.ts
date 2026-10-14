import { createElement, type ReactNode } from 'react'

export const ERROR_CATALOGUE = {
  // AUTH: sign-in and account
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

  // ORD: orders
  'ORD-001': 'سلتك فارغة.',
  'ORD-002': 'في السلة منتج بياناته غير صحيحة. حدّث السلة وحاول مرة أخرى.',
  'ORD-003': 'أكمل بيانات التوصيل (الاسم والهاتف والعنوان).',
  'ORD-004': 'طريقة التوصيل هذه غير متاحة في محافظتك.',
  'ORD-005': 'المنتج «{name}» لم يعد متاحًا.',
  'ORD-006': 'الكمية غير صحيحة.',
  'ORD-007': 'المتبقي من «{name}» {left} فقط.',
  'ORD-008': 'أحد المنتجات في السلة لم يعد موجودًا.',
  'ORD-009': 'لا يمكن إلغاء هذا الطلب الآن.',
  'ORD-010': 'لديك طلبات كثيرة قيد الانتظار. أكمل طلبًا أو ألغِه قبل إنشاء طلب جديد.',
  'ORD-011': 'طريقة الدفع غير متاحة حاليًا.',
  'ORD-012': 'بيانات العنوان غير صالحة. راجع الحقول وحاول مرة أخرى.',
  'ORD-013': 'عدد المنتجات في الطلب أكبر من المسموح.',
  'ORD-014': 'لا يمكن إعادة فتح طلب ملغي.',

  'ORD-015': 'لا يمكن شحن الطلب قبل تأكيد الدفع.',

  // PAY: payments
  'PAY-001': 'انتهت مهلة الدفع وتم إلغاء الطلب.',
  'PAY-002': 'تم تأكيد الدفع لهذا الطلب بالفعل.',
  'PAY-003': 'رقم عملية التحويل مطلوب.',
  'PAY-004': 'هذا الطلب لا ينتظر دفعًا الآن.',
  'PAY-005': 'رقم العملية مستخدم في طلب آخر. تأكد من الرقم.',
  'PAY-006': 'لم نتمكن من تأكيد الدفع. يمكنك رفع إثبات جديد أو التواصل معنا.',

  'PAY-007': 'هذا الطلب بانتظار موافقة المتجر.',
  'PAY-008': 'انتهت مهلة موافقة المتجر وتم إلغاء الطلب.',

  // UPL: uploads
  'UPL-001': 'نوع الملف غير مدعوم. استخدم صورة JPG أو PNG أو WebP.',
  'UPL-002': 'حجم الملف كبير. الحد الأقصى 5 ميجابايت.',
  'UPL-003': 'تعذّر رفع الملف. حاول مرة أخرى.',

  // ADM: admin
  'ADM-001': 'هذه العملية للمسؤول فقط.',
  'ADM-002': 'فعّل التحقق بخطوتين للدخول إلى لوحة التحكم.',
  'ADM-003': 'أكّد هويتك برمز التحقق لإتمام هذا الإجراء.',
  'ADM-004': 'لا يمكن حذف منتج سبق طلبه. يمكنك أرشفته بدلًا من ذلك.',
  'ADM-005': 'القسم يحتوي على منتجات. اختر قسمًا لنقلها إليه أولًا.',
  'ADM-006': 'الاسم المختصر للقسم غير صالح. استخدم حروفًا إنجليزية صغيرة وأرقامًا وشرطات فقط.',
  'ADM-007': 'البيانات غير صالحة. راجع الحقول المظلّلة.',
  'ADM-008': 'لا يمكن تعديل هذا الإعداد.',

  // SYS: system
  'SYS-001': 'حدث خطأ غير متوقع. رقم المرجع: {ref}. حاول مرة أخرى أو تواصل معنا.',
  'SYS-002': 'تعذّر الاتصال بالإنترنت. تحقّق من الاتصال وحاول مرة أخرى.',
  'SYS-003': 'طلبات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.',
  'SYS-004': 'الموقع تحت الصيانة حاليًا. نعود قريبًا.',

  // ANL: analytics
  'ANL-001': 'لا توجد بيانات كافية للتوقع بعد. نجمع البيانات وسيظهر التوقع قريبًا.',
} as const

export type ErrorCode = keyof typeof ERROR_CATALOGUE

export function generateErrorRef(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(4)
    crypto.getRandomValues(bytes)
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  }
  return Math.random().toString(36).slice(2, 10).padEnd(8, '0')
}

export function formatErrorMessage(
  code: ErrorCode,
  params?: Record<string, string | number>,
  ref?: string,
): string {
  const template = ERROR_CATALOGUE[code] || ERROR_CATALOGUE['SYS-001']
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
    if (key === 'ref') return ref || '00000000'
    if (params && key in params && params[key] !== undefined && params[key] !== '') {
      return String(params[key])
    }
    if (key === 'name') return 'هذا المنتج'
    if (key === 'left') return ''
    return match
  })
}

export class AppError extends Error {
  readonly code: ErrorCode
  readonly ref: string
  readonly params?: Record<string, string | number>
  readonly raw?: unknown

  constructor(
    code: ErrorCode,
    options?: {
      ref?: string
      params?: Record<string, string | number>
      raw?: unknown
    },
  ) {
    const ref = options?.ref || generateErrorRef()
    const message = formatErrorMessage(code, options?.params, ref)
    super(message)
    this.name = 'AppError'
    this.code = code
    this.ref = ref
    this.params = options?.params
    this.raw = options?.raw

    // Restore prototype chain for instanceof checks
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

function mapAuthCode(authCode: string): ErrorCode | null {
  const normalized = authCode.toLowerCase().trim()
  switch (normalized) {
    case 'invalid_credentials':
    case 'user_not_found':
    case 'email_not_confirmed':
    case 'invalid_grant':
    case 'user_banned':
      return 'AUTH-001'
    case 'over_request_rate_limit':
      return 'AUTH-002'
    case 'captcha_failed':
      return 'AUTH-003'
    case 'session_expired':
    case 'session_not_found':
    case 'refresh_token_not_found':
    case 'refresh_token_already_used':
    case 'bad_jwt':
    case 'no_authorization':
      return 'AUTH-004'
    case 'insufficient_aal':
      return 'AUTH-005'
    case 'mfa_verification_failed':
    case 'mfa_challenge_expired':
    case 'mfa_verification_rejected':
      return 'AUTH-006'
    case 'reauthentication_needed':
    case 'reauthentication_not_valid':
      return 'AUTH-007'
    case 'weak_password':
      return 'AUTH-008'
    case 'otp_expired':
    case 'flow_state_expired':
    case 'flow_state_not_found':
      return 'AUTH-009'
    case 'user_already_exists':
    case 'email_exists':
      return 'AUTH-010'
    case 'over_email_send_rate_limit':
    case 'over_sms_send_rate_limit':
      return 'AUTH-012'
    default:
      return null
  }
}

export function toAppError(error: unknown, fallbackCode: ErrorCode = 'SYS-001'): AppError {
  if (error instanceof AppError) {
    return error
  }

  const ref = generateErrorRef()
  let code: ErrorCode = fallbackCode
  const params: Record<string, string | number> = {}

  if (typeof error === 'string') {
    const trimmed = error.trim()
    if (trimmed in ERROR_CATALOGUE) {
      code = trimmed as ErrorCode
    } else {
      const authCode = mapAuthCode(trimmed)
      if (authCode) {
        code = authCode
      }
    }
  } else if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>

    // 1. Database hint check (Postgres / Supabase RPC error)
    if (typeof err.hint === 'string' && err.hint.trim() in ERROR_CATALOGUE) {
      code = err.hint.trim() as ErrorCode

      if (typeof err.detail === 'string') {
        const leftMatch = err.detail.match(/left=(\d+)/)
        if (leftMatch) {
          params.left = Number(leftMatch[1])
        }
      }
    }
    // 2. Direct code check (either catalogue code or Supabase Auth code)
    else if (typeof err.code === 'string') {
      const codeStr = err.code.trim()
      if (codeStr in ERROR_CATALOGUE) {
        code = codeStr as ErrorCode
      } else {
        const mappedAuth = mapAuthCode(codeStr)
        if (mappedAuth) {
          code = mappedAuth
        }
      }
    }

    // 3. HTTP status checks
    if (code === fallbackCode && typeof err.status === 'number') {
      if (err.status === 401) code = 'AUTH-004'
      else if (err.status === 403) code = 'AUTH-011'
      else if (err.status === 429) code = 'SYS-003'
      else if (err.status >= 500 && err.status <= 599) code = 'SYS-001'
    }

    // 4. SQLSTATE 42501 check
    if (code === fallbackCode && (err.code === '42501' || err.sqlstate === '42501')) {
      code = 'AUTH-011'
    }

    // 5. Network errors
    if (code === fallbackCode) {
      const message = typeof err.message === 'string' ? err.message.toLowerCase() : ''
      const name = typeof err.name === 'string' ? err.name : ''
      if (
        name === 'NetworkError' ||
        message.includes('network') ||
        message.includes('failed to fetch') ||
        message.includes('net::err') ||
        (typeof navigator !== 'undefined' && navigator.onLine === false)
      ) {
        code = 'SYS-002'
      }
    }

    // 6. Inspect error message for specific markers (Turnstile, rate limit)
    if (code === fallbackCode) {
      const message = typeof err.message === 'string' ? err.message.toLowerCase() : ''
      if (message.includes('captcha') || message.includes('turnstile')) {
        code = 'AUTH-003'
      } else if (message.includes('rate limit') || message.includes('too many requests')) {
        code = 'SYS-003'
      }
    }

    // Extract product name if provided in params or error object
    if (typeof err.name === 'string' && err.name !== 'Error' && err.name !== 'AppError') {
      params.name = err.name
    }
  }

  const appError = new AppError(code, { ref, params, raw: error })

  // Log details to the console in development only
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    // eslint-disable-next-line no-console
    console.error(`[AppError ${appError.code}] ref=${appError.ref}`, error)
  }

  return appError
}

export interface ErrorMessageProps {
  error?: AppError | unknown
  code?: ErrorCode
  refId?: string
  params?: Record<string, string | number>
  className?: string
}

export function ErrorMessage({
  error,
  code,
  refId,
  params,
  className = '',
}: ErrorMessageProps): ReactNode {
  let appError: AppError
  if (error instanceof AppError) {
    appError = error
  } else if (error) {
    appError = toAppError(error)
  } else if (code) {
    appError = new AppError(code, { ref: refId, params })
  } else {
    appError = new AppError('SYS-001', { ref: refId })
  }

  return createElement(
    'div',
    {
      role: 'alert',
      'aria-live': 'assertive',
      className: `space-y-1 text-center sm:text-start ${className}`,
    },
    createElement('p', { className: 'text-body font-medium text-text' }, appError.message),
    createElement(
      'div',
      {
        className:
          'flex flex-wrap items-center justify-center gap-2 text-caption text-text-muted sm:justify-start',
      },
      createElement('span', { dir: 'ltr', className: 'font-mono' }, `رمز الخطأ: ${appError.code}`),
      appError.code === 'SYS-001'
        ? createElement(
            'span',
            { dir: 'ltr', className: 'font-mono' },
            `رقم المرجع: ${appError.ref}`,
          )
        : null,
    ),
  )
}

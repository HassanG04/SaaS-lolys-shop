import type { SettingKey } from './types'
import { validateInstaPayLink } from '@/lib/qr'

export const ALLOWED_SETTING_KEYS: readonly SettingKey[] = [
  'shop_name_ar',
  'shop_name_en',
  'tagline_ar',
  'phone',
  'whatsapp',
  'instagram',
  'announcement_ar',
  'hero_title_ar',
  'hero_subtitle_ar',
  'sale_percent',
  'payment_methods_enabled',
  'instapay_qr_path',
  'instapay_handle',
  'instapay_link',
  'returns_text_ar',
  'payment_window_hours',
  'pending_order_limit',
] as const

const INSTAGRAM_URL_REGEX = /^https:\/\/[A-Za-z0-9._~:/?#[\]@!$&'()*+,;=-]+$/
const STORAGE_PATH_REGEX = /^(settings)\/[A-Za-z0-9/_-]+\.(webp|jpg|jpeg|png)$/

export function isAllowedSettingKey(key: string): key is SettingKey {
  return (ALLOWED_SETTING_KEYS as readonly string[]).includes(key)
}

export function validateShopName(val: unknown): boolean {
  return typeof val === 'string' && val.trim().length >= 1 && val.length <= 60
}

export function validateTagline(val: unknown): boolean {
  return typeof val === 'string' && val.length <= 120
}

export function validatePhone(val: unknown): boolean {
  return typeof val === 'string' && val.length <= 20
}

export function validateWhatsapp(val: unknown): boolean {
  return typeof val === 'string' && val.length <= 20
}

export function validateInstagram(val: unknown): boolean {
  if (typeof val !== 'string' || val.length > 100) return false
  if (val.trim() === '') return true
  return INSTAGRAM_URL_REGEX.test(val)
}

export function validateAnnouncement(val: unknown): boolean {
  return typeof val === 'string' && val.length <= 200
}

export function validateHeroTitle(val: unknown): boolean {
  return typeof val === 'string' && val.length <= 120
}

export function validateHeroSubtitle(val: unknown): boolean {
  return typeof val === 'string' && val.length <= 240
}

export function validateSalePercent(val: unknown): boolean {
  if (typeof val !== 'number' || !Number.isFinite(val)) return false
  return Number.isInteger(val) && val >= 0 && val <= 90
}

export function validatePaymentMethods(val: unknown): boolean {
  if (!Array.isArray(val) || val.length === 0 || val.length > 2) return false
  return val.every((item) => item === 'cod' || item === 'instapay_qr')
}

export function validateInstaPayQrPath(val: unknown): boolean {
  if (typeof val !== 'string') return false
  if (val === '') return true
  return STORAGE_PATH_REGEX.test(val)
}

export function validateInstaPayHandle(val: unknown): boolean {
  return typeof val === 'string' && val.length <= 60
}

export function validateInstaPayLinkSetting(val: unknown): boolean {
  if (typeof val !== 'string') return false
  return validateInstaPayLink(val).valid
}

export function validateReturnsText(val: unknown): boolean {
  return typeof val === 'string' && val.length <= 2000
}

export function validatePaymentWindowHours(val: unknown): boolean {
  if (typeof val !== 'number' || !Number.isFinite(val)) return false
  return Number.isInteger(val) && val >= 1 && val <= 72
}

export function validatePendingOrderLimit(val: unknown): boolean {
  if (typeof val !== 'number' || !Number.isFinite(val)) return false
  return Number.isInteger(val) && val >= 1 && val <= 10
}

export function validateSettingValue(
  key: string,
  value: unknown,
): { valid: boolean; errorHint?: 'ADM-007' | 'ADM-008' } {
  if (!isAllowedSettingKey(key)) {
    return { valid: false, errorHint: 'ADM-008' }
  }

  let valid = false
  switch (key) {
    case 'shop_name_ar':
    case 'shop_name_en':
      valid = validateShopName(value)
      break
    case 'tagline_ar':
      valid = validateTagline(value)
      break
    case 'phone':
      valid = validatePhone(value)
      break
    case 'whatsapp':
      valid = validateWhatsapp(value)
      break
    case 'instagram':
      valid = validateInstagram(value)
      break
    case 'announcement_ar':
      valid = validateAnnouncement(value)
      break
    case 'hero_title_ar':
      valid = validateHeroTitle(value)
      break
    case 'hero_subtitle_ar':
      valid = validateHeroSubtitle(value)
      break
    case 'sale_percent':
      valid = validateSalePercent(value)
      break
    case 'payment_methods_enabled':
      valid = validatePaymentMethods(value)
      break
    case 'instapay_qr_path':
      valid = validateInstaPayQrPath(value)
      break
    case 'instapay_handle':
      valid = validateInstaPayHandle(value)
      break
    case 'instapay_link':
      valid = validateInstaPayLinkSetting(value)
      break
    case 'returns_text_ar':
      valid = validateReturnsText(value)
      break
    case 'payment_window_hours':
      valid = validatePaymentWindowHours(value)
      break
    case 'pending_order_limit':
      valid = validatePendingOrderLimit(value)
      break
  }

  return valid ? { valid: true } : { valid: false, errorHint: 'ADM-007' }
}

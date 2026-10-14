import { isValidEgyptianPhone, normalizeEgyptianPhone } from '@/features/checkout/validation'

export function getWhatsAppNumber(phone: string): string | null {
  const normalized = normalizeEgyptianPhone(phone)
  return isValidEgyptianPhone(normalized) ? '20' + normalized.slice(1) : null
}

/** A draft link only. The owner reviews and sends the message in WhatsApp. */
export function buildApprovalWhatsAppUrl(
  phone: string,
  message: string,
): string | null {
  const number = getWhatsAppNumber(phone)
  if (!number) return null
  return 'https://wa.me/' + number + '?text=' + encodeURIComponent(message)
}

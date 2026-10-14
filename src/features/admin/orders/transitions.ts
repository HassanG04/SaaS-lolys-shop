import type {
  OrderStatus,
  PaymentStatus,
  DeliveryMethod,
  PaymentMethod,
} from '@/features/orders/types'

/**
 * Standard progression path: pending -> confirmed -> shipped -> delivered.
 * Cancellation is permitted from any active state.
 * Cancelled orders are terminal (cannot be re-opened).
 * ORD-015: instapay_qr orders cannot become shipped or delivered unless payment_status = paid.
 * Orders awaiting approval cannot use standard transitions (must use approve/reject RPCs).
 */
export function getAllowedTransitions(
  currentStatus: OrderStatus,
  paymentInfo?: { payment_method: PaymentMethod; payment_status: PaymentStatus },
): OrderStatus[] {
  if (paymentInfo?.payment_status === 'awaiting_approval') {
    return []
  }

  let transitions: OrderStatus[] = []
  switch (currentStatus) {
    case 'pending':
      transitions = ['confirmed', 'cancelled']
      break
    case 'confirmed':
      transitions = ['shipped', 'cancelled']
      break
    case 'shipped':
      transitions = ['delivered', 'cancelled']
      break
    case 'delivered':
      transitions = ['cancelled']
      break
    case 'cancelled':
      transitions = []
      break
    default:
      transitions = []
  }

  if (
    paymentInfo &&
    paymentInfo.payment_method === 'instapay_qr' &&
    paymentInfo.payment_status !== 'paid'
  ) {
    transitions = transitions.filter((s) => s !== 'shipped' && s !== 'delivered')
  }

  return transitions
}

/**
 * Validates whether a state transition from `from` to `to` is allowed.
 */
export function isTransitionAllowed(
  from: OrderStatus,
  to: OrderStatus,
  paymentInfo?: { payment_method: PaymentMethod; payment_status: PaymentStatus },
): boolean {
  if (from === to) return false
  return getAllowedTransitions(from, paymentInfo).includes(to)
}

export function formatEgyptianPhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('20')) {
    return digits
  }
  if (digits.startsWith('0')) {
    return `20${digits.slice(1)}`
  }
  return `20${digits}`
}

export function getOrderWhatsAppApprovalUrl(order: {
  id: number
  ship_name: string
  ship_phone: string
}): string {
  const phone = formatEgyptianPhoneForWhatsApp(order.ship_phone)
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const payLink = `${origin}/pay/${order.id}`
  const message = `أهلًا ${order.ship_name}، تمت الموافقة على طلبك رقم #${order.id}. ادفع عبر الرابط وارفع صورة التحويل: ${payLink}`
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'قيد الانتظار',
  confirmed: 'مؤكد',
  shipped: 'تم الشحن',
  delivered: 'تم التوصيل',
  cancelled: 'ملغي',
}

export const ORDER_STATUS_COLORS: Record<
  OrderStatus,
  { bg: string; text: string; borderClass: string; dot: string }
> = {
  pending: {
    bg: 'bg-surface-tint',
    text: 'text-caramel',
    borderClass: 'border-caramel',
    dot: 'bg-caramel',
  },
  confirmed: {
    bg: 'bg-surface-tint',
    text: 'text-brand',
    borderClass: 'border-brand',
    dot: 'bg-brand',
  },
  shipped: {
    bg: 'bg-surface-tint',
    text: 'text-warning',
    borderClass: 'border-warning',
    dot: 'bg-warning',
  },
  delivered: {
    bg: 'bg-surface-tint',
    text: 'text-success',
    borderClass: 'border-success',
    dot: 'bg-success',
  },
  cancelled: {
    bg: 'bg-surface-2',
    text: 'text-text-muted',
    borderClass: 'border-border',
    dot: 'bg-text-muted',
  },
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'غير مدفوع',
  awaiting_approval: 'بانتظار الموافقة',
  awaiting_proof: 'بانتظار الإثبات',
  under_review: 'قيد المراجعة',
  paid: 'مدفوع',
  rejected: 'مرفوض',
}

export const DELIVERY_METHOD_LABELS: Record<DeliveryMethod, string> = {
  egypt_post: 'البريد المصري',
  representative: 'مندوب خاص',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cod: 'الدفع عند الاستلام',
  instapay_qr: 'إنستاباي (InstaPay)',
}

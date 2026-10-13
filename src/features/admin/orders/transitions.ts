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
 */
export function getAllowedTransitions(currentStatus: OrderStatus): OrderStatus[] {
  switch (currentStatus) {
    case 'pending':
      return ['confirmed', 'cancelled']
    case 'confirmed':
      return ['shipped', 'cancelled']
    case 'shipped':
      return ['delivered', 'cancelled']
    case 'delivered':
      return ['cancelled']
    case 'cancelled':
      return []
    default:
      return []
  }
}

/**
 * Validates whether a state transition from `from` to `to` is allowed.
 */
export function isTransitionAllowed(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return false
  return getAllowedTransitions(from).includes(to)
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

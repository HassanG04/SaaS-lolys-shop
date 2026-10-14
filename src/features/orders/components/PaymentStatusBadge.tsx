import type { PaymentStatus } from '../types'

interface PaymentStatusBadgeProps {
  status: PaymentStatus
}

interface BadgeConfig {
  label: string
  className: string
  dotClass: string
}

const BADGE_MAP: Record<PaymentStatus, BadgeConfig> = {
  unpaid: {
    label: 'غير مدفوع',
    className: 'border-border bg-surface-2 text-text-muted',
    dotClass: 'bg-text-muted',
  },
  awaiting_approval: {
    label: 'بانتظار موافقة المتجر',
    className: 'border-warning bg-surface-tint text-warning',
    dotClass: 'bg-warning',
  },
  awaiting_proof: {
    label: 'بانتظار إيصال الدفع',
    className: 'border-warning bg-surface-tint text-warning',
    dotClass: 'bg-warning',
  },
  under_review: {
    label: 'قيد مراجعة الدفع',
    className: 'border-caramel bg-surface-tint text-caramel',
    dotClass: 'bg-caramel',
  },
  paid: {
    label: 'تم الدفع',
    className: 'border-success bg-surface-tint text-success',
    dotClass: 'bg-success',
  },
  rejected: {
    label: 'مرفوض',
    className: 'border-danger bg-surface-tint text-danger',
    dotClass: 'bg-danger',
  },
}

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  const config = BADGE_MAP[status] || BADGE_MAP.unpaid

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-0.5 text-caption font-semibold ${config.className}`}
    >
      <span className={`size-1.5 rounded-pill ${config.dotClass}`} aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  )
}

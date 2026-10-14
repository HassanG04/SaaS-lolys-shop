import type { OrderStatus, PaymentMethod, PaymentStatus } from '../types'
import { useLanguage } from '@/i18n/LanguageProvider'

interface OrderStatusTimelineProps {
  status: OrderStatus
  paymentMethod?: PaymentMethod
  paymentStatus?: PaymentStatus
}

interface Step {
  key: OrderStatus | PaymentStatus
  label: string
}

const ORDER_STEPS: Step[] = [
  { key: 'pending', label: 'قيد الانتظار' },
  { key: 'confirmed', label: 'تم التأكيد' },
  { key: 'shipped', label: 'تم الشحن' },
  { key: 'delivered', label: 'تم التوصيل' },
]

const STEP_ORDER: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  shipped: 2,
  delivered: 3,
}

export function OrderStatusTimeline({ status, paymentMethod, paymentStatus }: OrderStatusTimelineProps) {
  const { t } = useLanguage()
  const steps: Step[] = paymentMethod === 'instapay_qr'
    ? [
        { key: 'awaiting_approval', label: t('paystatus.awaiting_approval') },
        { key: 'awaiting_proof', label: t.paystatus.awaiting },
        { key: 'under_review', label: t.paystatus.review },
        { key: 'paid', label: t.paystatus.paid },
        { key: 'shipped', label: t.order.shipped },
        { key: 'delivered', label: t.order.delivered },
      ]
    : ORDER_STEPS
  if (status === 'cancelled') {
    return (
      <div
        role="region"
        aria-label="حالة الطلب"
        className="rounded-chip border border-border bg-surface-2 px-3 py-2 text-small font-medium text-text-muted flex items-center gap-2"
      >
        <span className="size-2.5 rounded-pill bg-danger inline-block" aria-hidden="true" />
        <span>تم إلغاء الطلب</span>
      </div>
    )
  }

  const paymentStep = paymentStatus === 'rejected' ? 'awaiting_proof' : paymentStatus
  const currentStepIdx = paymentMethod === 'instapay_qr'
    ? Math.max(0, steps.findIndex((step) => step.key === (status === 'shipped' || status === 'delivered' ? status : paymentStep)))
    : STEP_ORDER[status] ?? 0

  return (
    <div role="region" aria-label="مراحل حالة الطلب" className="w-full py-2">
      <ol className="grid gap-3 sm:flex sm:gap-0 sm:items-start sm:justify-between relative w-full">
        {steps.map((step, idx) => {
          const isDone = idx < currentStepIdx
          const isCurrent = idx === currentStepIdx

          return (
            <li
              key={step.key}
              className="flex-1 flex sm:flex-col items-center relative sm:text-center"
              aria-current={isCurrent ? 'step' : undefined}
            >
              {/* Connector line between steps */}
              {idx > 0 && (
                <div
                  aria-hidden="true"
                  className={`hidden sm:block absolute top-3.5 -start-1/2 w-full h-0.5 -translate-y-1/2 transition-colors ${
                    idx <= currentStepIdx ? 'bg-brand' : 'bg-border'
                  }`}
                />
              )}

              {/* Step indicator node */}
              <div
                className={`relative z-10 flex size-7 items-center justify-center rounded-pill text-caption font-bold transition-all ${
                  isDone
                    ? 'bg-brand text-brand-contrast'
                    : isCurrent
                      ? 'border-2 border-brand bg-surface text-brand'
                      : 'border border-border bg-surface-2 text-text-muted'
                }`}
                aria-hidden="true"
              >
                {isDone ? (
                  <svg
                    className="size-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>

              {/* Step label */}
              <span
                className={`ms-2 sm:ms-0 sm:mt-2 text-caption sm:text-small transition-colors ${
                  isCurrent
                    ? 'font-bold text-brand'
                    : isDone
                      ? 'font-medium text-text'
                      : 'text-text-muted'
                }`}
              >
                {step.label}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

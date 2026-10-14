import type { OrderStatus } from '../types'

interface OrderStatusTimelineProps {
  status: OrderStatus
  paymentStatus?: string | null
}

interface Step {
  key: OrderStatus
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

export function OrderStatusTimeline({ status, paymentStatus }: OrderStatusTimelineProps) {
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

  const currentStepIdx = STEP_ORDER[status] ?? 0

  return (
    <div role="region" aria-label="مراحل حالة الطلب" className="w-full py-2">
      <ol className="flex items-center justify-between relative w-full">
        {ORDER_STEPS.map((step, idx) => {
          const isDone = idx < currentStepIdx
          const isCurrent = idx === currentStepIdx

          return (
            <li
              key={step.key}
              className="flex-1 flex flex-col items-center relative text-center"
              aria-current={isCurrent ? 'step' : undefined}
            >
              {/* Connector line between steps */}
              {idx > 0 && (
                <div
                  aria-hidden="true"
                  className={`absolute top-3.5 -start-1/2 w-full h-0.5 -translate-y-1/2 transition-colors ${
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
                className={`mt-2 text-caption sm:text-small transition-colors ${
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
      {paymentStatus === 'awaiting_approval' && (
        <p className="mt-3 text-center text-small text-text-muted border-t border-border/60 pt-2">
          وصل طلبك للمتجر. سنراجعه ونرسل لك رابط الدفع قريبًا.
        </p>
      )}
    </div>
  )
}

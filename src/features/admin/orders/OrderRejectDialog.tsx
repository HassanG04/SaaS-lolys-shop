import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { ErrorMessage } from '@/lib/errors'
import { useToast } from '@/components/ui/ToastProvider'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useAdminRejectOrder } from './hooks'
import type { AdminOrder } from './types'

export interface OrderRejectDialogProps {
  open: boolean
  order: AdminOrder | null
  onClose: () => void
  onSuccess?: () => void
}

export function OrderRejectDialog({ open, order, onClose, onSuccess }: OrderRejectDialogProps) {
  const { lang } = useLanguage()
  const isAr = lang === 'ar'
  const toast = useToast()
  const rejectMutation = useAdminRejectOrder()

  const [reason, setReason] = useState('')
  const [error, setError] = useState<unknown | null>(null)

  if (!open || !order) return null

  const handleConfirm = async () => {
    if (!reason.trim()) return
    setError(null)
    try {
      await rejectMutation.mutateAsync({
        id: order.id,
        reason: reason.trim(),
      })

      toast.success(
        isAr
          ? 'تم رفض الطلب واسترجاع المخزون بنجاح'
          : 'Order rejected and stock restocked successfully',
      )
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err)
    }
  }

  return (
    <Dialog
      open
      title={isAr ? `رفض الطلب #${order.id}` : `Reject Order #${order.id}`}
      onClose={onClose}
    >
      <div className="space-y-4 max-w-md">
        {error ? <ErrorMessage error={error} /> : null}

        <div
          role="alert"
          className="rounded-chip border border-danger/30 bg-surface-tint p-4 space-y-2 text-danger"
        >
          <p className="font-semibold text-small">
            {isAr
              ? 'تنبيه: سيتم إلغاء الطلب واسترجاع المنتجات إلى المخزون'
              : 'Warning: The order will be cancelled and items restocked'}
          </p>
          <p className="text-caption text-text-muted">
            {isAr
              ? 'رفض الطلب نهائي. يرجى كتابة سبب واضح ومحدد للرفض للرجوع إليه في سجل العمليات.'
              : 'Rejecting an order is permanent. Please provide a clear rejection reason for the audit log.'}
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="reject-reason-input" className="block text-small font-semibold text-text">
            {isAr ? 'سبب الرفض' : 'Rejection Reason'} <span className="text-danger">*</span>
          </label>
          <textarea
            id="reject-reason-input"
            rows={3}
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              isAr
                ? 'مثال: تعذر التواصل مع العميل، أو العنوان خارج نطاق التوصيل…'
                : 'e.g. Unable to reach customer, or address out of delivery zone...'
            }
            className="w-full rounded-chip border border-border-input bg-bg p-3 text-small text-text placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-focus"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="ghost" onClick={onClose} disabled={rejectMutation.isPending}>
            {isAr ? 'تراجع' : 'Cancel'}
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            disabled={!reason.trim() || rejectMutation.isPending}
          >
            {rejectMutation.isPending
              ? isAr
                ? 'جارٍ الرفض...'
                : 'Rejecting...'
              : isAr
                ? 'تأكيد الرفض والإلغاء'
                : 'Confirm Rejection'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

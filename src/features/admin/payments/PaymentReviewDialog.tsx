import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { ErrorMessage } from '@/lib/errors'
import { useToast } from '@/components/ui/ToastProvider'
import { useLanguage } from '@/i18n/LanguageProvider'
import { formatEGP } from '@/lib/format'
import { useReviewPayment } from './hooks'
import type { AdminPaymentOrder } from './types'

export interface PaymentReviewDialogProps {
  open: boolean
  order: AdminPaymentOrder | null
  action: 'approve' | 'reject'
  onClose: () => void
  onSuccess?: () => void
}

export function PaymentReviewDialog({
  open,
  order,
  action,
  onClose,
  onSuccess,
}: PaymentReviewDialogProps) {
  const { lang } = useLanguage()
  const isAr = lang === 'ar'
  const toast = useToast()
  const reviewMutation = useReviewPayment()

  const [note, setNote] = useState('')
  const [error, setError] = useState<unknown | null>(null)

  if (!open || !order) return null

  const isApprove = action === 'approve'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      await reviewMutation.mutateAsync({
        orderId: order.id,
        approve: isApprove,
        note: note.trim() || null,
      })

      toast.success(
        isApprove
          ? isAr
            ? `تم قبول وتأكيد دفع الطلب #${order.id} بنجاح`
            : `Payment for Order #${order.id} approved successfully`
          : isAr
            ? `تم رفض إيصال الطلب #${order.id} وإتاحة إعادة الرفع للعميل`
            : `Payment proof for Order #${order.id} rejected`,
      )

      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err)
    }
  }

  const title = isApprove
    ? isAr
      ? `تأكيد قبول الدفع للطلب #${order.id}`
      : `Confirm Payment Approval for Order #${order.id}`
    : isAr
      ? `رفض إيصال الدفع للطلب #${order.id}`
      : `Reject Payment Proof for Order #${order.id}`

  return (
    <Dialog open title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        {error ? <ErrorMessage error={error} /> : null}

        {/* Order Details Mini-Card */}
        <div className="rounded-chip border border-border bg-surface-2 p-3 space-y-1 text-small">
          <div className="flex justify-between">
            <span className="text-text-muted">{isAr ? 'العميل:' : 'Customer:'}</span>
            <span className="font-semibold text-text">{order.ship_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">{isAr ? 'المبلغ المطلوب:' : 'Amount:'}</span>
            <span className="font-bold text-brand">{formatEGP(order.total, lang)}</span>
          </div>
          {order.payment_reference && (
            <div className="flex justify-between">
              <span className="text-text-muted">{isAr ? 'رقم التحويل:' : 'Reference:'}</span>
              <code dir="ltr" className="font-mono text-text">
                {order.payment_reference}
              </code>
            </div>
          )}
        </div>

        {/* Explanatory Info / Warning */}
        {isApprove ? (
          <p className="text-body text-text">
            {isAr
              ? 'هل تأكدت من مطابقة المبلغ ورقم التحويل في حسابك البنكي أو إنستاباي؟ سيتم تحويل حالة الدفع إلى «مدفوع» وتحديث الطلب.'
              : 'Have you verified that the amount and transfer reference match your bank account? The payment status will become "paid".'}
          </p>
        ) : (
          <div
            role="alert"
            className="rounded-chip border border-danger/30 bg-surface-tint p-3 space-y-1 text-danger text-small"
          >
            <p className="font-semibold">
              {isAr ? 'تنبيه بشأن رفض الإيصال:' : 'Note on Rejecting Proof:'}
            </p>
            <p className="text-caption text-text-muted">
              {isAr
                ? 'سيتم تحويل حالة الدفع إلى «مرفوض»، مما يتيح للعميل إعادة رفع إيصال صحيح من صفحة الطلب قبل انتهاء مهلة الدفع.'
                : 'The status will be updated to "rejected", allowing the customer to upload a valid proof before deadline.'}
            </p>
          </div>
        )}

        {/* Note input */}
        <div className="space-y-1">
          <label htmlFor="review-note" className="block text-small font-medium text-text">
            {isApprove
              ? isAr
                ? 'ملاحظة داخلية (اختياري):'
                : 'Internal Note (Optional):'
              : isAr
                ? 'سبب الرفض (يوصى بكتابة السبب للعميل والإدارة):'
                : 'Rejection Reason:'}
          </label>
          <textarea
            id="review-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              isApprove
                ? isAr
                  ? 'ملاحظات إضافية...'
                  : 'Additional notes...'
                : isAr
                  ? 'مثال: المبلغ المحول غير مطابق، الصورة غير واضحة، إلخ.'
                  : 'E.g., Transfer amount mismatch, image unclear, etc.'
            }
            maxLength={500}
            className="w-full rounded-chip border border-border-input bg-surface p-2.5 text-body text-text placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={reviewMutation.isPending}
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button
            type="submit"
            variant={isApprove ? 'primary' : 'danger'}
            disabled={reviewMutation.isPending}
          >
            {reviewMutation.isPending
              ? isAr
                ? 'جارٍ الحفظ...'
                : 'Saving...'
              : isApprove
                ? isAr
                  ? 'تأكيد قبول الدفع'
                  : 'Approve Payment'
                : isAr
                  ? 'تأكيد رفض الإيصال'
                  : 'Reject Payment'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

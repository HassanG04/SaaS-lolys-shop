import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ErrorMessage } from '@/lib/errors'
import { useToast } from '@/components/ui/ToastProvider'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useUpdateOrderStatus } from './hooks'
import { ORDER_STATUS_LABELS } from './transitions'
import type { AdminOrder } from './types'
import type { OrderStatus } from '@/features/orders/types'

export interface OrderStatusDialogProps {
  open: boolean
  order: AdminOrder | null
  targetStatus: OrderStatus | null
  onClose: () => void
  onSuccess?: (updated: AdminOrder) => void
}

export function OrderStatusDialog({
  open,
  order,
  targetStatus,
  onClose,
  onSuccess,
}: OrderStatusDialogProps) {
  const { lang } = useLanguage()
  const isAr = lang === 'ar'
  const toast = useToast()
  const updateMutation = useUpdateOrderStatus()

  const [error, setError] = useState<unknown | null>(null)
  const [trackingNumber, setTrackingNumber] = useState(order?.tracking_number ?? '')
  const [repName, setRepName] = useState(order?.rep_name ?? '')
  const [repPhone, setRepPhone] = useState(order?.rep_phone ?? '')

  if (!open || !order || !targetStatus) return null

  const isCancel = targetStatus === 'cancelled'
  const isShipping = targetStatus === 'shipped'
  const targetLabel = ORDER_STATUS_LABELS[targetStatus] ?? targetStatus

  const handleConfirm = async () => {
    setError(null)
    try {
      const payload: {
        status: OrderStatus
        tracking_number?: string | null
        rep_name?: string | null
        rep_phone?: string | null
      } = {
        status: targetStatus,
      }

      if (isShipping) {
        if (order.delivery_method === 'egypt_post') {
          payload.tracking_number = trackingNumber.trim() || null
        } else if (order.delivery_method === 'representative') {
          payload.rep_name = repName.trim() || null
          payload.rep_phone = repPhone.trim() || null
        }
      }

      const updated = await updateMutation.mutateAsync({
        id: order.id,
        payload,
      })

      toast.success(
        isCancel
          ? isAr
            ? 'تم إلغاء الطلب واسترجاع المخزون بنجاح'
            : 'Order cancelled and stock returned successfully'
          : isAr
            ? `تم تحديث حالة الطلب إلى «${targetLabel}»`
            : `Order status updated to ${targetStatus}`,
      )
      onSuccess?.(updated)
      onClose()
    } catch (err) {
      setError(err)
    }
  }

  const title = isCancel
    ? isAr
      ? `تأكيد إلغاء الطلب #${order.id}`
      : `Confirm Cancelling Order #${order.id}`
    : isAr
      ? `تغيير حالة الطلب #${order.id} إلى «${targetLabel}»`
      : `Change Order #${order.id} Status to ${targetLabel}`

  return (
    <Dialog open title={title} onClose={onClose}>
      <div className="space-y-4 max-w-md">
        {error ? <ErrorMessage error={error} /> : null}

        {isCancel ? (
          <div
            role="alert"
            className="rounded-chip border border-danger/30 bg-surface-tint p-4 space-y-2 text-danger"
          >
            <p className="font-semibold text-small">
              {isAr
                ? 'تحذير هام: هذا الإجراء نهائي ولا يمكن التراجع عنه!'
                : 'Important Warning: This action is final and irreversible!'}
            </p>
            <p className="text-caption text-text-muted">
              {isAr
                ? 'إلغاء الطلب نهائي تمامًا ولن يمكن إعادة فتحه لاحقًا (ORD-014). سيتم إرجاع جميع كميات المنتجات تلقائيًا إلى رصيد المخزون في قاعدة البيانات.'
                : 'Cancelling this order is permanent; it cannot be reopened later (ORD-014). All product quantities will automatically be restocked in the database.'}
            </p>
          </div>
        ) : (
          <p className="text-body text-text">
            {isAr
              ? `هل أنت متأكد من تغيير حالة الطلب #${order.id} من «${ORDER_STATUS_LABELS[order.status]}» إلى «${targetLabel}»؟`
              : `Are you sure you want to transition Order #${order.id} from ${ORDER_STATUS_LABELS[order.status]} to ${targetLabel}?`}
          </p>
        )}

        {isShipping ? (
          <div className="rounded-chip border border-border bg-surface-2 p-3 space-y-3">
            <p className="text-small font-semibold text-brand">
              {isAr ? 'بيانات الشحن والتوصيل للطلب:' : 'Shipping and Fulfillment Information:'}
            </p>

            {order.delivery_method === 'egypt_post' ? (
              <Input
                label={isAr ? 'رقم التتبع (البريد المصري)' : 'Tracking Number (Egypt Post)'}
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder={isAr ? 'أدخل رقم تتبع الشحنة...' : 'Enter tracking number...'}
                maxLength={100}
              />
            ) : (
              <div className="space-y-3">
                <Input
                  label={isAr ? 'اسم المندوب' : 'Representative Name'}
                  value={repName}
                  onChange={(e) => setRepName(e.target.value)}
                  placeholder={isAr ? 'اسم مندوب التوصيل...' : 'Representative name...'}
                  maxLength={100}
                />
                <Input
                  label={isAr ? 'هاتف المندوب' : 'Representative Phone'}
                  type="tel"
                  value={repPhone}
                  onChange={(e) => setRepPhone(e.target.value)}
                  placeholder={isAr ? 'رقم هاتف المندوب...' : 'Representative phone...'}
                  maxLength={20}
                />
              </div>
            )}
          </div>
        ) : null}

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="ghost" onClick={onClose} disabled={updateMutation.isPending}>
            {isAr ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button
            variant={isCancel ? 'danger' : 'primary'}
            onClick={handleConfirm}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending
              ? isAr
                ? 'جارٍ التحديث...'
                : 'Updating...'
              : isCancel
                ? isAr
                  ? 'نعم، قم بإلغاء الطلب'
                  : 'Yes, Cancel Order'
                : isAr
                  ? 'تأكيد التحديث'
                  : 'Confirm Update'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ErrorMessage } from '@/lib/errors'
import { useToast } from '@/components/ui/ToastProvider'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useUpdateOrderFulfillment } from './hooks'
import type { AdminOrder } from './types'

export interface OrderFulfillmentDialogProps {
  open: boolean
  order: AdminOrder | null
  onClose: () => void
  onSuccess?: (updated: AdminOrder) => void
}

export function OrderFulfillmentDialog({
  open,
  order,
  onClose,
  onSuccess,
}: OrderFulfillmentDialogProps) {
  const { lang } = useLanguage()
  const isAr = lang === 'ar'
  const toast = useToast()
  const fulfillmentMutation = useUpdateOrderFulfillment()

  const [error, setError] = useState<unknown | null>(null)
  const [trackingNumber, setTrackingNumber] = useState(order?.tracking_number ?? '')
  const [repName, setRepName] = useState(order?.rep_name ?? '')
  const [repPhone, setRepPhone] = useState(order?.rep_phone ?? '')

  if (!open || !order) return null

  const isPost = order.delivery_method === 'egypt_post'

  const handleSave = async () => {
    setError(null)
    try {
      const payload: {
        tracking_number?: string | null
        rep_name?: string | null
        rep_phone?: string | null
      } = {}

      if (isPost) {
        payload.tracking_number = trackingNumber.trim() || null
      } else {
        payload.rep_name = repName.trim() || null
        payload.rep_phone = repPhone.trim() || null
      }

      const updated = await fulfillmentMutation.mutateAsync({
        id: order.id,
        payload,
      })

      toast.success(isAr ? 'تم حفظ بيانات الشحن بنجاح' : 'Fulfillment details saved successfully')
      onSuccess?.(updated)
      onClose()
    } catch (err) {
      setError(err)
    }
  }

  return (
    <Dialog
      open
      title={
        isAr ? `تعديل بيانات الشحن للطلب #${order.id}` : `Edit Fulfillment for Order #${order.id}`
      }
      onClose={onClose}
    >
      <div className="space-y-4 max-w-md">
        {error ? <ErrorMessage error={error} /> : null}

        {isPost ? (
          <Input
            label={isAr ? 'رقم التتبع (البريد المصري)' : 'Tracking Number (Egypt Post)'}
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder={isAr ? 'مثال: EG123456789' : 'e.g. EG123456789'}
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
              placeholder={isAr ? '010...' : '010...'}
              maxLength={20}
            />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="ghost" onClick={onClose} disabled={fulfillmentMutation.isPending}>
            {isAr ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={fulfillmentMutation.isPending}>
            {fulfillmentMutation.isPending
              ? isAr
                ? 'جارٍ الحفظ...'
                : 'Saving...'
              : isAr
                ? 'حفظ البيانات'
                : 'Save Details'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

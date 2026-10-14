import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { AppError, ErrorMessage } from '@/lib/errors'
import { useToast } from '@/components/ui/ToastProvider'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useReviewOrderRequest } from './hooks'
import { buildApprovalWhatsAppUrl } from './whatsapp'
import type { AdminOrder } from './types'

export type OrderApprovalAction = 'approve' | 'reject' | 'whatsapp'

export function OrderApprovalDialog({
  order, action, onClose,
}: {
  order: AdminOrder
  action: OrderApprovalAction
  onClose: () => void
}) {
  const { t } = useLanguage()
  const toast = useToast()
  const mutation = useReviewOrderRequest()
  const [approved, setApproved] = useState(false)
  const isReject = action === 'reject'
  const schema = z.object({ note: z.string().trim().max(500).refine(value => !isReject || value.length > 0) })
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { note: '' }, resolver: zodResolver(schema),
  })
  const payUrl = new URL('/pay/' + order.id, window.location.origin).href
  const whatsappUrl = buildApprovalWhatsAppUrl(order.ship_phone, t('whatsapp.message', {
    name: order.ship_name, order: order.id, link: payUrl,
  }))
  const close = () => { if (!mutation.isPending) onClose() }

  const submit = handleSubmit(async ({ note }) => {
    try {
      await mutation.mutateAsync({ id: order.id, approve: !isReject, note })
      if (action === 'whatsapp') {
        setApproved(true)
      } else {
        toast.success(t(isReject ? 'admin.rejection_saved' : 'admin.approval_saved'))
        onClose()
      }
    } catch {
      // The mutation error is rendered through the catalogue below.
    }
  })

  return (
    <Dialog open title={t('admin.order_approval_title', { order: order.id })} onClose={close}>
      <div className="max-w-md space-y-4">
        {approved ? (
          <>
            <p role="status" className="text-body text-text">{t('admin.whatsapp_ready')}</p>
            {whatsappUrl ? (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="ui-control ui-button inline-flex items-center justify-center rounded-pill px-6 py-2 font-semibold" data-variant="primary">
                {t('admin.open_whatsapp')}
              </a>
            ) : <p className="text-small text-text-muted">{t('admin.whatsapp_invalid_phone')}</p>}
            <Button variant="ghost" onClick={onClose}>{t('ui.closeDialog')}</Button>
          </>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <p className="text-body text-text">{t(isReject ? 'admin.rejection_explanation' : 'admin.approval_explanation')}</p>
            {mutation.error ? <ErrorMessage error={mutation.error} /> : null}
            {errors.note ? <ErrorMessage error={new AppError('ORD-012')} /> : null}
            <label className="block space-y-2 text-small text-text">
              <span>{t(isReject ? 'admin.approval_reason' : 'admin.approval_note')}</span>
              <textarea {...register('note')} rows={3} maxLength={500} required={isReject} disabled={mutation.isPending} aria-invalid={Boolean(errors.note)} className="ui-control ui-field block w-full rounded-chip border border-border-input bg-surface p-3 text-text" />
            </label>
            <div className="flex flex-wrap justify-end gap-3">
              <Button variant="ghost" onClick={close} disabled={mutation.isPending}>{t('ui.closeDialog')}</Button>
              <Button type="submit" variant={isReject ? 'danger' : 'primary'} disabled={mutation.isPending}>
                {t(mutation.isPending ? 'ui.loading' : isReject ? 'admin.reject' : action === 'whatsapp' ? 'admin.approve_whatsapp' : 'admin.approve')}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Dialog>
  )
}

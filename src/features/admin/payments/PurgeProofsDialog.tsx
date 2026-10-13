import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { ErrorMessage } from '@/lib/errors'
import { StepUpDialog } from '@/features/auth/StepUpDialog'
import { useStepUp } from '@/features/auth/useStepUp'
import { useToast } from '@/components/ui/ToastProvider'
import { useLanguage } from '@/i18n/LanguageProvider'
import { usePurgeOldProofs } from './hooks'
import type { PurgeProofsResult } from './types'

export interface PurgeProofsDialogProps {
  open: boolean
  onClose: () => void
  onSuccess?: (result: PurgeProofsResult) => void
}

export function PurgeProofsDialog({ open, onClose, onSuccess }: PurgeProofsDialogProps) {
  const { lang } = useLanguage()
  const isAr = lang === 'ar'
  const toast = useToast()
  const purgeMutation = usePurgeOldProofs()
  const { isConfirmed, openStepUp, dialogOpen: isStepUpOpen, closeStepUp } = useStepUp()

  const [error, setError] = useState<unknown | null>(null)

  if (!open) return null

  const executePurge = async () => {
    setError(null)
    try {
      const result = await purgeMutation.mutateAsync(90)
      if (result.purgedCount === 0) {
        toast.info(
          isAr
            ? 'لا توجد إثباتات دفع لطلبات تم تسليمها قبل أكثر من 90 يومًا.'
            : 'No payment proofs found for orders delivered over 90 days ago.',
        )
      } else {
        toast.success(
          isAr
            ? `تم تطهير ${result.purgedCount} من إثباتات الدفع القديمة بنجاح وحذف ملفاتها.`
            : `Successfully purged ${result.purgedCount} old payment proof files.`,
        )
      }
      onSuccess?.(result)
      onClose()
    } catch (err) {
      setError(err)
    }
  }

  const handleStartPurge = () => {
    if (isConfirmed) {
      void executePurge()
    } else {
      openStepUp(() => {
        void executePurge()
      })
    }
  }

  const title = isAr ? 'تطهير إثباتات الدفع القديمة' : 'Purge Old Payment Proofs'

  return (
    <>
      <Dialog open title={title} onClose={onClose}>
        <div className="space-y-4 max-w-md">
          {error ? <ErrorMessage error={error} /> : null}

          {/* Privacy & Security Description */}
          <div className="rounded-chip border border-border bg-surface-2 p-4 space-y-2 text-small">
            <div className="flex items-center gap-2 font-semibold text-text">
              <span className="text-body" aria-hidden="true">
                🛡️
              </span>
              <span>
                {isAr
                  ? 'سياسة الاحتفاظ وحماية الخصوصية (SEC-07)'
                  : 'Data Retention & Privacy Policy (SEC-07)'}
              </span>
            </div>
            <p className="text-caption text-text-muted">
              {isAr
                ? 'تنص السياسة الأمنية على حذف إثباتات الدفع للطلبات التي تم تسليمها منذ أكثر من 90 يومًا. سيؤدي هذا الإجراء إلى حذف ملفات الصور نهائيًا من التخزين السحابي الخاص ومسح مساراتها من قاعدة البيانات.'
                : 'Security policy requires purging payment proofs for orders delivered over 90 days ago. This removes images from storage and clears database paths.'}
            </p>
          </div>

          <div
            role="alert"
            className="rounded-chip border border-warning/30 bg-surface-tint p-3 text-small text-warning"
          >
            <p className="font-semibold">
              {isAr ? 'إجراء حسّاس يتطلب تأكيد الهوية (Step-Up):' : 'Sensitive Step-Up Action:'}
            </p>
            <p className="text-caption text-text-muted mt-1">
              {isAr
                ? 'لحماية المتجر، يتطلب التطهير تأكيد رمز التحقق بخطوتين (TOTP) إذا لم تكن جلستك مؤكدة خلال آخر 5 دقائق.'
                : 'Requires TOTP MFA confirmation if not confirmed within the last 5 minutes.'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={purgeMutation.isPending}
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleStartPurge}
              disabled={purgeMutation.isPending}
            >
              {purgeMutation.isPending
                ? isAr
                  ? 'جارٍ التطهير...'
                  : 'Purging...'
                : isAr
                  ? 'بدء التطهير'
                  : 'Start Purge'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Step-Up Dialog for TOTP verification */}
      <StepUpDialog
        open={isStepUpOpen}
        onClose={closeStepUp}
        title={isAr ? 'تأكيد الهوية لتطهير الإثباتات' : 'Confirm Step-Up to Purge Proofs'}
        description={
          isAr
            ? 'يتطلب تطهير إثباتات الدفع تأكيد رمز التحقق بخطوتين (AAL2).'
            : 'Purging payment proofs requires step-up MFA verification.'
        }
      />
    </>
  )
}

import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { Input } from '../../components/ui/Input'
import { AuthAlert } from './AuthAlert'
import type { AuthErrorCode } from './types'
import { useStepUp } from './useStepUp'
import { useLanguage } from '../../i18n/LanguageProvider'

export interface StepUpDialogProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  title?: string
  description?: string
}

export function StepUpDialog({ open, onClose, onSuccess, title, description }: StepUpDialogProps) {
  const { t } = useLanguage()
  const { confirmStepUp, errorCode: hookErrorCode, submitting } = useStepUp()
  const [code, setCode] = useState('')
  const [localError, setLocalError] = useState<AuthErrorCode | null>(null)

  const activeError = localError || hookErrorCode || 'ADM-003'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    if (!/^\d{6}$/.test(code.trim())) {
      setLocalError('AUTH-006')
      return
    }

    const result = await confirmStepUp(code.trim())
    if (result.success) {
      setCode('')
      if (onSuccess) {
        onSuccess()
      }
      onClose()
    } else if (result.code) {
      setLocalError(result.code)
    }
  }

  const handleClose = () => {
    setCode('')
    setLocalError(null)
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={title ?? t('mfa.stepUpTitle')}
      description={description ?? t('mfa.stepUpDescription')}
    >
      <div className="space-y-4">
        {activeError && <AuthAlert code={activeError} />}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="step-up-totp-code"
            label={t('mfa.code')}
            name="totpCode"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            dir="ltr"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            disabled={submitting}
            className="text-center font-mono tracking-widest text-h3"
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={handleClose} disabled={submitting}>
              {t('mfa.cancel')}
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? t('mfa.verifying') : t('mfa.stepUpContinue')}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  )
}

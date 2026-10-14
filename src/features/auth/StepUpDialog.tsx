import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { Input } from '../../components/ui/Input'
import { AuthAlert } from './authErrors'
import type { AuthErrorCode } from './types'
import { useStepUp } from './useStepUp'

export interface StepUpDialogProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  title?: string
  description?: string
}

export function StepUpDialog({
  open,
  onClose,
  onSuccess,
  title = 'تأكيد الهوية (إجراء حسّاس)',
  description = 'يتطلب هذا الإجراء تأكيدًا حديثًا للتحقق بخطوتين لحماية المتجر.',
}: StepUpDialogProps) {
  const { confirmStepUp, errorCode: hookErrorCode, submitting } = useStepUp()
  const [code, setCode] = useState('')
  const [localError, setLocalError] = useState<AuthErrorCode | null>(null)

  const activeError = localError || hookErrorCode || 'ADM-003'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    if (code.trim().length !== 6) {
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
    <Dialog open={open} onClose={handleClose} title={title} description={description}>
      <div className="space-y-4">
        {activeError && <AuthAlert code={activeError} />}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="step-up-totp-code"
            label="رمز التحقق (6 أرقام)"
            name="totpCode"
            type="text"
            inputMode="numeric"
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
              إلغاء
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'جارٍ التحقق...' : 'تأكيد ومتابعة'}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  )
}

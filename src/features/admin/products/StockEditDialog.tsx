import { useState } from 'react'
import { useLanguage } from '@/i18n/LanguageProvider'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { ErrorMessage } from '@/lib/errors'
import { Ltr } from '@/components/ui/Ltr'
import { useToast } from '@/components/ui/ToastProvider'
import { useUpdateProductStock } from './hooks'
import type { AdminProduct, StockAdjustmentReason } from './types'

export interface StockEditDialogProps {
  product: AdminProduct | null
  onClose: () => void
}

interface StockEditFormProps {
  product: AdminProduct
  onClose: () => void
}

function StockEditForm({ product, onClose }: StockEditFormProps) {
  const { t } = useLanguage()
  const toast = useToast()
  const updateStockMutation = useUpdateProductStock()

  const [quantityInput, setQuantityInput] = useState<string>(() => String(product.stock_quantity))
  const [reason, setReason] = useState<StockAdjustmentReason>('admin_adjust')
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleQuantityChange = (val: string) => {
    setQuantityInput(val)
    if (val.trim() === '') {
      setValidationError(t.admin.stockQuantityRequired)
      return
    }
    const num = Number(val)
    if (!Number.isFinite(num) || !Number.isInteger(num)) {
      setValidationError(t.admin.stockQuantityRequired)
      return
    }
    if (num < 0) {
      setValidationError(t.admin.stockNegativeError)
      return
    }
    setValidationError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const num = Number(quantityInput)
    if (quantityInput.trim() === '' || !Number.isFinite(num) || !Number.isInteger(num)) {
      setValidationError(t.admin.stockQuantityRequired)
      return
    }
    if (num < 0) {
      setValidationError(t.admin.stockNegativeError)
      return
    }

    try {
      await updateStockMutation.mutateAsync({
        productId: product.id,
        newQuantity: num,
        reason,
      })
      toast.success(t.admin.stockUpdateSuccess)
      onClose()
    } catch {
      // Error handled and rendered below via updateStockMutation.error
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div className="rounded-card border border-border bg-surface-2 p-3 text-small">
        <span className="text-text-muted block mb-1">المنتج:</span>
        <span className="font-bold text-brand block">{product.name_ar || product.name}</span>
        <div className="flex items-center gap-2 mt-1 text-caption text-text-muted">
          <span>{t.admin.stockCurrentQuantity}:</span>
          <span className="font-mono font-bold text-text">
            <Ltr>{product.stock_quantity}</Ltr>
          </span>
        </div>
      </div>

      {/* New Quantity Input */}
      <div className="space-y-1.5">
        <label
          htmlFor="stock-new-quantity-input"
          className="block text-small font-semibold text-text"
        >
          {t.admin.stockNewQuantity} <span className="text-danger">*</span>
        </label>
        <input
          id="stock-new-quantity-input"
          type="number"
          min="0"
          step="1"
          required
          value={quantityInput}
          onChange={(e) => handleQuantityChange(e.target.value)}
          className="h-11 w-full rounded-chip border border-border-input bg-bg px-3 font-mono text-body text-text placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-focus"
          dir="ltr"
          disabled={updateStockMutation.isPending}
        />
        {validationError && (
          <p role="alert" className="text-small text-danger">
            {validationError}
          </p>
        )}
      </div>

      {/* Reason Dropdown */}
      <div className="space-y-1.5">
        <label htmlFor="stock-reason-select" className="block text-small font-semibold text-text">
          {t.admin.stockReason} <span className="text-danger">*</span>
        </label>
        <select
          id="stock-reason-select"
          value={reason}
          onChange={(e) => setReason(e.target.value as StockAdjustmentReason)}
          className="h-11 w-full rounded-chip border border-border-input bg-bg px-3 text-body text-text focus:border-brand focus:outline-none focus:ring-2 focus:ring-focus"
          disabled={updateStockMutation.isPending}
        >
          <option value="admin_adjust">{t.admin.stockReasonAdjust}</option>
          <option value="restock">{t.admin.stockReasonRestock}</option>
          <option value="correction">{t.admin.stockReasonCorrection}</option>
        </select>
      </div>

      {/* Mutation Error Display */}
      {updateStockMutation.error && (
        <div className="rounded-chip border border-danger/30 bg-danger/10 p-3">
          <ErrorMessage error={updateStockMutation.error} />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          disabled={updateStockMutation.isPending}
        >
          {t.admin.cancel}
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={updateStockMutation.isPending || Boolean(validationError)}
        >
          {updateStockMutation.isPending ? t.admin.saving : t.admin.save}
        </Button>
      </div>
    </form>
  )
}

export function StockEditDialog({ product, onClose }: StockEditDialogProps) {
  const { t } = useLanguage()

  return (
    <Dialog
      open={Boolean(product)}
      title={t.admin.stockDialogTitle}
      description={t.admin.stockDialogDesc}
      onClose={onClose}
    >
      {product ? <StockEditForm key={product.id} product={product} onClose={onClose} /> : null}
    </Dialog>
  )
}

import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { ErrorMessage } from '@/lib/errors'
import { useToast } from '@/components/ui/ToastProvider'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useDeleteProduct, useArchiveProduct } from './hooks'
import type { AdminProduct } from './types'

export interface DeleteProductDialogProps {
  product: AdminProduct | null
  onClose: () => void
  onDeleted?: () => void
  onArchived?: () => void
}

export function DeleteProductDialog({
  product,
  onClose,
  onDeleted,
  onArchived,
}: DeleteProductDialogProps) {
  const { lang } = useLanguage()
  const isAr = lang === 'ar'
  const toast = useToast()

  const deleteMutation = useDeleteProduct()
  const archiveMutation = useArchiveProduct()
  const [deleteError, setDeleteError] = useState<unknown | null>(null)

  if (!product) return null

  const isOrderedError = Boolean(
    deleteError &&
    typeof deleteError === 'object' &&
    'code' in deleteError &&
    (deleteError as { code: string }).code === 'ADM-004',
  )

  const handleDelete = async () => {
    setDeleteError(null)
    try {
      await deleteMutation.mutateAsync(product.id)
      toast.success(isAr ? 'تم حذف المنتج نهائيًا بنجاح' : 'Product permanently deleted')
      onDeleted?.()
      onClose()
    } catch (err) {
      setDeleteError(err)
    }
  }

  const handleArchiveInstead = async () => {
    try {
      await archiveMutation.mutateAsync(product.id)
      toast.success(isAr ? 'تم أرشفة المنتج بنجاح' : 'Product archived successfully')
      onArchived?.()
      onClose()
    } catch {
      // Error handled by react-query / global toast
    }
  }

  return (
    <Dialog
      open={Boolean(product)}
      title={isAr ? 'تأكيد حذف المنتج' : 'Confirm Product Deletion'}
      description={
        isAr
          ? 'هل أنت متأكد من رغبتك في حذف هذا المنتج نهائيًا؟ لن يمكن التراجع عن هذا الإجراء.'
          : 'Are you sure you want to permanently delete this product? This action cannot be undone.'
      }
      onClose={onClose}
    >
      <div className="space-y-4 pt-2">
        <div className="rounded-card border border-border bg-surface-2 p-3 text-small">
          <span className="text-text-muted block mb-1">
            {isAr ? 'المنتج المحدد:' : 'Selected product:'}
          </span>
          <span className="font-bold text-brand block">
            {product.name_ar || product.name} (#{product.id})
          </span>
        </div>

        {/* Delete Error Display */}
        {deleteError ? (
          <div className="space-y-3 rounded-chip border border-danger/30 bg-danger/10 p-3">
            <ErrorMessage error={deleteError} />
            {isOrderedError && (
              <div className="pt-2">
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => void handleArchiveInstead()}
                  disabled={archiveMutation.isPending}
                  className="w-full"
                >
                  {archiveMutation.isPending
                    ? isAr
                      ? 'جارٍ الأرشفة...'
                      : 'Archiving...'
                    : isAr
                      ? 'أرشفة المنتج بدلًا من الحذف'
                      : 'Archive product instead'}
                </Button>
              </div>
            )}
          </div>
        ) : null}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={deleteMutation.isPending || archiveMutation.isPending}
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </Button>

          {!isOrderedError && (
            <Button
              type="button"
              variant="danger"
              onClick={() => void handleDelete()}
              disabled={deleteMutation.isPending || archiveMutation.isPending}
            >
              {deleteMutation.isPending
                ? isAr
                  ? 'جارٍ الحذف...'
                  : 'Deleting...'
                : isAr
                  ? 'حذف نهائي'
                  : 'Delete permanently'}
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  )
}

import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { ErrorMessage } from '@/lib/errors'
import { useToast } from '@/components/ui/ToastProvider'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useDeleteCategory } from './hooks'
import type { AdminCategoryWithCount } from './hooks'

export interface DeleteCategoryDialogProps {
  category: AdminCategoryWithCount | null
  /** Other categories available to move products to (excludes the current one). */
  otherCategories: { id: number; name: string; name_ar: string | null }[]
  onClose: () => void
  onDeleted?: () => void
}

export function DeleteCategoryDialog({
  category,
  otherCategories,
  onClose,
  onDeleted,
}: DeleteCategoryDialogProps) {
  const { lang } = useLanguage()
  const isAr = lang === 'ar'
  const toast = useToast()

  const deleteMutation = useDeleteCategory()
  const [deleteError, setDeleteError] = useState<unknown | null>(null)
  const [moveToId, setMoveToId] = useState<number | ''>('')

  if (!category) return null

  const hasProducts = category.product_count > 0
  const displayName = isAr ? (category.name_ar ?? category.name) : category.name

  const handleDelete = async () => {
    setDeleteError(null)

    if (hasProducts && !moveToId) {
      setDeleteError({ code: 'ADM-005' })
      return
    }

    try {
      await deleteMutation.mutateAsync({
        categoryId: category.id,
        moveToId: moveToId !== '' ? Number(moveToId) : null,
      })
      toast.success(isAr ? 'تم حذف القسم بنجاح' : 'Category deleted successfully')
      onDeleted?.()
      onClose()
    } catch (err) {
      setDeleteError(err)
    }
  }

  return (
    <Dialog open title={isAr ? 'تأكيد حذف القسم' : 'Confirm Category Deletion'} onClose={onClose}>
      <div className="space-y-4 max-w-sm">
        <p className="text-body text-text">
          {isAr ? (
            <>
              القسم: <strong>{displayName}</strong>
            </>
          ) : (
            <>
              Category: <strong>{displayName}</strong>
            </>
          )}
        </p>

        {hasProducts ? (
          <div className="space-y-3">
            <p className="text-small text-text-muted">
              {isAr
                ? `هذا القسم يحتوي على ${category.product_count} منتج. يجب اختيار قسم بديل لنقل المنتجات إليه أولًا.`
                : `This category has ${category.product_count} product(s). Select a target category to move them to first.`}
            </p>
            <div className="space-y-1.5">
              <label htmlFor="del-cat-move-to" className="block text-small font-semibold text-text">
                {isAr ? 'القسم البديل' : 'Target Category'} <span className="text-danger">*</span>
              </label>
              <select
                id="del-cat-move-to"
                value={moveToId}
                onChange={(e) => setMoveToId(e.target.value ? Number(e.target.value) : '')}
                className="h-11 w-full rounded-chip border border-border-input bg-bg px-3 text-body text-text focus:border-brand focus:outline-none focus:ring-2 focus:ring-focus"
              >
                <option value="">
                  {isAr ? '-- اختر القسم البديل --' : '-- Select target category --'}
                </option>
                {otherCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_ar ? `${c.name_ar} (${c.name})` : c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <p className="text-small text-text-muted">
            {isAr
              ? 'هذا القسم فارغ وسيتم حذفه نهائيًا.'
              : 'This category is empty and will be permanently deleted.'}
          </p>
        )}

        {deleteError ? (
          <div className="rounded-card border border-danger/30 bg-danger/10 p-3">
            <ErrorMessage error={deleteError} />
          </div>
        ) : null}

        <div className="flex gap-2 justify-end pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={deleteMutation.isPending}
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => void handleDelete()}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending
              ? isAr
                ? 'جارٍ الحذف...'
                : 'Deleting...'
              : isAr
                ? 'تأكيد الحذف'
                : 'Confirm Deletion'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

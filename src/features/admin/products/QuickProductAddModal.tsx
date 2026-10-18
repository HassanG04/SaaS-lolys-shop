import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useToast } from '@/components/ui/ToastProvider'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { ProductImage } from '@/features/catalog/components/ProductImage'
import { ErrorMessage } from '@/lib/errors'
import { useCreateProduct } from './hooks'
import { uploadProductImage } from './api'
import { validateProductImageFile } from './imageUpload'
import type { AdminCategorySummary } from './types'

export interface QuickProductAddModalProps {
  isOpen: boolean
  categories: AdminCategorySummary[]
  onClose: () => void
}

export function QuickProductAddModal({ isOpen, categories, onClose }: QuickProductAddModalProps) {
  const { lang } = useLanguage()
  const isAr = lang === 'ar'
  const toast = useToast()
  const createMutation = useCreateProduct()

  // Form State
  const [name, setName] = useState('')
  const [nameAr, setNameAr] = useState('')
  const [customIdInput, setCustomIdInput] = useState<string>('')
  const [priceInput, setPriceInput] = useState<string>('')
  const [stockQuantity, setStockQuantity] = useState<number>(10)
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  // UI state
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [formError, setFormError] = useState<unknown | null>(null)

  const handleStockDelta = (delta: number) => {
    setStockQuantity((prev) => Math.max(0, prev + delta))
  }

  const handleFileProcess = async (file: File) => {
    setIsUploading(true)
    setFormError(null)
    try {
      await validateProductImageFile(file)
      const targetDraftId = customIdInput.trim() ? Number(customIdInput) : `draft-${Date.now()}`
      const path = await uploadProductImage(file, targetDraftId)
      setImageUrl(path)
      toast.success(isAr ? 'تم رفع صورة المنتج بنجاح' : 'Product photo uploaded')
    } catch (err) {
      setFormError(err)
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    void handleFileProcess(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      void handleFileProcess(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!name.trim()) {
      setFormError(
        new Error(
          isAr ? 'يرجى إدخال اسم المنتج بالإنجليزية' : 'Product name in English is required',
        ),
      )
      return
    }

    if (!categoryId) {
      setFormError(new Error(isAr ? 'يرجى اختيار القسم' : 'Please select a category'))
      return
    }

    const numericPrice = Number(priceInput)
    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      setFormError(new Error(isAr ? 'يرجى إدخال سعر صحيح' : 'Please enter a valid price'))
      return
    }

    let parsedCustomId: number | undefined
    if (customIdInput.trim()) {
      parsedCustomId = Number(customIdInput)
      if (!Number.isInteger(parsedCustomId) || parsedCustomId <= 0) {
        setFormError(
          new Error(
            isAr
              ? 'معرّف المنتج المخصص غير صالح (يجب أن يكون رقمًا صحيحًا موجبًا)'
              : 'Custom product ID must be a positive integer',
          ),
        )
        return
      }
    }

    try {
      const created = await createMutation.mutateAsync({
        custom_id: parsedCustomId,
        name: name.trim(),
        name_ar: nameAr.trim() || null,
        category_id: Number(categoryId),
        price: numericPrice,
        stock_quantity: stockQuantity,
        image_url: imageUrl,
        is_active: true,
        is_featured: false,
      })

      toast.success(
        isAr
          ? `تمت إضافة المنتج بنجاح برقم #${created.id}`
          : `Product #${created.id} created successfully`,
      )
      onClose()
    } catch (err) {
      setFormError(err)
    }
  }

  return (
    <Dialog
      open={isOpen}
      title={isAr ? 'إضافة منتج جديد (واجهة سريعة)' : 'Quick Add Product'}
      description={
        isAr
          ? 'إضافة منتج جديد بسرعة مع تحديد المعرّف (اختياري)، الاسم، السعر، المخزون والصورة.'
          : 'Quickly create a product with name, optional custom ID, price, stock, and photo.'
      }
      onClose={onClose}
    >
      <div className="space-y-5 pt-2 max-w-xl">
        {/* Form Error Banner */}
        {formError ? (
          <div className="rounded-card bg-danger/10 border border-danger/30 p-3 text-small text-danger">
            <ErrorMessage error={formError} />
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Product ID & Names */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Optional Custom ID */}
            <div className="space-y-1">
              <label
                htmlFor="quick-add-custom-id"
                className="block text-small font-semibold text-text"
              >
                {isAr ? 'معرّف المنتج (اختياري)' : 'Custom ID (Opt)'}
              </label>
              <input
                id="quick-add-custom-id"
                type="number"
                min="1"
                step="1"
                placeholder={isAr ? 'تلقائي' : 'Auto'}
                value={customIdInput}
                onChange={(e) => setCustomIdInput(e.target.value)}
                className="h-10 w-full rounded-chip border border-border-input bg-bg px-3 text-body font-mono text-text focus:border-brand focus:outline-none focus:ring-2 focus:ring-focus"
              />
            </div>

            {/* Name EN */}
            <div className="space-y-1">
              <label htmlFor="quick-add-name" className="block text-small font-semibold text-text">
                {isAr ? 'الاسم بالإنجليزية *' : 'Name (EN) *'}
              </label>
              <input
                id="quick-add-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Gold Ring"
                className="h-10 w-full rounded-chip border border-border-input bg-bg px-3 text-body text-text focus:border-brand focus:outline-none focus:ring-2 focus:ring-focus"
              />
            </div>

            {/* Name AR */}
            <div className="space-y-1">
              <label
                htmlFor="quick-add-name-ar"
                className="block text-small font-semibold text-text"
              >
                {isAr ? 'الاسم بالعربية' : 'Name (AR)'}
              </label>
              <input
                id="quick-add-name-ar"
                type="text"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder="مثال: خاتم ذهبي"
                className="h-10 w-full rounded-chip border border-border-input bg-bg px-3 text-body text-text focus:border-brand focus:outline-none focus:ring-2 focus:ring-focus"
              />
            </div>
          </div>

          {/* 2. Photo Upload & Preview */}
          <div className="space-y-1.5">
            <label className="block text-small font-semibold text-text">
              {isAr ? 'صورة المنتج' : 'Product Photo'}
            </label>

            <div className="flex items-center gap-3">
              {/* Preview */}
              <div className="size-20 shrink-0 overflow-hidden rounded-image border border-border bg-surface-2 relative shadow-card">
                <ProductImage
                  src={imageUrl}
                  alt={name || 'New Product'}
                  className="size-full object-cover"
                />
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl(null)}
                    className="absolute top-1 end-1 rounded-pill bg-danger text-brand-contrast p-1 shadow-card hover:opacity-90"
                    title={isAr ? 'إزالة الصورة' : 'Remove photo'}
                  >
                    <svg className="size-3" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                )}
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`flex-1 rounded-card border border-dashed p-3 text-center transition-colors ${
                  isDragging
                    ? 'border-brand bg-surface-tint'
                    : 'border-border bg-surface hover:border-brand'
                }`}
              >
                {isUploading ? (
                  <div className="text-brand font-semibold text-small animate-pulse">
                    {isAr ? 'جارٍ رفع الصورة...' : 'Uploading...'}
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <p className="text-caption font-medium text-text">
                      {isAr ? 'اسحب الصورة هنا أو اضغط للاختيار' : 'Drag photo here or browse'}
                    </p>
                    <label className="inline-block mt-1 cursor-pointer rounded-pill bg-surface-2 border border-border px-2.5 py-0.5 text-caption font-semibold text-text hover:bg-surface-tint">
                      <span>{isAr ? 'اختيار ملف' : 'Choose file'}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={handleFileChange}
                        disabled={isUploading}
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. Quantity & Stock Controls */}
          <div className="rounded-card border border-border bg-surface-2/60 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="quick-add-stock" className="block text-small font-semibold text-text">
                {isAr ? 'الكمية الأولية في المخزون' : 'Initial Stock Quantity'}
              </label>
              <span className="rounded-pill bg-brand/10 border border-brand/20 px-2 py-0.5 text-caption font-bold text-brand">
                {stockQuantity} {isAr ? 'قطعة' : 'units'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                id="quick-add-stock"
                type="number"
                min="0"
                step="1"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(Math.max(0, Number(e.target.value) || 0))}
                className="h-9 w-24 rounded-chip border border-border-input bg-bg px-2 text-body font-mono font-bold text-text focus:border-brand focus:outline-none focus:ring-2 focus:ring-focus text-center"
              />

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleStockDelta(-5)}
                  className="h-8 px-2 rounded-chip border border-border bg-surface text-caption font-mono font-bold text-text hover:bg-surface-2"
                >
                  -5
                </button>
                <button
                  type="button"
                  onClick={() => handleStockDelta(-1)}
                  className="h-8 px-2 rounded-chip border border-border bg-surface text-caption font-mono font-bold text-text hover:bg-surface-2"
                >
                  -1
                </button>
                <button
                  type="button"
                  onClick={() => handleStockDelta(1)}
                  className="h-8 px-2 rounded-chip border border-border bg-surface text-caption font-mono font-bold text-text hover:bg-surface-2"
                >
                  +1
                </button>
                <button
                  type="button"
                  onClick={() => handleStockDelta(5)}
                  className="h-8 px-2 rounded-chip border border-border bg-surface text-caption font-mono font-bold text-text hover:bg-surface-2"
                >
                  +5
                </button>
                <button
                  type="button"
                  onClick={() => handleStockDelta(10)}
                  className="h-8 px-2 rounded-chip border border-border bg-surface text-caption font-mono font-bold text-text hover:bg-surface-2"
                >
                  +10
                </button>
              </div>
            </div>
          </div>

          {/* 4. Price & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="quick-add-price" className="block text-small font-semibold text-text">
                {isAr ? 'السعر (ج.م) *' : 'Price (EGP) *'}
              </label>
              <input
                id="quick-add-price"
                type="number"
                min="0"
                step="0.01"
                required
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                placeholder="0.00"
                className="h-10 w-full rounded-chip border border-border-input bg-bg px-3 text-body font-mono text-text focus:border-brand focus:outline-none focus:ring-2 focus:ring-focus"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="quick-add-category"
                className="block text-small font-semibold text-text"
              >
                {isAr ? 'القسم *' : 'Category *'}
              </label>
              <select
                id="quick-add-category"
                value={categoryId}
                onChange={(e) => setCategoryId(Number(e.target.value) || '')}
                className="h-10 w-full rounded-chip border border-border-input bg-bg px-3 text-body text-text focus:border-brand focus:outline-none focus:ring-2 focus:ring-focus"
              >
                <option value="">{isAr ? '-- اختر القسم --' : '-- Select Category --'}</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name_ar || cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border">
            <Link
              to="/admin/products/new"
              onClick={onClose}
              className="text-small font-semibold text-brand hover:underline"
            >
              {isAr ? 'فتح نموذج الإضافة المفصل ←' : 'Open full form →'}
            </Link>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button variant="secondary" type="button" onClick={onClose}>
                {isAr ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={createMutation.isPending || isUploading}
              >
                {createMutation.isPending
                  ? isAr
                    ? 'جارٍ الحفظ...'
                    : 'Saving...'
                  : isAr
                    ? 'إضافة المنتج'
                    : 'Add Product'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Dialog>
  )
}

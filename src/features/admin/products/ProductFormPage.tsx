import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Ltr } from '@/components/ui/Ltr'
import { ErrorMessage } from '@/lib/errors'
import { ProductImage } from '@/features/catalog/components/ProductImage'
import { useToast } from '@/components/ui/ToastProvider'
import { useLanguage } from '@/i18n/LanguageProvider'
import { formatEGP } from '@/lib/format'
import {
  useAdminProduct,
  useAdminCategories,
  useCreateProduct,
  useUpdateProduct,
  useArchiveProduct,
  useRestoreProduct,
} from './hooks'
import { uploadProductImage } from './api'
import { validateProductImageFile } from './imageUpload'
import { DeleteProductDialog } from './DeleteProductDialog'
import type { AdminProduct, AdminCategorySummary } from './types'

interface ProductFormContentProps {
  productId?: number
  existingProduct?: AdminProduct
  categories: AdminCategorySummary[]
}

function ProductFormContent({ productId, existingProduct, categories }: ProductFormContentProps) {
  const navigate = useNavigate()
  const { lang } = useLanguage()
  const isAr = lang === 'ar'
  const toast = useToast()

  const isEditing = typeof productId === 'number' && !Number.isNaN(productId) && productId > 0

  const createMutation = useCreateProduct()
  const updateMutation = useUpdateProduct()
  const archiveMutation = useArchiveProduct()
  const restoreMutation = useRestoreProduct()

  // Form Fields State initialized directly from props (no setState in useEffect)
  const [name, setName] = useState(existingProduct?.name || '')
  const [nameAr, setNameAr] = useState(existingProduct?.name_ar || '')
  const [description, setDescription] = useState(existingProduct?.description || '')
  const [descriptionAr, setDescriptionAr] = useState(existingProduct?.description_ar || '')
  const [categoryId, setCategoryId] = useState<number | ''>(existingProduct?.category_id || '')
  const [price, setPrice] = useState<string>(existingProduct ? String(existingProduct.price) : '')
  const [discountPercent, setDiscountPercent] = useState<string>(
    existingProduct ? String(existingProduct.discount_percent || 0) : '0',
  )
  const [initialStock, setInitialStock] = useState<string>(
    existingProduct ? String(existingProduct.stock_quantity || 0) : '0',
  )
  const [isFeatured, setIsFeatured] = useState(Boolean(existingProduct?.is_featured))
  const [isActive, setIsActive] = useState(
    existingProduct !== undefined ? Boolean(existingProduct.is_active) : true,
  )
  const [imageUrl, setImageUrl] = useState<string | null>(existingProduct?.image_url ?? null)
  const [extraImages, setExtraImages] = useState<string[]>(
    Array.isArray(existingProduct?.extra_images) ? existingProduct.extra_images : [],
  )

  // UI state
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [isDraggingMain, setIsDraggingMain] = useState(false)
  const [isDraggingGallery, setIsDraggingGallery] = useState(false)
  const [uploadError, setUploadError] = useState<unknown | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Calculated final price preview
  const numericPrice = Number(price) || 0
  const numericDiscount = Math.min(100, Math.max(0, Number(discountPercent) || 0))
  const previewFinalPrice = Math.round(numericPrice * (100 - numericDiscount)) / 100

  // Core image processor for main image
  const processMainImageFile = async (file: File) => {
    setIsUploadingImage(true)
    setUploadError(null)

    try {
      await validateProductImageFile(file)
      const uploadTargetId = productId || `draft-${Date.now()}`
      const uploadedPath = await uploadProductImage(file, uploadTargetId)
      setImageUrl(uploadedPath)
      toast.success(isAr ? 'تم رفع الصورة الرئيسية بنجاح' : 'Main image uploaded')
    } catch (err) {
      setUploadError(err)
    } finally {
      setIsUploadingImage(false)
    }
  }

  // Handle image upload for main image
  const handleMainImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    void processMainImageFile(file)
  }

  // Core image processor for gallery
  const processGalleryImageFile = async (file: File) => {
    setIsUploadingImage(true)
    setUploadError(null)

    try {
      await validateProductImageFile(file)
      const uploadTargetId = productId || `draft-${Date.now()}`
      const uploadedPath = await uploadProductImage(file, uploadTargetId)
      setExtraImages((prev) => [...prev, uploadedPath])
      toast.success(isAr ? 'تمت إضافة الصورة للمعرض' : 'Gallery image added')
    } catch (err) {
      setUploadError(err)
    } finally {
      setIsUploadingImage(false)
    }
  }

  // Handle gallery image addition
  const handleGalleryImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    void processGalleryImageFile(file)
  }

  // Gallery reordering
  const handleMoveImage = (index: number, direction: 'earlier' | 'later') => {
    setExtraImages((prev) => {
      const copy = [...prev]
      const targetIndex = direction === 'earlier' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= copy.length) return prev
      const temp = copy[index]
      copy[index] = copy[targetIndex]
      copy[targetIndex] = temp
      return copy
    })
  }

  const handleRemoveGalleryImage = (index: number) => {
    setExtraImages((prev) => prev.filter((_, i) => i !== index))
  }

  // Form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!name.trim()) {
      setFormError(
        isAr ? 'يرجى إدخال اسم المنتج بالإنجليزية' : 'Product name in English is required',
      )
      return
    }

    if (!categoryId) {
      setFormError(isAr ? 'يرجى اختيار القسم' : 'Please select a category')
      return
    }

    if (Number(price) < 0 || Number.isNaN(Number(price))) {
      setFormError(isAr ? 'يرجى إدخال سعر صحيح (0 فأكثر)' : 'Please enter a valid price (>= 0)')
      return
    }

    const payload = {
      name: name.trim(),
      name_ar: nameAr.trim() || null,
      description: description.trim() || null,
      description_ar: descriptionAr.trim() || null,
      category_id: Number(categoryId),
      price: Number(price) || 0,
      discount_percent: Number(discountPercent) || 0,
      stock_quantity: Number(initialStock) || 0,
      is_featured: isFeatured,
      is_active: isActive,
      image_url: imageUrl,
      extra_images: extraImages,
    }

    try {
      if (isEditing && productId) {
        await updateMutation.mutateAsync({
          productId,
          formData: payload,
        })
        toast.success(isAr ? 'تم تحديث المنتج بنجاح' : 'Product updated successfully')
      } else {
        await createMutation.mutateAsync(payload)
        toast.success(isAr ? 'تمت إضافة المنتج بنجاح' : 'Product created successfully')
      }
      navigate('/admin/products')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleArchive = async () => {
    if (!productId) return
    try {
      await archiveMutation.mutateAsync(productId)
      setIsActive(false)
      toast.success(isAr ? 'تم أرشفة المنتج بنجاح' : 'Product archived')
    } catch {
      // Handled by react-query
    }
  }

  const handleRestore = async () => {
    if (!productId) return
    try {
      await restoreMutation.mutateAsync(productId)
      setIsActive(true)
      toast.success(isAr ? 'تمت استعادة المنتج بنجاح' : 'Product restored')
    } catch {
      // Handled by react-query
    }
  }

  return (
    <div className="space-y-6">
      {/* Header and Back Link */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            to="/admin/products"
            className="inline-flex items-center gap-1.5 text-small text-brand hover:underline mb-2"
          >
            <span aria-hidden="true">&larr;</span>
            <span>{isAr ? 'العودة إلى المنتجات' : 'Back to Products'}</span>
          </Link>
          <h1 className="text-h2 font-bold text-text">
            {isEditing
              ? isAr
                ? `تعديل المنتج: ${existingProduct?.name_ar || existingProduct?.name || ''}`
                : `Edit Product: ${existingProduct?.name || ''}`
              : isAr
                ? 'إضافة منتج جديد'
                : 'Add New Product'}
          </h1>
        </div>

        {isEditing && (
          <div className="flex items-center gap-2">
            {isActive ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => void handleArchive()}
                disabled={archiveMutation.isPending}
              >
                {isAr ? 'أرشفة المنتج' : 'Archive'}
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={() => void handleRestore()}
                disabled={restoreMutation.isPending}
              >
                {isAr ? 'استعادة المنتج' : 'Restore'}
              </Button>
            )}

            <Button type="button" variant="danger" onClick={() => setShowDeleteDialog(true)}>
              {isAr ? 'حذف نهائي' : 'Delete'}
            </Button>
          </div>
        )}
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Banners */}
        {formError && (
          <div className="rounded-card border border-danger/30 bg-danger/10 p-4 text-small text-danger">
            {formError}
          </div>
        )}

        {uploadError ? (
          <div className="rounded-card border border-danger/30 bg-danger/10 p-4">
            <ErrorMessage error={uploadError} />
          </div>
        ) : null}

        {/* 1. Basic Information */}
        <Card className="space-y-4 p-5 sm:p-6 shadow-card">
          <h2 className="text-h3 font-bold text-text border-b border-border pb-2">
            {isAr ? 'المعلومات الأساسية' : 'Basic Information'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Arabic Name */}
            <div className="space-y-1.5">
              <label htmlFor="prod-name-ar" className="block text-small font-semibold text-text">
                {isAr ? 'اسم المنتج (بالعربية)' : 'Product Name (Arabic)'}
              </label>
              <input
                id="prod-name-ar"
                type="text"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder={isAr ? 'مثال: خاتم لؤلؤ روز' : 'e.g. Rose Pearl Ring'}
                className="h-11 w-full rounded-chip border border-border-input bg-bg px-3 text-body text-text focus:border-brand focus:outline-none focus:ring-2 focus:ring-focus"
                dir="rtl"
              />
            </div>

            {/* English Name */}
            <div className="space-y-1.5">
              <label htmlFor="prod-name-en" className="block text-small font-semibold text-text">
                {isAr ? 'اسم المنتج (بالإنجليزية)' : 'Product Name (English)'}{' '}
                <span className="text-danger">*</span>
              </label>
              <input
                id="prod-name-en"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rose Pearl Ring"
                className="h-11 w-full rounded-chip border border-border-input bg-bg px-3 text-body text-text focus:border-brand focus:outline-none focus:ring-2 focus:ring-focus"
                dir="ltr"
              />
            </div>
          </div>

          {/* Category Select */}
          <div className="space-y-1.5">
            <label htmlFor="prod-category" className="block text-small font-semibold text-text">
              {isAr ? 'القسم' : 'Category'} <span className="text-danger">*</span>
            </label>
            <select
              id="prod-category"
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : '')}
              className="h-11 w-full rounded-chip border border-border-input bg-bg px-3 text-body text-text focus:border-brand focus:outline-none focus:ring-2 focus:ring-focus"
            >
              <option value="">{isAr ? '-- اختر القسم --' : '-- Select Category --'}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_ar ? `${c.name_ar} (${c.name})` : c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Arabic Description */}
            <div className="space-y-1.5">
              <label htmlFor="prod-desc-ar" className="block text-small font-semibold text-text">
                {isAr ? 'الوصف (بالعربية - نص عادي فقط)' : 'Description (Arabic - plain text)'}
              </label>
              <textarea
                id="prod-desc-ar"
                rows={4}
                value={descriptionAr}
                onChange={(e) => setDescriptionAr(e.target.value)}
                className="w-full rounded-chip border border-border-input bg-bg p-3 text-body text-text focus:border-brand focus:outline-none focus:ring-2 focus:ring-focus"
                dir="rtl"
              />
            </div>

            {/* English Description */}
            <div className="space-y-1.5">
              <label htmlFor="prod-desc-en" className="block text-small font-semibold text-text">
                {isAr ? 'الوصف (بالإنجليزية - نص عادي فقط)' : 'Description (English - plain text)'}
              </label>
              <textarea
                id="prod-desc-en"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-chip border border-border-input bg-bg p-3 text-body text-text focus:border-brand focus:outline-none focus:ring-2 focus:ring-focus"
                dir="ltr"
              />
            </div>
          </div>
        </Card>

        {/* 2. Pricing and Inventory */}
        <Card className="space-y-4 p-5 sm:p-6 shadow-card">
          <h2 className="text-h3 font-bold text-text border-b border-border pb-2">
            {isAr ? 'السعر والمخزون' : 'Pricing & Inventory'}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Price */}
            <div className="space-y-1.5">
              <label htmlFor="prod-price" className="block text-small font-semibold text-text">
                {isAr ? 'السعر الأساسي (ج.م)' : 'Price (EGP)'}{' '}
                <span className="text-danger">*</span>
              </label>
              <input
                id="prod-price"
                type="number"
                min="0"
                step="0.5"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="h-11 w-full rounded-chip border border-border-input bg-bg px-3 font-mono text-body text-text focus:border-brand focus:outline-none focus:ring-2 focus:ring-focus"
                dir="ltr"
              />
            </div>

            {/* Discount Percent */}
            <div className="space-y-1.5">
              <label htmlFor="prod-discount" className="block text-small font-semibold text-text">
                {isAr ? 'نسبة الخصم (%)' : 'Discount (%)'}
              </label>
              <input
                id="prod-discount"
                type="number"
                min="0"
                max="100"
                step="1"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                className="h-11 w-full rounded-chip border border-border-input bg-bg px-3 font-mono text-body text-text focus:border-brand focus:outline-none focus:ring-2 focus:ring-focus"
                dir="ltr"
              />
            </div>

            {/* Initial Stock (creation only) */}
            <div className="space-y-1.5">
              <label htmlFor="prod-stock" className="block text-small font-semibold text-text">
                {isAr ? 'المخزون الأولي' : 'Initial Stock Quantity'}
              </label>
              <input
                id="prod-stock"
                type="number"
                min="0"
                step="1"
                disabled={isEditing}
                value={initialStock}
                onChange={(e) => setInitialStock(e.target.value)}
                className="h-11 w-full rounded-chip border border-border-input bg-bg px-3 font-mono text-body text-text focus:border-brand focus:outline-none focus:ring-2 focus:ring-focus disabled:bg-surface-2 disabled:text-text-muted"
                dir="ltr"
              />
              {isEditing && (
                <span className="text-caption text-text-muted block">
                  {isAr
                    ? 'يتم تعديل المخزون للمنتجات الموجودة من قائمة المنتجات.'
                    : 'Adjust stock from the products list table.'}
                </span>
              )}
            </div>
          </div>

          {/* Computed Price Preview */}
          <div className="rounded-card border border-border bg-surface-2 p-3 flex items-center justify-between text-small">
            <span className="text-text-muted">
              {isAr
                ? 'السعر النهائي بعد الخصم (يحسب تلقائيًا في القاعدة):'
                : 'Calculated Final Price:'}
            </span>
            <span className="font-mono font-bold text-brand text-body">
              <Ltr>{formatEGP(previewFinalPrice)}</Ltr>
            </span>
          </div>
        </Card>

        {/* 3. Toggles: Featured and Active */}
        <Card className="space-y-4 p-5 sm:p-6 shadow-card">
          <h2 className="text-h3 font-bold text-text border-b border-border pb-2">
            {isAr ? 'حالة الظهور والتفعيل' : 'Visibility & Status'}
          </h2>

          <div className="flex flex-col sm:flex-row gap-6">
            {/* Active Toggle */}
            <div className="flex items-center gap-3">
              <input
                id="prod-active"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="size-5 rounded-chip text-brand focus:ring-focus cursor-pointer"
              />
              <label htmlFor="prod-active" className="cursor-pointer">
                <span className="font-semibold text-text block text-small">
                  {isAr ? 'منتج نشط' : 'Active Product'}
                </span>
                <span className="text-caption text-text-muted block">
                  {isAr
                    ? 'يظهر في المتجر للعملاء عند التفعيل'
                    : 'Visible in storefront to visitors'}
                </span>
              </label>
            </div>

            {/* Featured Toggle */}
            <div className="flex items-center gap-3">
              <input
                id="prod-featured"
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="size-5 rounded-chip text-brand focus:ring-focus cursor-pointer"
              />
              <label htmlFor="prod-featured" className="cursor-pointer">
                <span className="font-semibold text-text block text-small">
                  {isAr ? 'منتج مميز' : 'Featured Product'}
                </span>
                <span className="text-caption text-text-muted block">
                  {isAr
                    ? 'يظهر في قسم المنتجات المميزة والبانر'
                    : 'Highlighted on home page and featured banners'}
                </span>
              </label>
            </div>
          </div>
        </Card>

        {/* 4. Images Section */}
        <Card className="space-y-6 p-5 sm:p-6 shadow-card">
          <h2 className="text-h3 font-bold text-text border-b border-border pb-2">
            {isAr ? 'الصور والمعرض' : 'Images & Gallery'}
          </h2>

          {/* Main Image */}
          <div className="space-y-2">
            <span className="block text-small font-semibold text-text">
              {isAr ? 'الصورة الرئيسية للمنتج' : 'Main Product Image'}
            </span>

            <div
              onDragOver={(e) => {
                e.preventDefault()
                setIsDraggingMain(true)
              }}
              onDragLeave={() => setIsDraggingMain(false)}
              onDrop={(e) => {
                e.preventDefault()
                setIsDraggingMain(false)
                const file = e.dataTransfer.files?.[0]
                if (file) void processMainImageFile(file)
              }}
              className={`relative rounded-card border-2 border-dashed p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-5 transition-all ${
                isDraggingMain
                  ? 'border-brand bg-brand/10 scale-[1.01]'
                  : 'border-border-input hover:border-brand/60 bg-surface'
              }`}
            >
              <div className="size-28 shrink-0 rounded-card border border-border bg-surface-2 overflow-hidden flex items-center justify-center">
                {imageUrl ? (
                  <ProductImage
                    src={imageUrl}
                    alt={nameAr || name || 'Product image'}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-text-muted p-2 text-center">
                    <svg
                      className="size-8 text-brand/60"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                      <path d="M12 12v9" />
                      <path d="m16 16-4-4-4 4" />
                    </svg>
                    <span className="text-caption leading-tight">
                      {isAr ? 'لا توجد صورة' : 'No image'}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2.5 flex-1 text-center sm:text-start">
                <div>
                  <p className="text-small font-semibold text-text">
                    {isAr
                      ? 'اسحب الصورة وأفلتها هنا، أو اضغط للاختيار'
                      : 'Drag and drop your image here, or browse'}
                  </p>
                  <p className="text-caption text-text-muted mt-0.5">
                    {isAr
                      ? 'يدعم JPG و PNG و WebP حتى 5 ميجابايت (يتم الضغط والتحسين تلقائيًا)'
                      : 'Supports JPG, PNG, and WebP up to 5MB (compressed automatically)'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  <label className="inline-flex cursor-pointer items-center justify-center rounded-pill border border-brand bg-brand/5 px-4 py-2 text-small font-semibold text-brand transition-colors hover:bg-brand hover:text-brand-contrast focus-within:ring-2 focus-within:ring-focus shadow-pill">
                    <span>
                      {imageUrl
                        ? isAr
                          ? 'استبدال الصورة'
                          : 'Replace Image'
                        : isAr
                          ? 'اختر صورة من جهازك'
                          : 'Choose Image File'}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      disabled={isUploadingImage}
                      onChange={handleMainImageSelected}
                    />
                  </label>

                  {imageUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setImageUrl(null)}
                      className="text-small text-danger hover:bg-danger/10 p-2"
                    >
                      {isAr ? 'إزالة الصورة' : 'Remove Image'}
                    </Button>
                  )}
                </div>

                {isUploadingImage && (
                  <span className="text-caption font-semibold text-brand flex items-center gap-1.5 justify-center sm:justify-start">
                    <span className="size-2 rounded-pill bg-brand animate-ping" />
                    {isAr
                      ? 'جارٍ معالجة وضغط الصورة ورفعها...'
                      : 'Processing, compressing, and uploading...'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Gallery Extra Images */}
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setIsDraggingGallery(true)
            }}
            onDragLeave={() => setIsDraggingGallery(false)}
            onDrop={(e) => {
              e.preventDefault()
              setIsDraggingGallery(false)
              const file = e.dataTransfer.files?.[0]
              if (file) void processGalleryImageFile(file)
            }}
            className={`space-y-3 pt-3 border-t border-border rounded-card p-3 transition-colors ${
              isDraggingGallery ? 'bg-brand/5 border-2 border-dashed border-brand' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="block text-small font-semibold text-text">
                  {isAr ? 'معرض الصور الإضافية' : 'Gallery Images'}
                </span>
                <span className="text-caption text-text-muted">
                  {isAr ? 'يمكنك سحب وإفلات صور إضافية هنا' : 'Drag and drop extra images here'}
                </span>
              </div>

              <label className="inline-flex cursor-pointer items-center justify-center rounded-pill border border-border bg-surface px-3 py-1.5 text-small font-semibold text-text transition-colors hover:border-brand hover:text-brand focus-within:ring-2 focus-within:ring-focus shadow-pill">
                <span>{isAr ? '+ إضافة صورة للمعرض' : '+ Add Image'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={isUploadingImage}
                  onChange={handleGalleryImageSelected}
                />
              </label>
            </div>

            {extraImages.length === 0 ? (
              <p className="text-caption text-text-muted italic">
                {isAr ? 'لا توجد صور إضافية في المعرض بعد.' : 'No gallery images added yet.'}
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                {extraImages.map((imgSrc, idx) => (
                  <div
                    key={`${imgSrc}-${idx}`}
                    className="rounded-card border border-border bg-surface-2 p-2 flex flex-col gap-2 items-center"
                  >
                    <div className="size-20 rounded-chip overflow-hidden border border-border bg-bg">
                      <ProductImage
                        src={imgSrc}
                        alt={`Gallery ${idx + 1}`}
                        className="size-full object-cover"
                      />
                    </div>

                    <div className="flex items-center gap-1 w-full justify-center">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveImage(idx, 'earlier')}
                        aria-label={isAr ? 'تقديم الصورة' : 'Move earlier'}
                        className="p-1 text-caption text-text disabled:opacity-30 hover:text-brand"
                      >
                        &uarr;
                      </button>
                      <button
                        type="button"
                        disabled={idx === extraImages.length - 1}
                        onClick={() => handleMoveImage(idx, 'later')}
                        aria-label={isAr ? 'تأخير الصورة' : 'Move later'}
                        className="p-1 text-caption text-text disabled:opacity-30 hover:text-brand"
                      >
                        &darr;
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveGalleryImage(idx)}
                        aria-label={isAr ? 'إزالة الصورة' : 'Remove image'}
                        className="p-1 text-caption text-danger hover:underline"
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Submit Actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/admin/products')}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </Button>

          <Button
            type="submit"
            variant="primary"
            disabled={createMutation.isPending || updateMutation.isPending || isUploadingImage}
          >
            {createMutation.isPending || updateMutation.isPending
              ? isAr
                ? 'جارٍ الحفظ...'
                : 'Saving...'
              : isAr
                ? 'حفظ المنتج'
                : 'Save Product'}
          </Button>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      {showDeleteDialog && existingProduct && (
        <DeleteProductDialog
          product={existingProduct}
          onClose={() => setShowDeleteDialog(false)}
          onDeleted={() => navigate('/admin/products')}
          onArchived={() => navigate('/admin/products')}
        />
      )}
    </div>
  )
}

export default function ProductFormPage() {
  const { id } = useParams<{ id?: string }>()
  const { lang } = useLanguage()
  const isAr = lang === 'ar'

  const productId = id && id !== 'new' ? Number(id) : undefined
  const isEditing = typeof productId === 'number' && !Number.isNaN(productId) && productId > 0

  const { data: existingProduct, isLoading: isLoadingProduct } = useAdminProduct(productId)
  const { data: categories = [] } = useAdminCategories()

  if (isEditing && isLoadingProduct) {
    return (
      <div className="p-8 text-center text-text-muted">
        {isAr ? 'جارٍ تحميل بيانات المنتج...' : 'Loading product...'}
      </div>
    )
  }

  return (
    <ProductFormContent
      key={existingProduct ? existingProduct.id : 'new'}
      productId={productId}
      existingProduct={existingProduct}
      categories={categories}
    />
  )
}

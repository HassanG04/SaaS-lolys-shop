import { useState, useRef } from 'react'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useSeo } from '@/features/seo'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PearlLoader } from '@/components/ui/PearlLoader'
import { ErrorPanel } from '@/components/ui/ErrorPanel'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/ToastProvider'
import { ErrorMessage } from '@/lib/errors'
import { publicImageUrl } from '@/lib/images'
import {
  useAdminCategoriesFull,
  useCreateCategory,
  useUpdateCategory,
  useReorderCategories,
  type AdminCategoryWithCount,
} from './hooks'
import { DeleteCategoryDialog } from './DeleteCategoryDialog'
import { suggestSlug, validateSlug, uploadCategoryImage } from './api'

// ─── Row card ────────────────────────────────────────────────────────────────

interface CategoryRowProps {
  category: AdminCategoryWithCount
  index: number
  total: number
  isAr: boolean
  onMoveUp: (id: number) => void
  onMoveDown: (id: number) => void
  onEdit: (cat: AdminCategoryWithCount) => void
  onDelete: (cat: AdminCategoryWithCount) => void
}

function CategoryRow({
  category,
  index,
  total,
  isAr,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
}: CategoryRowProps) {
  const displayName = isAr ? (category.name_ar ?? category.name) : category.name
  const imageUrl = category.image_url ? publicImageUrl(category.image_url) : null

  return (
    <div className="flex items-center gap-3 rounded-chip border border-border bg-surface p-3 transition-shadow hover:shadow-card">
      {/* Reorder arrows */}
      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          aria-label={isAr ? 'تحريك لأعلى' : 'Move up'}
          disabled={index === 0}
          onClick={() => onMoveUp(category.id)}
          className="flex h-7 w-7 items-center justify-center rounded-chip text-text-muted hover:bg-surface-2 disabled:opacity-30"
        >
          ▲
        </button>
        <button
          type="button"
          aria-label={isAr ? 'تحريك لأسفل' : 'Move down'}
          disabled={index === total - 1}
          onClick={() => onMoveDown(category.id)}
          className="flex h-7 w-7 items-center justify-center rounded-chip text-text-muted hover:bg-surface-2 disabled:opacity-30"
        >
          ▼
        </button>
      </div>

      {/* Tile image */}
      <div className="h-14 w-14 flex-none overflow-hidden rounded-chip bg-surface-2">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={displayName}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-h2 text-text-muted">
            🏷
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-text">{displayName}</p>
        <p className="truncate text-small text-text-muted">/{category.slug}</p>
        <div className="mt-1 flex flex-wrap gap-2">
          <span
            className={`inline-flex items-center rounded-pill px-2 py-0.5 text-caption font-semibold ${
              category.is_active
                ? 'bg-success/15 text-success'
                : 'bg-text-muted/10 text-text-muted'
            }`}
          >
            {category.is_active ? (isAr ? 'نشط' : 'Active') : (isAr ? 'مؤرشف' : 'Archived')}
          </span>
          {category.show_on_home && (
            <span className="inline-flex items-center rounded-pill bg-brand/15 px-2 py-0.5 text-caption font-semibold text-brand">
              {isAr ? 'الرئيسية' : 'Home'}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-caption text-text-muted">
            {isAr
              ? `${category.product_count} منتج`
              : `${category.product_count} product(s)`}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-none gap-1.5">
        <Button
          variant="secondary"
          size="icon"
          aria-label={isAr ? 'تعديل القسم' : 'Edit category'}
          onClick={() => onEdit(category)}
        >
          ✏️
        </Button>
        <Button
          variant="danger"
          size="icon"
          aria-label={isAr ? 'حذف القسم' : 'Delete category'}
          onClick={() => onDelete(category)}
        >
          🗑
        </Button>
      </div>
    </div>
  )
}

// ─── Category form (shared by add & edit) ────────────────────────────────────

interface CategoryFormState {
  name_ar: string
  name: string
  slug: string
  show_on_home: boolean
  is_active: boolean
}

interface CategoryFormProps {
  initialValues: CategoryFormState
  isAr: boolean
  isSaving: boolean
  formError: unknown | null
  isEdit: boolean
  /** Current image path stored in DB (for preview). */
  currentImagePath: string | null
  onSubmit: (values: CategoryFormState, imageFile: File | null) => Promise<void>
  onCancel: () => void
}

function CategoryForm({
  initialValues,
  isAr,
  isSaving,
  formError,
  isEdit,
  currentImagePath,
  onSubmit,
  onCancel,
}: CategoryFormProps) {
  const [values, setValues] = useState<CategoryFormState>(initialValues)
  const [slugTouched, setSlugTouched] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(
    currentImagePath ? publicImageUrl(currentImagePath) : null,
  )
  const [localError, setLocalError] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const slugInvalid = values.slug.length > 0 && !validateSlug(values.slug)

  function handleNameChange(raw: string) {
    setValues((prev) => {
      const next = { ...prev, name: raw }
      if (!slugTouched) {
        next.slug = suggestSlug(raw)
      }
      return next
    })
  }

  function handleSlugChange(raw: string) {
    setSlugTouched(true)
    setValues((prev) => ({ ...prev, slug: raw.toLowerCase() }))
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLocalError(null)
    if (file.size > 5 * 1024 * 1024) {
      setLocalError(isAr ? 'حجم الصورة يجب أن يكون أقل من 5 ميجابايت' : 'Image must be under 5 MB')
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLocalError(null)

    if (!values.name_ar.trim() && !values.name.trim()) {
      setLocalError(isAr ? 'يرجى إدخال اسم القسم' : 'Please enter a category name')
      return
    }
    if (!values.slug) {
      setLocalError(isAr ? 'يرجى إدخال الاسم المختصر' : 'Please enter a slug')
      return
    }
    if (!validateSlug(values.slug)) {
      setLocalError(
        isAr
          ? 'الاسم المختصر غير صالح. استخدم حروفًا إنجليزية صغيرة وأرقامًا وشرطات فقط'
          : 'Invalid slug. Use lowercase letters, numbers, and hyphens only',
      )
      return
    }

    await onSubmit(values, imageFile)
  }

  const nameArId = 'cat-name-ar'
  const nameEnId = 'cat-name-en'
  const slugId = 'cat-slug'
  const imageId = 'cat-image'
  const showOnHomeId = 'cat-show-on-home'
  const isActiveId = 'cat-is-active'

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4" noValidate>
      {/* Arabic name */}
      <div className="space-y-1.5">
        <label htmlFor={nameArId} className="block text-small font-semibold text-text">
          {isAr ? 'اسم القسم (بالعربية)' : 'Category Name (Arabic)'}
          {' '}
          <span className="text-danger">*</span>
        </label>
        <input
          id={nameArId}
          dir="rtl"
          value={values.name_ar}
          onChange={(e) => setValues((p) => ({ ...p, name_ar: e.target.value }))}
          className="h-11 w-full rounded-chip border border-border-input bg-bg px-3 text-body text-text focus:border-brand focus:outline-none focus:ring-2 focus:ring-focus"
          placeholder="مثال: إكسسوارات"
          required
        />
      </div>

      {/* English name */}
      <div className="space-y-1.5">
        <label htmlFor={nameEnId} className="block text-small font-semibold text-text">
          {isAr ? 'اسم القسم (بالإنجليزية)' : 'Category Name (English)'}
        </label>
        <input
          id={nameEnId}
          dir="ltr"
          value={values.name}
          onChange={(e) => handleNameChange(e.target.value)}
          className="h-11 w-full rounded-chip border border-border-input bg-bg px-3 text-body text-text focus:border-brand focus:outline-none focus:ring-2 focus:ring-focus"
          placeholder="e.g. Accessories"
        />
      </div>

      {/* Slug */}
      <div className="space-y-1.5">
        <label htmlFor={slugId} className="block text-small font-semibold text-text">
          {isAr ? 'الاسم المختصر (Slug)' : 'Category Slug'}
          {' '}
          <span className="text-danger">*</span>
        </label>
        <input
          id={slugId}
          dir="ltr"
          value={values.slug}
          onChange={(e) => handleSlugChange(e.target.value)}
          className={`h-11 w-full rounded-chip border bg-bg px-3 font-mono text-body text-text focus:outline-none focus:ring-2 focus:ring-focus ${slugInvalid ? 'border-danger' : 'border-border-input focus:border-brand'}`}
          placeholder="e.g. accessories"
          required
        />
        {slugInvalid ? (
          <p className="text-caption text-danger">
            {isAr
              ? 'الاسم المختصر غير صالح. استخدم حروفًا إنجليزية صغيرة وأرقامًا وشرطات فقط'
              : 'Invalid slug. Use lowercase letters, numbers, and hyphens only'}
          </p>
        ) : (
          <p className="text-caption text-text-muted">
            {isAr ? 'يستخدم في رابط المتجر: /category/' : 'Used in store URL: /category/'}
            <span dir="ltr" className="font-mono">
              {values.slug || '...'}
            </span>
          </p>
        )}
      </div>

      {/* Image */}
      <div className="space-y-1.5">
        <label htmlFor={imageId} className="block text-small font-semibold text-text">
          {isAr ? 'صورة العرض' : 'Tile Image'}
        </label>
        <div className="flex items-center gap-3">
          {imagePreview && (
            <div className="h-16 w-16 flex-none overflow-hidden rounded-chip bg-surface-2">
              <img src={imagePreview} alt="" className="h-full w-full object-cover" />
            </div>
          )}
          <input
            ref={imageInputRef}
            id={imageId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleImageChange}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => imageInputRef.current?.click()}
          >
            {imagePreview
              ? (isAr ? 'تغيير الصورة' : 'Change image')
              : (isAr ? 'اختر صورة' : 'Choose image')}
          </Button>
          {imagePreview && (
            <button
              type="button"
              className="text-small text-danger hover:underline"
              onClick={() => {
                setImageFile(null)
                setImagePreview(null)
              }}
            >
              {isAr ? 'حذف الصورة' : 'Remove'}
            </button>
          )}
        </div>
        <p className="text-caption text-text-muted">
          {isAr ? 'JPEG / PNG / WebP · حد أقصى 5 ميجابايت' : 'JPEG / PNG / WebP · max 5 MB'}
        </p>
      </div>

      {/* Toggles */}
      <div className="flex flex-wrap gap-6">
        <label htmlFor={showOnHomeId} className="flex cursor-pointer items-center gap-2">
          <input
            id={showOnHomeId}
            type="checkbox"
            checked={values.show_on_home}
            onChange={(e) => setValues((p) => ({ ...p, show_on_home: e.target.checked }))}
            className="h-4 w-4 accent-brand"
          />
          <span className="text-small text-text">
            {isAr ? 'عرض في الرئيسية' : 'Show on Home Page'}
          </span>
        </label>

        <label htmlFor={isActiveId} className="flex cursor-pointer items-center gap-2">
          <input
            id={isActiveId}
            type="checkbox"
            checked={values.is_active}
            onChange={(e) => setValues((p) => ({ ...p, is_active: e.target.checked }))}
            className="h-4 w-4 accent-brand"
          />
          <span className="text-small text-text">
            {isAr ? 'نشط (مرئي للعملاء)' : 'Active (visible to customers)'}
          </span>
        </label>
      </div>

      {/* Errors */}
      {localError ? (
        <p className="rounded-chip border border-danger/30 bg-danger/10 px-3 py-2 text-small text-danger">
          {localError}
        </p>
      ) : null}
      {formError ? (
        <div className="rounded-chip border border-danger/30 bg-danger/10 px-3 py-2">
          <ErrorMessage error={formError} />
        </div>
      ) : null}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSaving}>
          {isAr ? 'إلغاء' : 'Cancel'}
        </Button>
        <Button type="submit" variant="primary" disabled={isSaving || slugInvalid}>
          {isSaving
            ? (isAr ? 'جارٍ الحفظ...' : 'Saving...')
            : isEdit
              ? (isAr ? 'حفظ التعديلات' : 'Save Changes')
              : (isAr ? 'إضافة القسم' : 'Add Category')}
        </Button>
      </div>
    </form>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CategoriesPage() {
  const { t, lang } = useLanguage()
  const isAr = lang === 'ar'
  const toast = useToast()

  useSeo({ title: t.admin.categoriesTitle, description: t.admin.categoriesDesc })

  const { data: categories, isLoading, isError, error, refetch } = useAdminCategoriesFull()
  const createMutation = useCreateCategory()
  const updateMutation = useUpdateCategory()
  const reorderMutation = useReorderCategories()

  // Sidebar/panel state
  const [mode, setMode] = useState<'idle' | 'add' | 'edit'>('idle')
  const [editTarget, setEditTarget] = useState<AdminCategoryWithCount | null>(null)
  const [formError, setFormError] = useState<unknown | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminCategoryWithCount | null>(null)

  const list = categories ?? []

  // ── Handlers ──────────────────────────────────────────────────────────────

  function openAdd() {
    setEditTarget(null)
    setFormError(null)
    setMode('add')
  }

  function openEdit(cat: AdminCategoryWithCount) {
    setEditTarget(cat)
    setFormError(null)
    setMode('edit')
  }

  function closePanel() {
    setMode('idle')
    setEditTarget(null)
    setFormError(null)
  }

  async function handleSave(
    values: CategoryFormState,
    imageFile: File | null,
  ) {
    setFormError(null)
    try {
      // Determine final image path
      let imagePath: string | null = editTarget?.image_url ?? null

      if (imageFile !== null) {
        // Need a category id for the upload path. For new categories, create first then upload.
        if (mode === 'add') {
          // Create without image first to get id, then update
          const created = await createMutation.mutateAsync({
            name: values.name || values.name_ar,
            name_ar: values.name_ar || null,
            slug: values.slug,
            image_url: null,
            show_on_home: values.show_on_home,
            is_active: values.is_active,
            sort_order: list.length,
          })
          const uploadedPath = await uploadCategoryImage(imageFile, created.id)
          await updateMutation.mutateAsync({
            categoryId: created.id,
            data: { image_url: uploadedPath },
          })
        } else if (editTarget) {
          imagePath = await uploadCategoryImage(imageFile, editTarget.id)
          await updateMutation.mutateAsync({
            categoryId: editTarget.id,
            data: {
              name: values.name || values.name_ar,
              name_ar: values.name_ar || null,
              slug: values.slug,
              image_url: imagePath,
              show_on_home: values.show_on_home,
              is_active: values.is_active,
            },
          })
        }
      } else if (mode === 'add') {
        await createMutation.mutateAsync({
          name: values.name || values.name_ar,
          name_ar: values.name_ar || null,
          slug: values.slug,
          image_url: null,
          show_on_home: values.show_on_home,
          is_active: values.is_active,
          sort_order: list.length,
        })
      } else if (editTarget) {
        await updateMutation.mutateAsync({
          categoryId: editTarget.id,
          data: {
            name: values.name || values.name_ar,
            name_ar: values.name_ar || null,
            slug: values.slug,
            image_url: imagePath,
            show_on_home: values.show_on_home,
            is_active: values.is_active,
          },
        })
      }

      toast.success(isAr ? 'تم حفظ القسم بنجاح' : 'Category saved successfully')
      closePanel()
    } catch (err) {
      setFormError(err)
    }
  }

  function moveUp(id: number) {
    const idx = list.findIndex((c) => c.id === id)
    if (idx <= 0) return
    const newOrder = list.map((c) => c.id)
    ;[newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]]
    reorderMutation.mutate(newOrder)
  }

  function moveDown(id: number) {
    const idx = list.findIndex((c) => c.id === id)
    if (idx < 0 || idx >= list.length - 1) return
    const newOrder = list.map((c) => c.id)
    ;[newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]]
    reorderMutation.mutate(newOrder)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const isSaving = createMutation.isPending || updateMutation.isPending

  const defaultFormValues: CategoryFormState = {
    name_ar: '',
    name: '',
    slug: '',
    show_on_home: false,
    is_active: true,
  }

  const editFormValues: CategoryFormState = editTarget
    ? {
        name_ar: editTarget.name_ar ?? '',
        name: editTarget.name,
        slug: editTarget.slug,
        show_on_home: editTarget.show_on_home,
        is_active: editTarget.is_active,
      }
    : defaultFormValues

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h2 font-bold text-text">{t.admin.categoriesTitle}</h1>
          <p className="mt-1 text-small text-text-muted">{t.admin.categoriesDesc}</p>
        </div>
        <Button
          id="add-category-btn"
          variant="primary"
          onClick={openAdd}
          disabled={mode === 'add'}
        >
          + {isAr ? 'إضافة قسم' : 'Add Category'}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Categories list */}
        <div className="space-y-3">
          {isLoading && (
            <div className="flex justify-center py-12">
              <PearlLoader loading />
            </div>
          )}

          {isError && (
            <ErrorPanel
              error={error}
              onRetry={() => void refetch()}
            />
          )}

          {!isLoading && !isError && list.length === 0 && (
            <EmptyState
              description={isAr ? 'لا توجد أقسام بعد. أضف قسمًا جديدًا.' : 'No categories yet. Add one to get started.'}
            />
          )}

          {!isLoading && !isError && list.length > 0 && (
            <div className="space-y-2">
              {list.map((cat, idx) => (
                <CategoryRow
                  key={cat.id}
                  category={cat}
                  index={idx}
                  total={list.length}
                  isAr={isAr}
                  onMoveUp={moveUp}
                  onMoveDown={moveDown}
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                />
              ))}
              {reorderMutation.isPending && (
                <p className="text-center text-small text-text-muted">
                  {isAr ? 'جارٍ حفظ الترتيب...' : 'Saving order...'}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Add / Edit panel */}
        {mode !== 'idle' && (
          <Card className="self-start p-5">
            <h2 className="mb-4 text-h3 font-bold text-text">
              {mode === 'edit'
                ? (isAr ? 'تعديل القسم' : 'Edit Category')
                : (isAr ? 'إضافة قسم جديد' : 'Add New Category')}
            </h2>
            <CategoryForm
              key={editTarget?.id ?? 'new'}
              initialValues={editFormValues}
              isAr={isAr}
              isSaving={isSaving}
              formError={formError}
              isEdit={mode === 'edit'}
              currentImagePath={editTarget?.image_url ?? null}
              onSubmit={handleSave}
              onCancel={closePanel}
            />
          </Card>
        )}
      </div>

      {/* Delete dialog */}
      {deleteTarget && (
        <DeleteCategoryDialog
          category={deleteTarget}
          otherCategories={list
            .filter((c) => c.id !== deleteTarget.id)
            .map((c) => ({ id: c.id, name: c.name, name_ar: c.name_ar }))}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

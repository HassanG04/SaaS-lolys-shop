import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useSeo } from '@/features/seo'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PearlLoader } from '@/components/ui/PearlLoader'
import { ErrorPanel } from '@/components/ui/ErrorPanel'
import { EmptyState } from '@/components/ui/EmptyState'
import { Ltr } from '@/components/ui/Ltr'
import { formatEGP } from '@/lib/format'
import { ProductPhotoButton } from './ProductPhotoButton'
import { useToast } from '@/components/ui/ToastProvider'
import { useAdminProducts, useAdminCategories, useUpdateProductActive } from './hooks'
import { StockEditDialog } from './StockEditDialog'
import { DeleteProductDialog } from './DeleteProductDialog'
import { QuickProductEditModal } from './QuickProductEditModal'
import {
  ExportCsvButton,
  formatProductsCsv,
  downloadCsv,
  getExportFilename,
} from '@/features/admin/export'
import type { AdminProduct, ActiveFilterValue, StockFilterValue } from './types'

export default function ProductsPage() {
  const { t, lang } = useLanguage()
  const isAr = lang === 'ar'
  const toast = useToast()

  useSeo({
    title: t.admin.productsTitle,
    description: t.admin.productsDesc,
  })

  // Queries
  const {
    data: products,
    isLoading: isLoadingProducts,
    isError: isProductsError,
    error: productsError,
    refetch: refetchProducts,
  } = useAdminProducts()

  const { data: categories } = useAdminCategories()

  // Mutations
  const updateActiveMutation = useUpdateProductActive()

  // Dialog state
  const [stockEditProduct, setStockEditProduct] = useState<AdminProduct | null>(null)
  const [productToDelete, setProductToDelete] = useState<AdminProduct | null>(null)
  const [quickEditProduct, setQuickEditProduct] = useState<AdminProduct | null>(null)

  // Filter state
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<ActiveFilterValue>('all')
  const [selectedStock, setSelectedStock] = useState<StockFilterValue>('all')

  const isFiltered =
    search.trim() !== '' ||
    selectedCategory !== 'all' ||
    selectedStatus !== 'all' ||
    selectedStock !== 'all'

  const handleResetFilters = () => {
    setSearch('')
    setSelectedCategory('all')
    setSelectedStatus('all')
    setSelectedStock('all')
  }

  // Filtered products list
  const filteredProducts = useMemo(() => {
    if (!products) return []

    const q = search.trim().toLowerCase()

    return products.filter((item) => {
      // 1. Search filter
      if (q) {
        const matchesName = item.name.toLowerCase().includes(q)
        const matchesNameAr = item.name_ar?.toLowerCase().includes(q)
        const matchesId = item.id.toString() === q || `#${item.id}` === q
        if (!matchesName && !matchesNameAr && !matchesId) {
          return false
        }
      }

      // 2. Category filter
      if (selectedCategory !== 'all') {
        const catId = Number(selectedCategory)
        if (item.category_id !== catId) {
          return false
        }
      }

      // 3. Active / archived status filter
      if (selectedStatus === 'active' && !item.is_active) {
        return false
      }
      if (selectedStatus === 'archived' && item.is_active) {
        return false
      }

      // 4. Stock status filter
      if (selectedStock === 'in_stock' && item.stock_quantity <= 0) {
        return false
      }
      if (selectedStock === 'low_stock' && (item.stock_quantity <= 0 || item.stock_quantity > 5)) {
        return false
      }
      if (selectedStock === 'out_of_stock' && item.stock_quantity > 0) {
        return false
      }

      return true
    })
  }, [products, search, selectedCategory, selectedStatus, selectedStock])

  // Handle active toggle
  const handleToggleActive = async (product: AdminProduct) => {
    const nextActive = !product.is_active
    try {
      await updateActiveMutation.mutateAsync({
        productId: product.id,
        isActive: nextActive,
      })
      toast.success(t.admin.activeUpdateSuccess)
    } catch {
      toast.error(isAr ? 'تعذر تحديث حالة المنتج' : 'Could not update product visibility')
    }
  }

  if (isLoadingProducts) {
    return (
      <div
        role="status"
        aria-label={isAr ? 'جارٍ تحميل المنتجات' : 'Loading products'}
        className="flex min-h-[400px] w-full items-center justify-center text-brand"
      >
        <PearlLoader loading />
      </div>
    )
  }

  if (isProductsError) {
    return (
      <div className="py-8">
        <ErrorPanel error={productsError} onRetry={() => void refetchProducts()} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="rounded-card border border-border bg-surface p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-card">
        <div>
          <h1 className="text-h1 font-bold font-accent text-brand">{t.admin.productsTitle}</h1>
          <p className="mt-2 text-body text-text-muted">{t.admin.productsDesc}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-pill bg-surface-tint border border-border px-3 py-1 text-small font-semibold text-brand">
            <Ltr>{filteredProducts.length}</Ltr> / <Ltr>{products?.length ?? 0}</Ltr>{' '}
            {t.admin.products}
          </span>
          <ExportCsvButton
            onExport={() => {
              const filename = getExportFilename('products')
              const csv = formatProductsCsv(products || [], lang)
              downloadCsv(csv, filename)
            }}
            successMessage={isAr ? 'تم تصدير ملف المنتجات بنجاح' : 'Products exported successfully'}
            disabled={isLoadingProducts || !products || products.length === 0}
          />
          <Link
            to="/admin/products/new"
            className="inline-flex items-center justify-center rounded-pill bg-brand px-4 py-2 text-small font-semibold text-brand-contrast shadow-card hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-focus"
          >
            + {isAr ? 'إضافة منتج جديد' : 'Add New Product'}
          </Link>
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="p-4 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Search Input */}
          <div className="space-y-1">
            <label
              htmlFor="products-search-input"
              className="block text-small font-semibold text-text"
            >
              {t.ui.search}
            </label>
            <input
              id="products-search-input"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.admin.searchProducts}
              className="h-11 w-full rounded-pill border border-border-input bg-bg px-4 text-body text-text placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-focus"
            />
          </div>

          {/* 2. Category Filter */}
          <div className="space-y-1">
            <label
              htmlFor="products-category-select"
              className="block text-small font-semibold text-text"
            >
              {t.admin.tableColCategory}
            </label>
            <select
              id="products-category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-11 w-full rounded-pill border border-border-input bg-bg px-4 text-body text-text focus:border-brand focus:outline-none focus:ring-2 focus:ring-focus"
            >
              <option value="all">{t.admin.categoryAll}</option>
              {categories?.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {isAr ? cat.name_ar || cat.name : cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Active / Archived Filter */}
          <div className="space-y-1">
            <label
              htmlFor="products-status-select"
              className="block text-small font-semibold text-text"
            >
              {isAr ? 'حالة التفعيل' : 'Visibility'}
            </label>
            <select
              id="products-status-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as ActiveFilterValue)}
              className="h-11 w-full rounded-pill border border-border-input bg-bg px-4 text-body text-text focus:border-brand focus:outline-none focus:ring-2 focus:ring-focus"
            >
              <option value="all">{t.admin.statusFilterAll}</option>
              <option value="active">{t.admin.statusFilterActive}</option>
              <option value="archived">{t.admin.statusFilterArchived}</option>
            </select>
          </div>

          {/* 4. Stock Status Filter */}
          <div className="space-y-1">
            <label
              htmlFor="products-stock-select"
              className="block text-small font-semibold text-text"
            >
              {t.admin.tableColStock}
            </label>
            <select
              id="products-stock-select"
              value={selectedStock}
              onChange={(e) => setSelectedStock(e.target.value as StockFilterValue)}
              className="h-11 w-full rounded-pill border border-border-input bg-bg px-4 text-body text-text focus:border-brand focus:outline-none focus:ring-2 focus:ring-focus"
            >
              <option value="all">{t.admin.stockFilterAll}</option>
              <option value="in_stock">{t.admin.stockFilterInStock}</option>
              <option value="low_stock">{t.admin.stockFilterLowStock}</option>
              <option value="out_of_stock">{t.admin.stockFilterOutOfStock}</option>
            </select>
          </div>
        </div>

        {/* Reset Filters Link / Button */}
        {isFiltered && (
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-small font-semibold text-brand hover:underline"
            >
              {t.admin.resetFilters}
            </button>
          </div>
        )}
      </Card>

      {/* Products Table or Empty State */}
      {filteredProducts.length === 0 ? (
        <Card className="p-8 sm:p-12 text-center">
          <EmptyState
            title={t.admin.noProductsFound}
            description={
              isAr
                ? 'جرّب تعديل مصطلحات البحث أو إزالة بعض عوامل التصفية لعرض المنتجات.'
                : 'Try changing your search or clearing filters to see products.'
            }
            action={
              isFiltered ? (
                <Button variant="secondary" onClick={handleResetFilters}>
                  {t.admin.resetFilters}
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0 shadow-card">
          <div className="overflow-x-auto rounded-card">
            <table className="w-full min-w-[900px] text-start">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-start text-caption font-semibold text-text-muted">
                  <th scope="col" className="p-4 text-start w-16">
                    {t.admin.tableColImage}
                  </th>
                  <th scope="col" className="p-4 text-start">
                    {t.admin.tableColName}
                  </th>
                  <th scope="col" className="p-4 text-start">
                    {t.admin.tableColCategory}
                  </th>
                  <th scope="col" className="p-4 text-start">
                    {t.admin.tableColPrice}
                  </th>
                  <th scope="col" className="p-4 text-start">
                    {t.admin.tableColStock}
                  </th>
                  <th scope="col" className="p-4 text-start text-center">
                    {t.admin.tableColActive}
                  </th>
                  <th scope="col" className="p-4 text-end">
                    {t.admin.tableColActions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {filteredProducts.map((product) => {
                  const isOutOfStock = product.stock_quantity === 0
                  const isLowStock = product.stock_quantity > 0 && product.stock_quantity <= 5
                  const categoryName =
                    (isAr
                      ? product.category?.name_ar || product.category?.name
                      : product.category?.name) || '-'

                  return (
                    <tr key={product.id} className="transition-colors hover:bg-surface-2/60">
                      {/* Image Thumbnail */}
                      <td className="p-4 align-middle">
                        <ProductPhotoButton product={product} />
                      </td>

                      {/* Product Name & ID */}
                      <td className="p-4 align-middle">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-body font-bold text-text">
                              {isAr ? product.name_ar || product.name : product.name}
                            </span>
                            {product.is_featured && (
                              <span className="rounded-chip bg-surface-tint border border-brand px-1.5 py-0.5 text-caption font-bold text-brand">
                                {isAr ? 'مميز' : 'Featured'}
                              </span>
                            )}
                          </div>
                          {isAr && product.name_ar && (
                            <span className="text-caption text-text-muted block">
                              {product.name}
                            </span>
                          )}
                          <span className="block font-mono text-caption text-text-muted">
                            <Ltr>#{product.id}</Ltr>
                          </span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="p-4 align-middle">
                        <span className="inline-block rounded-chip bg-surface-2 px-2.5 py-1 text-caption font-medium text-text border border-border">
                          {categoryName}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="p-4 align-middle">
                        <div className="space-y-0.5">
                          <span className="font-bold text-brand text-body block">
                            <Ltr>{formatEGP(product.final_price ?? product.price, lang)}</Ltr>
                          </span>
                          {product.discount_percent > 0 && (
                            <span className="text-caption text-text-muted line-through block">
                              <Ltr>{formatEGP(product.price, lang)}</Ltr>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Stock Quantity & Badge */}
                      <td className="p-4 align-middle">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-body text-text">
                            <Ltr>{product.stock_quantity}</Ltr>
                          </span>
                          {isOutOfStock ? (
                            <span className="inline-flex items-center rounded-pill bg-danger/10 border border-danger/30 px-2 py-0.5 text-caption font-semibold text-danger">
                              {t.admin.stockBadgeOutOfStock}
                            </span>
                          ) : isLowStock ? (
                            <span className="inline-flex items-center rounded-pill bg-warning/10 border border-warning/30 px-2 py-0.5 text-caption font-semibold text-warning">
                              {t.admin.stockBadgeLow}
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-pill bg-success/10 border border-success/30 px-2 py-0.5 text-caption font-semibold text-success">
                              {t.admin.stockBadgeOk}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Active Toggle Switch */}
                      <td className="p-4 align-middle text-center">
                        <div className="flex flex-col items-center gap-1">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={product.is_active}
                            aria-label={`${isAr ? product.name_ar || product.name : product.name} - ${
                              product.is_active
                                ? t.admin.activeToggleActive
                                : t.admin.activeToggleInactive
                            }`}
                            disabled={
                              updateActiveMutation.isPending &&
                              updateActiveMutation.variables?.productId === product.id
                            }
                            onClick={() => void handleToggleActive(product)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-pill transition-colors focus:outline-none focus:ring-2 focus:ring-focus ${
                              product.is_active ? 'bg-success' : 'bg-surface-2 border border-border'
                            }`}
                          >
                            <span
                              aria-hidden="true"
                              className={`pointer-events-none inline-block size-5 transform rounded-pill bg-brand-contrast shadow-card transition-transform ${
                                product.is_active ? 'translate-x-5' : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                          <span className="text-caption text-text-muted">
                            {product.is_active
                              ? t.admin.activeToggleActive
                              : t.admin.activeToggleInactive}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-4 align-middle text-end">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="secondary"
                            onClick={() => setQuickEditProduct(product)}
                            className="text-small text-brand"
                            aria-label={
                              isAr
                                ? `تعديل سريع ${product.name_ar || product.name}`
                                : `Quick edit ${product.name}`
                            }
                          >
                            ⚡ {isAr ? 'سريع' : 'Quick'}
                          </Button>
                          <Link
                            to={`/admin/products/${product.id}`}
                            className="inline-flex items-center justify-center rounded-pill border border-border bg-surface px-3 py-1 text-small font-semibold text-text hover:border-brand hover:text-brand focus:outline-none focus:ring-2 focus:ring-focus"
                            aria-label={
                              isAr
                                ? `تعديل تفاصيل ${product.name_ar || product.name}`
                                : `Edit details for ${product.name}`
                            }
                          >
                            {isAr ? 'تعديل' : 'Edit'}
                          </Link>
                          <Button
                            variant="secondary"
                            onClick={() => setStockEditProduct(product)}
                            aria-label={
                              isAr
                                ? `تعديل مخزون ${product.name_ar || product.name}`
                                : `Edit stock for ${product.name}`
                            }
                          >
                            {t.admin.editStock}
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => setProductToDelete(product)}
                            className="text-danger hover:underline p-1 text-small"
                            aria-label={
                              isAr
                                ? `حذف ${product.name_ar || product.name}`
                                : `Delete ${product.name}`
                            }
                          >
                            {isAr ? 'حذف' : 'Delete'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Inline Stock Edit Dialog */}
      <StockEditDialog product={stockEditProduct} onClose={() => setStockEditProduct(null)} />

      {/* Delete / Archive Dialog */}
      <DeleteProductDialog product={productToDelete} onClose={() => setProductToDelete(null)} />

      {/* Quick Edit Modal (Easy UI) */}
      <QuickProductEditModal
        product={quickEditProduct}
        categories={categories ?? []}
        onClose={() => setQuickEditProduct(null)}
      />
    </div>
  )
}

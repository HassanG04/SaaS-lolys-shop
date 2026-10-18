import { useLanguage } from '@/i18n/LanguageProvider'
import { PearlLoader } from '@/components/ui/PearlLoader'
import { ErrorPanel } from '@/components/ui/ErrorPanel'
import { EmptyState } from '@/components/ui/EmptyState'
import { Ltr } from '@/components/ui/Ltr'
import { formatEGP, formatNumber } from '@/lib/format'
import { Link } from 'react-router-dom'
import { useWishlistDemand } from './hooks'

export function WishlistDemandTable() {
  const { t, lang } = useLanguage()
  const isAr = lang === 'ar'
  const { data: items, isLoading, error, refetch } = useWishlistDemand()

  if (isLoading) {
    return (
      <div
        role="status"
        aria-label={isAr ? 'جارٍ تحميل طلبات المفضلة' : 'Loading wishlist demand'}
        className="flex min-h-[300px] w-full items-center justify-center text-brand"
      >
        <PearlLoader loading />
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-6">
        <ErrorPanel error={error} onRetry={() => void refetch()} />
      </div>
    )
  }

  const demandList = items ?? []

  if (demandList.length === 0) {
    return (
      <EmptyState
        title={isAr ? 'لا توجد بيانات تفضيل حتى الآن' : 'No wishlist demand data yet'}
        description={
          isAr
            ? 'عندما يقوم العملاء بإضافة المنتجات إلى قوائم المفضلة، ستظهر هنا المنتجات الأكثر طلبًا.'
            : 'When customers add products to their favorites, prioritized demand will appear here.'
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-card border border-border bg-surface shadow-card">
        <table className="w-full text-small text-text">
          <thead>
            <tr className="border-b border-border bg-surface-2 text-start font-semibold text-text-muted">
              <th scope="col" className="p-3.5 text-start">
                {t.admin.products}
              </th>
              <th scope="col" className="p-3.5 text-center">
                {isAr ? 'عدد مرات التفضيل' : 'Wishlist Count'}
              </th>
              <th scope="col" className="p-3.5 text-start">
                {t.admin.tableColPrice}
              </th>
              <th scope="col" className="p-3.5 text-start">
                {t.admin.tableColStock}
              </th>
              <th scope="col" className="p-3.5 text-end">
                {t.admin.tableColActions}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {demandList.map((item) => {
              const name = isAr ? item.product_name_ar || item.product_name : item.product_name
              return (
                <tr key={item.product_id} className="hover:bg-surface-2/60 transition-colors">
                  <td className="p-3.5">
                    <div className="flex items-center gap-3">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt=""
                          className="size-11 rounded-chip object-cover border border-border shrink-0 bg-bg"
                        />
                      ) : (
                        <div className="size-11 rounded-chip border border-border bg-surface-2 flex items-center justify-center shrink-0">
                          <svg
                            className="size-5 text-text-muted"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                          >
                            <rect width="18" height="18" x="3" y="3" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path d="m21 15-5-5L5 21" />
                          </svg>
                        </div>
                      )}
                      <div>
                        <span className="font-semibold text-text block">{name}</span>
                        <span className="text-caption text-text-muted">#{item.product_id}</span>
                      </div>
                    </div>
                  </td>

                  <td className="p-3.5 text-center">
                    <span className="inline-flex items-center gap-1.5 rounded-pill bg-danger/10 border border-danger/20 px-3 py-1 font-bold text-danger text-small">
                      <svg className="size-3.5 shrink-0 fill-current" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                      <Ltr>{formatNumber(item.wishlist_count)}</Ltr>
                    </span>
                  </td>

                  <td className="p-3.5">
                    <div className="flex flex-col">
                      <span className="font-semibold text-brand">
                        <Ltr>{formatEGP(item.final_price)}</Ltr>
                      </span>
                      {item.discount_percent > 0 && (
                        <span className="text-caption text-text-muted line-through">
                          <Ltr>{formatEGP(item.price)}</Ltr>
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="p-3.5">
                    {item.stock_quantity <= 0 ? (
                      <span className="rounded-pill bg-danger/10 text-danger border border-danger/20 px-2.5 py-0.5 text-caption font-semibold">
                        {t.cart.outOfStock}
                      </span>
                    ) : item.stock_quantity <= 5 ? (
                      <span className="rounded-pill bg-warning/10 text-warning border border-warning/20 px-2.5 py-0.5 text-caption font-semibold">
                        {isAr
                          ? `متبقي ${item.stock_quantity} فقط`
                          : `Only ${item.stock_quantity} left`}
                      </span>
                    ) : (
                      <span className="rounded-pill bg-success/10 text-success border border-success/20 px-2.5 py-0.5 text-caption font-semibold">
                        <Ltr>{item.stock_quantity}</Ltr> {isAr ? 'قطعة' : 'units'}
                      </span>
                    )}
                  </td>

                  <td className="p-3.5 text-end">
                    <Link
                      to={`/admin/products/${item.product_id}`}
                      className="inline-flex h-9 items-center rounded-pill border border-border bg-surface-2 px-3 text-caption font-semibold text-text hover:border-brand hover:text-brand focus:ring-2"
                    >
                      {t.admin.editProduct}
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

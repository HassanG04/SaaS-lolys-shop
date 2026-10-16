import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PearlLoader } from '@/components/ui/PearlLoader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ErrorPanel } from '@/components/ui/ErrorPanel'
import { EmptyState } from '@/components/ui/EmptyState'
import { PaymentStatusBadge } from '@/features/orders/components/PaymentStatusBadge'
import { formatEGP, formatDate } from '@/lib/format'
import { useLanguage } from '@/i18n/LanguageProvider'
import { Ltr } from '@/components/ui/Ltr'
import { useAdminPaymentOrders } from './hooks'
import { ProofViewerModal } from './ProofViewerModal'
import { PaymentReviewDialog } from './PaymentReviewDialog'
import { PurgeProofsDialog } from './PurgeProofsDialog'
import type { AdminPaymentOrder, PaymentReviewFilter, PaymentStatus } from './types'

const FILTER_TABS: Array<{ key: 'all' | PaymentStatus; labelAr: string; labelEn: string }> = [
  { key: 'under_review', labelAr: 'قيد المراجعة', labelEn: 'Under Review' },
  { key: 'all', labelAr: 'الكل', labelEn: 'All' },
  { key: 'paid', labelAr: 'مدفوع', labelEn: 'Paid' },
  { key: 'rejected', labelAr: 'مرفوض', labelEn: 'Rejected' },
  { key: 'awaiting_proof', labelAr: 'بانتظار الإثبات', labelEn: 'Awaiting Proof' },
]

export default function PaymentsPage() {
  const { lang } = useLanguage()
  const isAr = lang === 'ar'

  const [searchParams, setSearchParams] = useSearchParams()
  const requestedOrder = searchParams.get('order')
  const parsedOrder = requestedOrder && /^\d+$/.test(requestedOrder) ? Number(requestedOrder) : 0
  const orderId = Number.isSafeInteger(parsedOrder) && parsedOrder > 0 ? parsedOrder : undefined
  const [selectedStatus, setSelectedStatus] = useState<'all' | PaymentStatus>(
    orderId ? 'all' : 'under_review',
  )
  const [search, setSearch] = useState('')

  const filters: PaymentReviewFilter = useMemo(
    () => ({
      status: selectedStatus,
      search,
      orderId,
    }),
    [selectedStatus, search, orderId],
  )

  const { data: orders = [], isLoading, error, refetch } = useAdminPaymentOrders(filters)

  // Dialog & Modal selection state by order ID
  const [viewerOrderId, setViewerOrderId] = useState<number | null>(null)
  const [reviewOrderId, setReviewOrderId] = useState<number | null>(null)
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve')
  const [purgeDialogOpen, setPurgeDialogOpen] = useState(false)

  const viewerOrder = useMemo(
    () => (viewerOrderId !== null ? (orders.find((o) => o.id === viewerOrderId) ?? null) : null),
    [viewerOrderId, orders],
  )

  const reviewOrder = useMemo(
    () => (reviewOrderId !== null ? (orders.find((o) => o.id === reviewOrderId) ?? null) : null),
    [reviewOrderId, orders],
  )

  const openReview = (order: AdminPaymentOrder, action: 'approve' | 'reject') => {
    setReviewOrderId(order.id)
    setReviewAction(action)
  }

  const openViewer = (order: AdminPaymentOrder) => {
    setViewerOrderId(order.id)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-h1 font-bold font-accent text-brand">
            {isAr ? 'مراجعة المدفوعات' : 'Payment Review'}
          </h1>
          <p className="text-body text-text-muted mt-1">
            {isAr
              ? 'مراجعة إيصالات التحويل عبر إنستاباي وقبولها أو رفضها، وتطهير الإثباتات القديمة.'
              : 'Review InstaPay payment proofs, approve or reject, and purge old proofs.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {orderId && (
            <Button
              variant="secondary"
              onClick={() => {
                setSearchParams({})
                setSelectedStatus('under_review')
              }}
            >
              {isAr ? `إلغاء تصفية الطلب #${orderId}` : `Clear order #${orderId} filter`}
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            onClick={() => setPurgeDialogOpen(true)}
            className="border border-border"
          >
            <span className="me-1.5" aria-hidden="true">
              🛡️
            </span>
            <span>{isAr ? 'تطهير الإثباتات القديمة' : 'Purge Old Proofs'}</span>
          </Button>

          <span className="rounded-pill border border-border bg-surface-2 px-3 py-1 text-small font-semibold text-text">
            {orders.length} {isAr ? 'طلب' : 'orders'}
          </span>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="rounded-card border border-border bg-surface p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-2 w-full md:w-auto" role="tablist">
            {FILTER_TABS.map((tab) => {
              const active = selectedStatus === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedStatus(tab.key)}
                  className={`rounded-pill px-3.5 py-1.5 text-small font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                    active
                      ? 'bg-brand text-brand-contrast'
                      : 'border border-border bg-surface-2 text-text hover:border-brand/40 hover:text-brand'
                  }`}
                >
                  {isAr ? tab.labelAr : tab.labelEn}
                </button>
              )
            })}
          </div>

          {/* Search Box */}
          <div className="w-full md:w-80">
            <Input
              label={isAr ? 'البحث' : 'Search'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                isAr
                  ? 'ابحث بالطلب #ID، العميل، أو مرجع التحويل...'
                  : 'Search by #ID, customer, or reference...'
              }
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div
          role="status"
          aria-label={isAr ? 'جارٍ التحميل...' : 'Loading...'}
          className="flex h-64 items-center justify-center text-brand"
        >
          <PearlLoader loading />
        </div>
      ) : error ? (
        <ErrorPanel
          title={isAr ? 'تعذر تحميل المدفوعات' : 'Failed to load payments'}
          onRetry={() => void refetch()}
        />
      ) : orders.length === 0 ? (
        <EmptyState
          title={
            selectedStatus === 'under_review'
              ? isAr
                ? 'لا توجد طلبات قيد المراجعة حاليًا'
                : 'No orders under review at this time'
              : isAr
                ? 'لا توجد طلبات مطابقة للبحث'
                : 'No orders match your filter criteria'
          }
          description={
            isAr
              ? 'تظهر هنا طلبات الدفع عبر إنستاباي لمراجعة إيصالات التحويل الخاصة بها.'
              : 'InstaPay payment requests will appear here for verification.'
          }
        />
      ) : (
        <div className="rounded-card border border-border bg-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-small text-text">
              <thead className="border-b border-border bg-surface-2 text-caption font-semibold text-text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 text-start">
                    {isAr ? 'رقم الطلب' : 'Order ID'}
                  </th>
                  <th scope="col" className="px-4 py-3 text-start">
                    {isAr ? 'العميل' : 'Customer'}
                  </th>
                  <th scope="col" className="px-4 py-3 text-start">
                    {isAr ? 'المبلغ' : 'Amount'}
                  </th>
                  <th scope="col" className="px-4 py-3 text-start">
                    {isAr ? 'مرجع التحويل' : 'Reference'}
                  </th>
                  <th scope="col" className="px-4 py-3 text-start">
                    {isAr ? 'المهلة / الإرسال' : 'Deadline / Submitted'}
                  </th>
                  <th scope="col" className="px-4 py-3 text-start">
                    {isAr ? 'الإثبات' : 'Proof'}
                  </th>
                  <th scope="col" className="px-4 py-3 text-start">
                    {isAr ? 'الحالة' : 'Status'}
                  </th>
                  <th scope="col" className="px-4 py-3 text-end">
                    {isAr ? 'الإجراءات' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((order) => {
                  const hasProof = Boolean(order.payment_proof_path)
                  const isUnderReview = order.payment_status === 'under_review'

                  return (
                    <tr
                      key={order.id}
                      className="transition-colors hover:bg-surface-2/60 focus-within:bg-surface-2/60"
                    >
                      {/* Order ID & Date */}
                      <td className="px-4 py-3 font-semibold text-brand whitespace-nowrap">
                        <div>
                          <Ltr>#{order.id}</Ltr>
                        </div>
                        <div className="text-caption font-normal text-text-muted">
                          {formatDate(order.created_at, undefined, lang)}
                        </div>
                      </td>

                      {/* Customer Info */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium text-text">{order.ship_name}</div>
                        <div className="text-caption text-text-muted">
                          <Ltr>{order.ship_phone}</Ltr>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 font-bold text-brand whitespace-nowrap">
                        {formatEGP(order.total, lang)}
                      </td>

                      {/* Reference Code */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {order.payment_reference ? (
                          <code
                            dir="ltr"
                            className="rounded-chip border border-border bg-surface-2 px-2 py-0.5 font-mono text-caption font-bold text-text"
                          >
                            {order.payment_reference}
                          </code>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>

                      {/* Deadline or Submitted Date */}
                      <td className="px-4 py-3 text-caption text-text-muted whitespace-nowrap">
                        {order.payment_submitted_at ? (
                          <div>
                            <span className="font-medium text-text">
                              {isAr ? 'أُرسل:' : 'Sent:'}{' '}
                            </span>
                            {formatDate(order.payment_submitted_at, undefined, lang)}
                          </div>
                        ) : order.payment_deadline ? (
                          <div>
                            <span className="font-medium text-text">
                              {isAr ? 'المهلة:' : 'Deadline:'}{' '}
                            </span>
                            {formatDate(order.payment_deadline, undefined, lang)}
                          </div>
                        ) : (
                          <span>—</span>
                        )}
                      </td>

                      {/* Proof Link / Thumbnail */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {hasProof ? (
                          <button
                            type="button"
                            onClick={() => openViewer(order)}
                            className="inline-flex items-center gap-1.5 rounded-pill border border-brand/30 bg-surface px-2.5 py-1 text-caption font-semibold text-brand transition-colors hover:bg-brand hover:text-brand-contrast focus:outline-none focus:ring-2 focus:ring-focus"
                          >
                            <svg
                              className="size-3.5"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                              <circle cx="9" cy="9" r="2" />
                              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                            </svg>
                            <span>{isAr ? 'عرض الإثبات' : 'View Proof'}</span>
                          </button>
                        ) : (
                          <span className="text-caption text-text-muted">
                            {isAr ? 'بدون إثبات' : 'No proof'}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <PaymentStatusBadge status={order.payment_status} />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-end whitespace-nowrap">
                        {isUnderReview ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              variant="primary"
                              className="px-3 py-1 text-caption"
                              onClick={() => openReview(order, 'approve')}
                            >
                              {isAr ? 'قبول' : 'Approve'}
                            </Button>
                            <Button
                              type="button"
                              variant="danger"
                              className="px-3 py-1 text-caption"
                              onClick={() => openReview(order, 'reject')}
                            >
                              {isAr ? 'رفض' : 'Reject'}
                            </Button>
                          </div>
                        ) : (
                          <span className="text-caption text-text-muted">
                            {order.payment_review_note ? (
                              <span title={order.payment_review_note}>
                                {isAr ? 'توجد ملاحظة' : 'Note recorded'}
                              </span>
                            ) : (
                              '—'
                            )}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Proof Viewer Modal */}
      {viewerOrder ? (
        <ProofViewerModal
          open={viewerOrderId !== null}
          order={viewerOrder}
          onClose={() => setViewerOrderId(null)}
        />
      ) : null}

      {/* Payment Review Dialog (Approve / Reject) */}
      {reviewOrder ? (
        <PaymentReviewDialog
          open={reviewOrderId !== null}
          order={reviewOrder}
          action={reviewAction}
          onClose={() => setReviewOrderId(null)}
          onSuccess={() => void refetch()}
        />
      ) : null}

      {/* Purge Old Proofs Dialog */}
      <PurgeProofsDialog
        open={purgeDialogOpen}
        onClose={() => setPurgeDialogOpen(false)}
        onSuccess={() => void refetch()}
      />
    </div>
  )
}

import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { PearlLoader } from '@/components/ui/PearlLoader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ErrorPanel } from '@/components/ui/ErrorPanel'
import { PaymentStatusBadge } from '@/features/orders/components/PaymentStatusBadge'
import { formatEGP, formatDate } from '@/lib/format'
import { useLanguage } from '@/i18n/LanguageProvider'
import { Ltr } from '@/components/ui/Ltr'
import { useAdminOrders } from './hooks'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, DELIVERY_METHOD_LABELS } from './transitions'
import { OrderDetailModal } from './OrderDetailModal'
import { OrderStatusDialog } from './OrderStatusDialog'
import { OrderFulfillmentDialog } from './OrderFulfillmentDialog'
import {
  ExportCsvButton,
  formatOrdersCsv,
  downloadCsv,
  getExportFilename,
} from '@/features/admin/export'
import type { AdminOrder, AdminOrderFilters } from './types'
import type { OrderStatus, PaymentStatus } from '@/features/orders/types'

const STATUS_TABS: Array<{ key: 'all' | OrderStatus | 'awaiting_approval'; label: string }> = [
  { key: 'all', label: 'الكل' },
  { key: 'awaiting_approval', label: 'بانتظار الموافقة' },
  { key: 'pending', label: 'قيد الانتظار' },
  { key: 'confirmed', label: 'مؤكد' },
  { key: 'shipped', label: 'تم الشحن' },
  { key: 'delivered', label: 'تم التوصيل' },
  { key: 'cancelled', label: 'ملغي' },
]

const PAYMENT_STATUS_OPTIONS: Array<{ key: 'all' | PaymentStatus; label: string }> = [
  { key: 'all', label: 'كل حالات الدفع' },
  { key: 'awaiting_approval', label: 'بانتظار الموافقة' },
  { key: 'unpaid', label: 'غير مدفوع' },
  { key: 'awaiting_proof', label: 'بانتظار الإثبات' },
  { key: 'under_review', label: 'قيد المراجعة' },
  { key: 'paid', label: 'مدفوع' },
  { key: 'rejected', label: 'مرفوض' },
]

export default function OrdersPage() {
  const { lang } = useLanguage()
  const isAr = lang === 'ar'
  const params = useParams<{ id?: string }>()
  const routeOrderId = params.id ? Number(params.id) : null

  const [search, setSearch] = useState('')
  const [selectedTab, setSelectedTab] = useState<'all' | OrderStatus | 'awaiting_approval'>('all')
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<'all' | PaymentStatus>('all')

  const filters: AdminOrderFilters = useMemo(() => {
    let status: 'all' | OrderStatus = 'all'
    let payment_status: 'all' | PaymentStatus = selectedPaymentStatus

    if (selectedTab === 'awaiting_approval') {
      status = 'all'
      payment_status = 'awaiting_approval'
    } else {
      status = selectedTab
    }

    return {
      search,
      status,
      payment_status,
    }
  }, [search, selectedTab, selectedPaymentStatus])

  const { data: orders = [], isLoading, error, refetch } = useAdminOrders(filters)

  // Dialog & Modal states
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(routeOrderId ?? null)
  const selectedOrder = useMemo(
    () => (selectedOrderId ? (orders.find((o) => o.id === selectedOrderId) ?? null) : null),
    [selectedOrderId, orders],
  )
  const [statusDialogOrder, setStatusDialogOrder] = useState<AdminOrder | null>(null)
  const [targetStatus, setTargetStatus] = useState<OrderStatus | null>(null)
  const [fulfillmentDialogOrder, setFulfillmentDialogOrder] = useState<AdminOrder | null>(null)

  const openStatusDialog = (order: AdminOrder, status: OrderStatus) => {
    setStatusDialogOrder(order)
    setTargetStatus(status)
  }

  const openFulfillmentDialog = (order: AdminOrder) => {
    setFulfillmentDialogOrder(order)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-h1 font-bold font-accent text-brand">
            {isAr ? 'إدارة الطلبات' : 'Orders Management'}
          </h1>
          <p className="text-body text-text-muted mt-1">
            {isAr
              ? 'استعراض وإدارة طلبات العملاء وتحديث مراحل الشحن والتوصيل'
              : 'View and manage customer orders and fulfillment'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
          <span className="rounded-pill border border-border bg-surface-2 px-3 py-1 text-small font-semibold text-text">
            {orders.length} {isAr ? 'طلب' : 'orders'}
          </span>
          <ExportCsvButton
            onExport={() => {
              const filename = getExportFilename('orders')
              const csv = formatOrdersCsv(orders, lang)
              downloadCsv(csv, filename)
            }}
            successMessage={isAr ? 'تم تصدير ملف الطلبات بنجاح' : 'Orders exported successfully'}
            disabled={isLoading || orders.length === 0}
          />
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="rounded-card border border-border bg-surface p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          {/* Search Input */}
          <div className="md:col-span-2">
            <Input
              id="orders-search-input"
              label={isAr ? 'بحث في الطلبات' : 'Search Orders'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                isAr
                  ? 'ابحث برقم الطلب (#ID) أو اسم العميل أو الهاتف أو رقم التتبع…'
                  : 'Search by order #, customer name, phone, or tracking #...'
              }
            />
          </div>

          {/* Payment Status Dropdown */}
          <div>
            <label
              htmlFor="payment-status-select"
              className="block text-caption font-semibold text-text mb-1"
            >
              {isAr ? 'حالة الدفع' : 'Payment Status'}
            </label>
            <select
              id="payment-status-select"
              value={selectedPaymentStatus}
              onChange={(e) => setSelectedPaymentStatus(e.target.value as 'all' | PaymentStatus)}
              className="w-full h-11 rounded-pill border border-border-input bg-bg px-4 text-small text-text focus:border-brand focus:outline-none focus:ring-2 focus:ring-focus"
            >
              {PAYMENT_STATUS_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Tabs */}
        <div>
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
            {STATUS_TABS.map((tab) => {
              const isActive = selectedTab === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setSelectedTab(tab.key)
                    if (tab.key === 'awaiting_approval') {
                      setSelectedPaymentStatus('awaiting_approval')
                    } else if (selectedPaymentStatus === 'awaiting_approval') {
                      setSelectedPaymentStatus('all')
                    }
                  }}
                  className={`rounded-pill px-3 py-1.5 text-caption sm:text-small font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-focus ${
                    isActive
                      ? 'bg-brand text-brand-contrast'
                      : 'border border-border bg-surface-2 text-text hover:border-brand'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <PearlLoader loading />
        </div>
      ) : error ? (
        <ErrorPanel
          error={error}
          onRetry={() => refetch()}
          title={isAr ? 'تعذّر تحميل الطلبات' : 'Failed to load orders'}
        />
      ) : orders.length === 0 ? (
        <div className="rounded-card border border-border bg-surface p-12 text-center text-text-muted">
          <p className="text-body font-semibold">
            {isAr
              ? 'لا توجد طلبات تطابق معايير البحث والفلترة'
              : 'No orders match the selected filters'}
          </p>
          <Button
            variant="ghost"
            className="mt-4"
            onClick={() => {
              setSearch('')
              setSelectedTab('all')
              setSelectedPaymentStatus('all')
            }}
          >
            {isAr ? 'إعادة ضبط الفلاتر' : 'Reset filters'}
          </Button>
        </div>
      ) : (
        <div className="rounded-card border border-border bg-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-small text-text">
              <thead className="border-b border-border bg-surface-2 text-caption font-bold text-text-muted uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 text-start">
                    {isAr ? 'رقم الطلب' : 'Order #'}
                  </th>
                  <th scope="col" className="px-4 py-3 text-start">
                    {isAr ? 'التاريخ' : 'Date'}
                  </th>
                  <th scope="col" className="px-4 py-3 text-start">
                    {isAr ? 'العميل' : 'Customer'}
                  </th>
                  <th scope="col" className="px-4 py-3 text-start">
                    {isAr ? 'طريقة التوصيل' : 'Delivery'}
                  </th>
                  <th scope="col" className="px-4 py-3 text-start">
                    {isAr ? 'المنتجات' : 'Items'}
                  </th>
                  <th scope="col" className="px-4 py-3 text-start">
                    {isAr ? 'الإجمالي' : 'Total'}
                  </th>
                  <th scope="col" className="px-4 py-3 text-start">
                    {isAr ? 'حالة الدفع' : 'Payment'}
                  </th>
                  <th scope="col" className="px-4 py-3 text-start">
                    {isAr ? 'حالة الطلب' : 'Status'}
                  </th>
                  <th scope="col" className="px-4 py-3 text-end">
                    {isAr ? 'الإجراءات' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((order) => {
                  const statusColor =
                    ORDER_STATUS_COLORS[order.status] ?? ORDER_STATUS_COLORS.pending

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-surface-2/60 transition-colors cursor-pointer"
                      onClick={() => setSelectedOrderId(order.id)}
                    >
                      {/* Order ID */}
                      <td className="px-4 py-3 font-mono font-bold text-brand">
                        <Ltr>#{order.id}</Ltr>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-caption text-text-muted whitespace-nowrap">
                        {formatDate(order.created_at, undefined, lang)}
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-text">{order.ship_name}</div>
                        <div className="text-caption font-mono text-text-muted">
                          <Ltr>{order.ship_phone}</Ltr>
                        </div>
                      </td>

                      {/* Delivery */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div>{DELIVERY_METHOD_LABELS[order.delivery_method]}</div>
                        {order.tracking_number ? (
                          <div className="text-caption font-mono text-text-muted">
                            {order.tracking_number}
                          </div>
                        ) : order.rep_name ? (
                          <div className="text-caption text-text-muted">{order.rep_name}</div>
                        ) : null}
                      </td>

                      {/* Items */}
                      <td className="px-4 py-3 text-caption whitespace-nowrap">
                        <span className="font-semibold">
                          {order.order_items.reduce((acc, i) => acc + i.quantity, 0)}
                        </span>{' '}
                        {isAr ? 'قطعة' : 'pcs'}
                      </td>

                      {/* Total */}
                      <td className="px-4 py-3 font-bold whitespace-nowrap text-brand">
                        {formatEGP(order.total, lang)}
                      </td>

                      {/* Payment Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <PaymentStatusBadge status={order.payment_status} />
                      </td>

                      {/* Order Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-0.5 text-caption font-semibold ${statusColor.bg} ${statusColor.borderClass} ${statusColor.text}`}
                        >
                          <span
                            className={`size-1.5 rounded-pill ${statusColor.dot}`}
                            aria-hidden="true"
                          />
                          <span>{ORDER_STATUS_LABELS[order.status]}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td
                        className="px-4 py-3 text-end whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant={
                            order.payment_status === 'awaiting_approval' ? 'primary' : 'ghost'
                          }
                          size="default"
                          onClick={() => setSelectedOrderId(order.id)}
                        >
                          {order.payment_status === 'awaiting_approval'
                            ? isAr
                              ? 'مراجعة وموافقة'
                              : 'Review & Approve'
                            : isAr
                              ? 'عرض'
                              : 'View'}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <OrderDetailModal
        open={selectedOrder !== null}
        order={selectedOrder}
        onClose={() => setSelectedOrderId(null)}
        onChangeStatus={(order, status) => openStatusDialog(order, status)}
        onEditFulfillment={(order) => openFulfillmentDialog(order)}
      />

      {/* Status Transition Dialog */}
      {statusDialogOrder && targetStatus && (
        <OrderStatusDialog
          key={`${statusDialogOrder.id}-${targetStatus}`}
          open
          order={statusDialogOrder}
          targetStatus={targetStatus}
          onClose={() => {
            setStatusDialogOrder(null)
            setTargetStatus(null)
          }}
          onSuccess={() => {
            refetch()
          }}
        />
      )}

      {/* Fulfillment Dialog */}
      {fulfillmentDialogOrder && (
        <OrderFulfillmentDialog
          key={fulfillmentDialogOrder.id}
          open
          order={fulfillmentDialogOrder}
          onClose={() => setFulfillmentDialogOrder(null)}
          onSuccess={() => {
            refetch()
          }}
        />
      )}
    </div>
  )
}

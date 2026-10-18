import { useMemo, useState } from 'react'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorPanel } from '@/components/ui/ErrorPanel'
import { PearlLoader } from '@/components/ui/PearlLoader'
import { Ltr } from '@/components/ui/Ltr'
import { useLanguage } from '@/i18n/LanguageProvider'
import { formatEGP, formatNumber } from '@/lib/format'
import {
  ExportCsvButton,
  formatCustomersCsv,
  downloadCsv,
  getExportFilename,
} from '@/features/admin/export'
import { AdminSuggestionsTable } from '@/features/admin/suggestions/AdminSuggestionsTable'
import { useCustomerStats } from './hooks'

export default function CustomersPage() {
  const { t, lang } = useLanguage()
  const isAr = lang === 'ar'
  const [activeTab, setActiveTab] = useState<'customers' | 'suggestions'>('customers')
  const [searchQuery, setSearchQuery] = useState('')
  const { data: customers, isLoading, error, refetch } = useCustomerStats()

  const filteredCustomers = useMemo(() => {
    if (!customers) return []
    const q = searchQuery.trim().toLowerCase()
    if (!q) return customers

    return customers.filter((c) => {
      const nameMatch = c.full_name?.toLowerCase().includes(q) ?? false
      const phoneMatch = c.phone?.toLowerCase().includes(q) ?? false
      const productMatch = c.favorite_product_name?.toLowerCase().includes(q) ?? false
      return nameMatch || phoneMatch || productMatch
    })
  }, [customers, searchQuery])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-h1 font-bold font-accent text-(--color-brand)">
              {t.admin.customers}
            </h1>
            {customers && (
              <span className="rounded-(--radius-pill) bg-(--color-surface-2) px-3 py-1 text-caption font-semibold text-(--color-brand)">
                {formatNumber(customers.length)}
              </span>
            )}
          </div>
          <p className="mt-1 text-body text-(--color-text-muted)">{t.admin.customersDesc}</p>
        </div>

        <div className="flex items-center gap-3">
          <ExportCsvButton
            onExport={() => {
              const filename = getExportFilename('customers')
              const csv = formatCustomersCsv(customers || [], lang)
              downloadCsv(csv, filename)
            }}
            successMessage={isAr ? 'تم تصدير ملف العملاء بنجاح' : 'Customers exported successfully'}
            disabled={isLoading || !customers || customers.length === 0}
          />
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('customers')}
          className={`h-10 rounded-pill px-5 text-small font-semibold transition-all ${
            activeTab === 'customers'
              ? 'bg-brand text-brand-contrast'
              : 'border border-border bg-surface-2 text-text-muted hover:text-text'
          }`}
        >
          {t.admin.customers}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('suggestions')}
          className={`h-10 rounded-pill px-5 text-small font-semibold transition-all ${
            activeTab === 'suggestions'
              ? 'bg-brand text-brand-contrast'
              : 'border border-border bg-surface-2 text-text-muted hover:text-text'
          }`}
        >
          {isAr ? 'اقتراحات العملاء' : 'Customer Suggestions'}
        </button>
      </div>

      {activeTab === 'suggestions' ? (
        <AdminSuggestionsTable />
      ) : (
        <>
          {/* Role Security Note: Read-only explanation under runbook */}
          <div className="flex items-center gap-3 rounded-(--radius-card) border border-(--color-border) bg-(--color-surface-2) p-4 text-small text-(--color-text-muted)">
            <svg
              className="size-5 shrink-0 text-(--color-brand)"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>{t.admin.roleReadOnlyNote}</span>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-md">
            <label htmlFor="customer-search" className="sr-only">
              {t.admin.searchCustomers}
            </label>
            <div className="relative">
              <input
                id="customer-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.admin.searchCustomers}
                className="w-full h-11 rounded-(--radius-pill) border border-(--color-border-input) bg-(--color-surface) ps-11 pe-4 text-small text-(--color-text) placeholder:text-(--color-text-muted) focus:border-(--color-brand) focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
              />
              <div
                className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-4 text-(--color-text-muted)"
                aria-hidden="true"
              >
                <svg
                  className="size-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </div>
            </div>
          </div>

          {/* Content States */}
          {isLoading ? (
            <div
              role="status"
              aria-label="Loading customer statistics"
              className="flex h-64 w-full items-center justify-center text-(--color-brand)"
            >
              <PearlLoader loading />
            </div>
          ) : error ? (
            <ErrorPanel error={error} onRetry={() => void refetch()} retryLabel="إعادة المحاولة" />
          ) : filteredCustomers.length === 0 ? (
            <EmptyState
              title={t.admin.noCustomers}
              description="جرّب البحث بكلمة أخرى أو مسح حقل البحث."
            />
          ) : (
            /* Customers Table */
            <div className="overflow-x-auto rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) shadow-(--shadow-card)">
              <table className="w-full text-start text-small" aria-label={t.admin.customers}>
                <thead className="border-b border-(--color-border) bg-(--color-surface-2) text-caption font-semibold text-(--color-text-muted)">
                  <tr>
                    <th scope="col" className="px-4 py-3.5 text-start font-semibold">
                      {t.admin.customerName}
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-start font-semibold">
                      {t.admin.customerPhone}
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-start font-semibold">
                      {t.admin.customerRole}
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-start font-semibold">
                      {t.admin.customerOrders}
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-start font-semibold">
                      {t.admin.customerSpent}
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-start font-semibold">
                      {t.admin.customerFavorite}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--color-border)">
                  {filteredCustomers.map((customer) => (
                    <tr
                      key={customer.user_id}
                      className="transition-colors hover:bg-(--color-surface-2)/50"
                    >
                      {/* Name */}
                      <td className="px-4 py-4 font-semibold text-(--color-text)">
                        {customer.full_name || '—'}
                      </td>

                      {/* Phone */}
                      <td className="px-4 py-4 text-(--color-text-muted)">
                        {customer.phone ? <Ltr>{customer.phone}</Ltr> : '—'}
                      </td>

                      {/* Role (Read-only Badge: No create, promote or demote UI) */}
                      <td className="px-4 py-4">
                        <span
                          aria-readonly="true"
                          data-role={customer.role}
                          className={`inline-flex items-center gap-1.5 rounded-(--radius-pill) px-2.5 py-1 text-caption font-semibold ${
                            customer.role === 'admin'
                              ? 'bg-(--color-brand) text-(--color-brand-contrast)'
                              : 'border border-(--color-border) bg-(--color-surface-2) text-(--color-text-muted)'
                          }`}
                        >
                          {customer.role === 'admin' && (
                            <svg
                              className="size-3 shrink-0"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                          )}
                          <span>
                            {customer.role === 'admin' ? t.admin.roleAdmin : t.admin.roleCustomer}
                          </span>
                        </span>
                      </td>

                      {/* Orders Count */}
                      <td className="px-4 py-4 text-(--color-text)">
                        {formatNumber(customer.orders_count)}
                      </td>

                      {/* Total Spent */}
                      <td className="px-4 py-4 font-semibold text-(--color-brand)">
                        {formatEGP(customer.total_spent)}
                      </td>

                      {/* Favorite Product */}
                      <td className="px-4 py-4 text-(--color-text-muted)">
                        {customer.favorite_product_name || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

import { useLanguage } from '../../../i18n/LanguageProvider'
import { formatEGP, formatNumber } from '../../../lib/format'
import type { DashboardTopCustomer, DashboardTopProduct } from './types'

interface DashboardTopListsProps {
  topProducts: DashboardTopProduct[]
  topCustomers: DashboardTopCustomer[]
}

export function DashboardTopLists({ topProducts, topCustomers }: DashboardTopListsProps) {
  const { t, lang } = useLanguage()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Top Products */}
      <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-5 sm:p-6 shadow-(--shadow-card)">
        <h3 className="text-h3 font-bold font-accent text-(--color-brand) mb-4">
          {t.admin.topProducts}
        </h3>
        {topProducts.length === 0 ? (
          <p className="text-small text-(--color-text-muted)">{t.admin.noTopProducts}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-small">
              <thead>
                <tr className="border-b border-(--color-border) text-caption text-(--color-text-muted)">
                  <th className="pb-2 text-start font-semibold">{t.admin.products}</th>
                  <th className="pb-2 text-start font-semibold">{t.admin.unitsSold}</th>
                  <th className="pb-2 text-start font-semibold">{t.admin.totalSales}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--color-border)/50">
                {topProducts.map((product) => (
                  <tr key={product.product_id} className="text-(--color-text)">
                    <td className="py-2.5 font-medium">{product.name}</td>
                    <td className="py-2.5 font-semibold text-(--color-text-muted)">
                      {formatNumber(product.units, undefined, lang)}
                    </td>
                    <td className="py-2.5 font-bold text-(--color-brand)">
                      {formatEGP(product.sales, lang)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2. Top Customers */}
      <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-5 sm:p-6 shadow-(--shadow-card)">
        <h3 className="text-h3 font-bold font-accent text-(--color-brand) mb-4">
          {t.admin.topCustomers}
        </h3>
        {topCustomers.length === 0 ? (
          <p className="text-small text-(--color-text-muted)">{t.admin.noTopCustomers}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-small">
              <thead>
                <tr className="border-b border-(--color-border) text-caption text-(--color-text-muted)">
                  <th className="pb-2 text-start font-semibold">{t.admin.customerName}</th>
                  <th className="pb-2 text-start font-semibold">{t.admin.customerOrders}</th>
                  <th className="pb-2 text-start font-semibold">{t.admin.customerTotalSpent}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--color-border)/50">
                {topCustomers.map((customer) => (
                  <tr key={customer.user_id} className="text-(--color-text)">
                    <td className="py-2.5 font-medium">{customer.name}</td>
                    <td className="py-2.5 font-semibold text-(--color-text-muted)">
                      {formatNumber(customer.orders, undefined, lang)}
                    </td>
                    <td className="py-2.5 font-bold text-(--color-brand)">
                      {formatEGP(customer.total, lang)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

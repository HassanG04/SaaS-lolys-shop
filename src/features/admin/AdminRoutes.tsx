import { lazy, Suspense } from 'react'
import { useRoutes } from 'react-router-dom'
import { useLanguage } from '../../i18n/LanguageProvider'

const AdminPage = lazy(() => import('../../pages/AdminPage'))
const AdminProductsPage = lazy(() => import('./products/ProductsPage'))
const AdminProductFormPage = lazy(() => import('./products/ProductFormPage'))
const AdminCustomersPage = lazy(() => import('./customers/CustomersPage'))
const AdminDeliveryFeesPage = lazy(() => import('./delivery/DeliveryFeesPage'))
const AdminCategoriesPage = lazy(() => import('./categories/CategoriesPage'))
const AdminOrdersPage = lazy(() => import('./orders/OrdersPage'))
const AdminPaymentsPage = lazy(() => import('./payments/PaymentsPage'))
const AdminSettingsPage = lazy(() => import('./settings/SettingsPage'))
const AdminAuditPage = lazy(() => import('./audit/AuditPage'))
const AdminForecastPage = lazy(() => import('./forecast/ForecastPage'))
const AdminAnalyticsPage = lazy(() => import('./analytics/AnalyticsPage'))

export function AdminFallback() {
  const { t } = useLanguage()
  return (
    <div role="status" aria-label={t.ui.loading} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="ui-skeleton h-8 w-44 rounded-chip" />
        <div className="ui-skeleton h-10 w-28 rounded-pill" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="ui-skeleton h-24 rounded-card" />
        <div className="ui-skeleton h-24 rounded-card" />
        <div className="ui-skeleton h-24 rounded-card" />
        <div className="ui-skeleton h-24 rounded-card" />
      </div>
      <div className="ui-skeleton h-64 w-full rounded-card" />
      <span className="sr-only">{t.ui.loading}</span>
    </div>
  )
}

const adminSubroutes = [
  { index: true, element: <AdminPage /> },
  { path: 'products', element: <AdminProductsPage /> },
  { path: 'products/new', element: <AdminProductFormPage /> },
  { path: 'products/:id', element: <AdminProductFormPage /> },
  { path: 'categories', element: <AdminCategoriesPage /> },
  { path: 'orders', element: <AdminOrdersPage /> },
  { path: 'orders/:id', element: <AdminOrdersPage /> },
  { path: 'customers', element: <AdminCustomersPage /> },
  { path: 'payments', element: <AdminPaymentsPage /> },
  { path: 'delivery', element: <AdminDeliveryFeesPage /> },
  { path: 'settings', element: <AdminSettingsPage /> },
  { path: 'audit', element: <AdminAuditPage /> },
  { path: 'forecast', element: <AdminForecastPage /> },
  { path: 'analytics', element: <AdminAnalyticsPage /> },
  { path: '*', element: <AdminPage /> },
]

export function AdminRoutes() {
  const element = useRoutes(adminSubroutes)
  return <Suspense fallback={<AdminFallback />}>{element}</Suspense>
}

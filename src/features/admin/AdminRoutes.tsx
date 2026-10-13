import { lazy, Suspense } from 'react'
import { useRoutes } from 'react-router-dom'
import { PearlLoader } from '@/components/ui/PearlLoader'

const AdminPage = lazy(() => import('../../pages/AdminPage'))
const AdminProductsPage = lazy(() => import('./products/ProductsPage'))
const AdminProductFormPage = lazy(() => import('./products/ProductFormPage'))
const AdminCustomersPage = lazy(() => import('./customers/CustomersPage'))
const AdminDeliveryFeesPage = lazy(() => import('./delivery/DeliveryFeesPage'))
const AdminCategoriesPage = lazy(() => import('./categories/CategoriesPage'))

const AdminFallback = (
  <div
    role="status"
    aria-label="Loading"
    className="flex h-64 w-full items-center justify-center text-brand"
  >
    <PearlLoader loading />
  </div>
)

const adminSubroutes = [
  { index: true, element: <AdminPage /> },
  { path: 'products', element: <AdminProductsPage /> },
  { path: 'products/new', element: <AdminProductFormPage /> },
  { path: 'products/:id', element: <AdminProductFormPage /> },
  { path: 'categories', element: <AdminCategoriesPage /> },
  { path: 'customers', element: <AdminCustomersPage /> },
  { path: 'delivery', element: <AdminDeliveryFeesPage /> },
  { path: '*', element: <AdminPage /> },
]

export function AdminRoutes() {
  const element = useRoutes(adminSubroutes)
  return <Suspense fallback={AdminFallback}>{element}</Suspense>
}

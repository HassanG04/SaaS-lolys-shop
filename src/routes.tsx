import { lazy, Suspense, type ReactNode } from 'react'
import type { RouteObject } from 'react-router-dom'
import { PearlLoader } from './components/ui/PearlLoader'
import { adminChunkLoader } from './lib/adminLoader'

const RequireAuth = lazy(() =>
  import('./features/auth/guards').then((m) => ({ default: m.RequireAuth })),
)
const RequireAdmin = lazy(() =>
  import('./features/auth/guards').then((m) => ({ default: m.RequireAdmin })),
)

import { Layout } from './components/layout/Layout'
const HomePage = lazy(() => import('./pages/HomePage'))
const CategoryPage = lazy(() => import('./pages/CategoryPage'))
const ProductPage = lazy(() => import('./pages/ProductPage'))
const CartPage = lazy(() => import('./pages/CartPage'))
const SearchPage = lazy(() => import('./pages/SearchPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const ResendConfirmationPage = lazy(() => import('./pages/ResendConfirmationPage'))
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'))
const OrderConfirmationPage = lazy(() => import('./pages/OrderConfirmationPage'))
const PayOrderPage = lazy(() => import('./pages/PayOrderPage'))
const AccountPage = lazy(() => import('./pages/AccountPage'))
const AccountOrdersPage = lazy(() => import('./pages/AccountOrdersPage'))
const AccountFavoritesPage = lazy(() => import('./pages/AccountFavoritesPage'))
const AccountSecurityPage = lazy(() => import('./pages/AccountSecurityPage'))
const AdminShell = lazy(() => adminChunkLoader())
const AdminPage = lazy(() => import('./pages/AdminPage'))
const AdminProductsPage = lazy(() => import('./features/admin/products/ProductsPage'))
const AdminProductFormPage = lazy(() => import('./features/admin/products/ProductFormPage'))
const AdminCustomersPage = lazy(() => import('./features/admin/customers/CustomersPage'))
const AdminDeliveryFeesPage = lazy(() => import('./features/admin/delivery/DeliveryFeesPage'))
const AdminCategoriesPage = lazy(() => import('./features/admin/categories/CategoriesPage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const TermsPage = lazy(() => import('./pages/TermsPage'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))
const ReturnsPage = lazy(() => import('./pages/ReturnsPage'))
const ShippingPage = lazy(() => import('./pages/ShippingPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const MfaEnrollPage = lazy(() => import('./pages/MfaEnrollPage'))
const MfaChallengePage = lazy(() => import('./pages/MfaChallengePage'))

const KitPage = import.meta.env.DEV ? lazy(() => import('./dev/KitPage')) : null

const Fallback = (
  <div
    role="status"
    aria-label="Loading"
    className="flex h-64 w-full items-center justify-center text-brand"
  >
    <PearlLoader loading />
  </div>
)

const lazyR = (C: React.ComponentType) => (
  <Suspense fallback={Fallback}>
    <C />
  </Suspense>
)
const authR = (C: React.ComponentType) => (
  <Suspense fallback={Fallback}>
    <RequireAuth>
      <C />
    </RequireAuth>
  </Suspense>
)
const adminR = (C: React.ComponentType) => (
  <Suspense fallback={Fallback}>
    <RequireAdmin>
      <C />
    </RequireAdmin>
  </Suspense>
)

const r = (path: string, element: ReactNode) => ({ path, element })

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: lazyR(HomePage) },
      r('category/:slug', lazyR(CategoryPage)),
      r('product/:id', lazyR(ProductPage)),
      r('cart', lazyR(CartPage)),
      r('search', lazyR(SearchPage)),
      r('login', lazyR(LoginPage)),
      r('register', lazyR(RegisterPage)),
      r('reset-password', lazyR(ResetPasswordPage)),
      r('resend-confirmation', lazyR(ResendConfirmationPage)),
      r('checkout', authR(CheckoutPage)),
      r('order/:id/thanks', authR(OrderConfirmationPage)),
      r('pay/:orderId', lazyR(PayOrderPage)),
      r('account', authR(AccountPage)),
      r('account/orders', authR(AccountOrdersPage)),
      r('account/favorites', authR(AccountFavoritesPage)),
      r('account/security', authR(AccountSecurityPage)),
      r('admin/mfa/enroll', adminR(MfaEnrollPage)),
      r('admin/mfa/challenge', adminR(MfaChallengePage)),
      r('account/mfa/enroll', authR(MfaEnrollPage)),
      r('mfa/challenge', authR(MfaChallengePage)),
      {
        path: 'admin',
        element: adminR(AdminShell),
        children: [
          { index: true, element: lazyR(AdminPage) },
          r('products', lazyR(AdminProductsPage)),
          r('products/new', lazyR(AdminProductFormPage)),
          r('products/:id', lazyR(AdminProductFormPage)),
          r('categories', lazyR(AdminCategoriesPage)),
          r('customers', lazyR(AdminCustomersPage)),
          r('delivery', lazyR(AdminDeliveryFeesPage)),
          r('*', lazyR(AdminPage)),
        ],
      },
      r('about', lazyR(AboutPage)),
      r('terms', lazyR(TermsPage)),
      r('privacy', lazyR(PrivacyPage)),
      r('returns', lazyR(ReturnsPage)),
      r('shipping', lazyR(ShippingPage)),
      ...(KitPage ? [r('__kit', lazyR(KitPage))] : []),
      r('*', lazyR(NotFoundPage)),
    ],
  },
]

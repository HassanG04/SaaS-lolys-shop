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
const AccountSecurityPage = lazy(() => import('./pages/AccountSecurityPage'))
const AdminShell = lazy(() => adminChunkLoader())
const AdminPage = lazy(() => import('./pages/AdminPage'))
const AdminCustomersPage = lazy(() => import('./features/admin/customers/CustomersPage'))
const AdminDeliveryFeesPage = lazy(() => import('./features/admin/delivery/DeliveryFeesPage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const TermsPage = lazy(() => import('./pages/TermsPage'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))
const ReturnsPage = lazy(() => import('./pages/ReturnsPage'))
const ShippingPage = lazy(() => import('./pages/ShippingPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const MfaEnrollPage = lazy(() => import('./pages/MfaEnrollPage'))
const MfaChallengePage = lazy(() => import('./pages/MfaChallengePage'))

const KitPage = import.meta.env.DEV ? lazy(() => import('./dev/KitPage')) : null

function Suspended({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          aria-label="Loading"
          className="flex h-64 w-full items-center justify-center text-(--color-brand)"
        >
          <PearlLoader loading />
        </div>
      }
    >
      {children}
    </Suspense>
  )
}

function ProtectedAuth({ children }: { children: ReactNode }) {
  return (
    <Suspended>
      <RequireAuth>{children}</RequireAuth>
    </Suspended>
  )
}

function ProtectedAdmin({ children }: { children: ReactNode }) {
  return (
    <Suspended>
      <RequireAdmin>{children}</RequireAdmin>
    </Suspended>
  )
}

const lazyRoute = (Component: React.ComponentType) => (
  <Suspended>
    <Component />
  </Suspended>
)
const authRoute = (Component: React.ComponentType) => (
  <ProtectedAuth>
    <Component />
  </ProtectedAuth>
)
const adminRoute = (Component: React.ComponentType) => (
  <ProtectedAdmin>
    <Component />
  </ProtectedAdmin>
)

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: lazyRoute(HomePage) },
      { path: 'category/:slug', element: lazyRoute(CategoryPage) },
      { path: 'product/:id', element: lazyRoute(ProductPage) },
      { path: 'cart', element: lazyRoute(CartPage) },
      { path: 'search', element: lazyRoute(SearchPage) },
      { path: 'login', element: lazyRoute(LoginPage) },
      { path: 'register', element: lazyRoute(RegisterPage) },
      { path: 'reset-password', element: lazyRoute(ResetPasswordPage) },
      { path: 'resend-confirmation', element: lazyRoute(ResendConfirmationPage) },
      { path: 'checkout', element: authRoute(CheckoutPage) },
      { path: 'order/:id/thanks', element: authRoute(OrderConfirmationPage) },
      { path: 'pay/:orderId', element: lazyRoute(PayOrderPage) },
      { path: 'account', element: authRoute(AccountPage) },
      { path: 'account/orders', element: authRoute(AccountOrdersPage) },
      { path: 'account/security', element: authRoute(AccountSecurityPage) },
      { path: 'admin/mfa/enroll', element: adminRoute(MfaEnrollPage) },
      { path: 'admin/mfa/challenge', element: adminRoute(MfaChallengePage) },
      { path: 'account/mfa/enroll', element: authRoute(MfaEnrollPage) },
      { path: 'mfa/challenge', element: authRoute(MfaChallengePage) },
      {
        path: 'admin',
        element: adminRoute(AdminShell),
        children: [
          { index: true, element: lazyRoute(AdminPage) },
          { path: 'customers', element: lazyRoute(AdminCustomersPage) },
          { path: 'delivery', element: lazyRoute(AdminDeliveryFeesPage) },
          { path: '*', element: lazyRoute(AdminPage) },
        ],
      },
      { path: 'about', element: lazyRoute(AboutPage) },
      { path: 'terms', element: lazyRoute(TermsPage) },
      { path: 'privacy', element: lazyRoute(PrivacyPage) },
      { path: 'returns', element: lazyRoute(ReturnsPage) },
      { path: 'shipping', element: lazyRoute(ShippingPage) },
      ...(KitPage ? [{ path: '__kit', element: lazyRoute(KitPage) }] : []),
      { path: '*', element: lazyRoute(NotFoundPage) },
    ],
  },
]

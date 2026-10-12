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
const PayOrderPage = lazy(() => import('./pages/PayOrderPage'))
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

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: (
          <Suspended>
            <HomePage />
          </Suspended>
        ),
      },
      {
        path: 'category/:slug',
        element: (
          <Suspended>
            <CategoryPage />
          </Suspended>
        ),
      },
      {
        path: 'product/:id',
        element: (
          <Suspended>
            <ProductPage />
          </Suspended>
        ),
      },
      {
        path: 'cart',
        element: (
          <Suspended>
            <CartPage />
          </Suspended>
        ),
      },
      {
        path: 'search',
        element: (
          <Suspended>
            <SearchPage />
          </Suspended>
        ),
      },
      {
        path: 'login',
        element: (
          <Suspended>
            <LoginPage />
          </Suspended>
        ),
      },
      {
        path: 'register',
        element: (
          <Suspended>
            <RegisterPage />
          </Suspended>
        ),
      },
      {
        path: 'reset-password',
        element: (
          <Suspended>
            <ResetPasswordPage />
          </Suspended>
        ),
      },
      {
        path: 'resend-confirmation',
        element: (
          <Suspended>
            <ResendConfirmationPage />
          </Suspended>
        ),
      },
      {
        path: 'checkout',
        element: (
          <Suspended>
            <CheckoutPage />
          </Suspended>
        ),
      },
      {
        path: 'pay/:orderId',
        element: (
          <Suspended>
            <PayOrderPage />
          </Suspended>
        ),
      },
      {
        path: 'account/orders',
        element: (
          <ProtectedAuth>
            <AccountOrdersPage />
          </ProtectedAuth>
        ),
      },
      {
        path: 'account/security',
        element: (
          <ProtectedAuth>
            <AccountSecurityPage />
          </ProtectedAuth>
        ),
      },
      {
        path: 'admin/mfa/enroll',
        element: (
          <ProtectedAdmin>
            <MfaEnrollPage />
          </ProtectedAdmin>
        ),
      },
      {
        path: 'admin/mfa/challenge',
        element: (
          <ProtectedAdmin>
            <MfaChallengePage />
          </ProtectedAdmin>
        ),
      },
      {
        path: 'account/mfa/enroll',
        element: (
          <ProtectedAuth>
            <MfaEnrollPage />
          </ProtectedAuth>
        ),
      },
      {
        path: 'mfa/challenge',
        element: (
          <ProtectedAuth>
            <MfaChallengePage />
          </ProtectedAuth>
        ),
      },
      {
        path: 'admin',
        element: (
          <ProtectedAdmin>
            <AdminShell />
          </ProtectedAdmin>
        ),
        children: [
          {
            index: true,
            element: (
              <Suspended>
                <AdminPage />
              </Suspended>
            ),
          },
          {
            path: 'customers',
            element: (
              <Suspended>
                <AdminCustomersPage />
              </Suspended>
            ),
          },
          {
            path: 'delivery',
            element: (
              <Suspended>
                <AdminDeliveryFeesPage />
              </Suspended>
            ),
          },
          {
            path: '*',
            element: (
              <Suspended>
                <AdminPage />
              </Suspended>
            ),
          },
        ],
      },
      {
        path: 'about',
        element: (
          <Suspended>
            <AboutPage />
          </Suspended>
        ),
      },
      {
        path: 'terms',
        element: (
          <Suspended>
            <TermsPage />
          </Suspended>
        ),
      },
      {
        path: 'privacy',
        element: (
          <Suspended>
            <PrivacyPage />
          </Suspended>
        ),
      },
      {
        path: 'returns',
        element: (
          <Suspended>
            <ReturnsPage />
          </Suspended>
        ),
      },
      {
        path: 'shipping',
        element: (
          <Suspended>
            <ShippingPage />
          </Suspended>
        ),
      },
      ...(KitPage
        ? [
            {
              path: '__kit',
              element: (
                <Suspended>
                  <KitPage />
                </Suspended>
              ),
            },
          ]
        : []),
      {
        path: '*',
        element: (
          <Suspended>
            <NotFoundPage />
          </Suspended>
        ),
      },
    ],
  },
]

import { lazy, Suspense, type ReactNode } from 'react'
import type { RouteObject } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { PearlLoader } from './components/ui/PearlLoader'
import { RequireAdmin, RequireAuth } from './features/auth/guards'

const HomePage = lazy(() => import('./pages/HomePage'))
const CategoryPage = lazy(() => import('./pages/CategoryPage'))
const ProductPage = lazy(() => import('./pages/ProductPage'))
const CartPage = lazy(() => import('./pages/CartPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const ResendConfirmationPage = lazy(() => import('./pages/ResendConfirmationPage'))
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'))
const PayOrderPage = lazy(() => import('./pages/PayOrderPage'))
const AccountOrdersPage = lazy(() => import('./pages/AccountOrdersPage'))
const AccountSecurityPage = lazy(() => import('./pages/AccountSecurityPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
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
          <RequireAuth>
            <Suspended>
              <AccountOrdersPage />
            </Suspended>
          </RequireAuth>
        ),
      },
      {
        path: 'account/security',
        element: (
          <RequireAuth>
            <Suspended>
              <AccountSecurityPage />
            </Suspended>
          </RequireAuth>
        ),
      },
      {
        path: 'admin/mfa/enroll',
        element: (
          <RequireAdmin>
            <Suspended>
              <MfaEnrollPage />
            </Suspended>
          </RequireAdmin>
        ),
      },
      {
        path: 'admin/mfa/challenge',
        element: (
          <RequireAdmin>
            <Suspended>
              <MfaChallengePage />
            </Suspended>
          </RequireAdmin>
        ),
      },
      {
        path: 'account/mfa/enroll',
        element: (
          <RequireAuth>
            <Suspended>
              <MfaEnrollPage />
            </Suspended>
          </RequireAuth>
        ),
      },
      {
        path: 'mfa/challenge',
        element: (
          <RequireAuth>
            <Suspended>
              <MfaChallengePage />
            </Suspended>
          </RequireAuth>
        ),
      },
      {
        path: 'admin',
        element: (
          <RequireAdmin>
            <Suspended>
              <AdminPage />
            </Suspended>
          </RequireAdmin>
        ),
      },
      {
        path: 'admin/*',
        element: (
          <RequireAdmin>
            <Suspended>
              <AdminPage />
            </Suspended>
          </RequireAdmin>
        ),
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

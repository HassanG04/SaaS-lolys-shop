import { lazy, Suspense, type ReactNode } from 'react'
import type { RouteObject } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { PearlLoader } from './components/ui/PearlLoader'

const HomePage = lazy(() => import('./pages/HomePage'))
const CategoryPage = lazy(() => import('./pages/CategoryPage'))
const ProductPage = lazy(() => import('./pages/ProductPage'))
const CartPage = lazy(() => import('./pages/CartPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
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
          <Suspended>
            <AccountOrdersPage />
          </Suspended>
        ),
      },
      {
        path: 'account/security',
        element: (
          <Suspended>
            <AccountSecurityPage />
          </Suspended>
        ),
      },
      {
        path: 'admin/*',
        element: (
          <Suspended>
            <AdminPage />
          </Suspended>
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

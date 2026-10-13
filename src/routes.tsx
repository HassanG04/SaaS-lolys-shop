import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'
import { adminChunkLoader } from './lib/adminLoader'

const loadGuards = () => import('./features/auth/guards')
const RequireAuth = lazy(() => loadGuards().then((m) => ({ default: m.RequireAuth })))
const RequireAdmin = lazy(() => loadGuards().then((m) => ({ default: m.RequireAdmin })))

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
const AboutPage = lazy(() => import('./pages/AboutPage'))
const TermsPage = lazy(() => import('./pages/TermsPage'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))
const ReturnsPage = lazy(() => import('./pages/ReturnsPage'))
const ShippingPage = lazy(() => import('./pages/ShippingPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const MfaEnrollPage = lazy(() => import('./pages/MfaEnrollPage'))
const MfaChallengePage = lazy(() => import('./pages/MfaChallengePage'))

const KitPage = import.meta.env.DEV ? lazy(() => import('./dev/KitPage')) : null

const r = (path: string, C: React.ComponentType): RouteObject => ({ path, element: <C /> })
const auth = (path: string, C: React.ComponentType): RouteObject => ({
  path,
  element: (
    <RequireAuth>
      <C />
    </RequireAuth>
  ),
})
const admin = (path: string, C: React.ComponentType): RouteObject => ({
  path,
  element: (
    <RequireAdmin>
      <C />
    </RequireAdmin>
  ),
})

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      r('category/:slug', CategoryPage),
      r('product/:id', ProductPage),
      r('cart', CartPage),
      r('search', SearchPage),
      r('login', LoginPage),
      r('register', RegisterPage),
      r('reset-password', ResetPasswordPage),
      r('resend-confirmation', ResendConfirmationPage),
      auth('checkout', CheckoutPage),
      auth('order/:id/thanks', OrderConfirmationPage),
      r('pay/:orderId', PayOrderPage),
      auth('account', AccountPage),
      auth('account/orders', AccountOrdersPage),
      auth('account/favorites', AccountFavoritesPage),
      auth('account/security', AccountSecurityPage),
      admin('admin/mfa/enroll', MfaEnrollPage),
      admin('admin/mfa/challenge', MfaChallengePage),
      auth('account/mfa/enroll', MfaEnrollPage),
      auth('mfa/challenge', MfaChallengePage),
      admin('admin/*', AdminShell),
      r('about', AboutPage),
      r('terms', TermsPage),
      r('privacy', PrivacyPage),
      r('returns', ReturnsPage),
      r('shipping', ShippingPage),
      ...(KitPage ? [r('__kit', KitPage)] : []),
      r('*', NotFoundPage),
    ],
  },
]

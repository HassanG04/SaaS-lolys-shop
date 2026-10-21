import { lazy, type ComponentType } from 'react'
import type { RouteObject } from 'react-router-dom'
import { adminChunkLoader } from './lib/adminLoader'
import { Layout } from './components/layout/Layout'

const loadGuards = () => import('./features/auth/guards')
const RequireAuth = lazy(() => loadGuards().then((m) => ({ default: m.RequireAuth })))
const RequireAdmin = lazy(() => loadGuards().then((m) => ({ default: m.RequireAdmin })))

const r = (
  p: string,
  fn: () => Promise<{ default: ComponentType<unknown> }>,
  w?: (c: React.JSX.Element) => React.JSX.Element,
): RouteObject => {
  const C = lazy(fn)
  return { path: p, element: w ? w(<C />) : <C /> }
}
const auth = (p: string, fn: () => Promise<{ default: ComponentType<unknown> }>) =>
  r(p, fn, (c) => <RequireAuth>{c}</RequireAuth>)
const admin = (p: string, fn: () => Promise<{ default: ComponentType<unknown> }>) =>
  r(p, fn, (c) => <RequireAdmin>{c}</RequireAdmin>)

// Warm the shared dependency in parallel, but return the route import directly.
// An extra Promise.all barrier can reveal the footer first and delay the route.
// The route import reports dependency failures through the existing error boundary.
const loadHomePage = () => {
  void import('@/features/catalog').catch(() => {})
  return import('./pages/HomePage')
}
const HomePage = lazy(loadHomePage)
const loadCategoryPage = () => {
  void import('@/features/catalog').catch(() => {})
  return import('./pages/CategoryPage')
}
const mfaEnroll = () => import('./pages/MfaEnrollPage')
const mfaChallenge = () => import('./pages/MfaChallengePage')
const KitPage = import.meta.env.DEV ? () => import('./dev/KitPage') : null

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      r('category/:slug', loadCategoryPage),
      r('product/:id', () => import('./pages/ProductPage')),
      r('cart', () => import('./pages/CartPage')),
      r('search', () => import('./pages/SearchPage')),
      r('login', () => import('./pages/LoginPage')),
      r('register', () => import('./pages/RegisterPage')),
      r('reset-password', () => import('./pages/ResetPasswordPage')),
      r('resend-confirmation', () => import('./pages/ResendConfirmationPage')),
      auth('checkout', () => import('./pages/CheckoutPage')),
      auth('order/:id/thanks', () => import('./pages/OrderConfirmationPage')),
      r('pay/:orderId', () => import('./pages/PayOrderPage')),
      auth('account', () => import('./pages/AccountPage')),
      auth('account/orders', () => import('./pages/AccountOrdersPage')),
      auth('account/favorites', () => import('./pages/AccountFavoritesPage')),
      auth('account/security', () => import('./pages/AccountSecurityPage')),
      admin('admin/mfa/enroll', mfaEnroll),
      admin('admin/mfa/challenge', mfaChallenge),
      auth('account/mfa/enroll', mfaEnroll),
      auth('mfa/challenge', mfaChallenge),
      admin('admin/*', () => adminChunkLoader() as Promise<{ default: ComponentType<unknown> }>),
      r('about', () => import('./pages/AboutPage')),
      r('terms', () => import('./pages/TermsPage')),
      r('privacy', () => import('./pages/PrivacyPage')),
      r('returns', () => import('./pages/ReturnsPage')),
      r('shipping', () => import('./pages/ShippingPage')),
      r('contact', () => import('./pages/ContactPage')),
      ...(KitPage ? [r('__kit', KitPage)] : []),
      r('*', () => import('./pages/NotFoundPage')),
    ],
  },
]

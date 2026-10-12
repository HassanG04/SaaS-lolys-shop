import { useLocation } from 'react-router-dom'
import { useLanguage } from '../../i18n/LanguageProvider'
import { useSeo } from './useSeo'
import type { SeoOptions } from './types'

export function getRouteMetadata(
  pathname: string,
  t: ReturnType<typeof useLanguage>['t'],
): SeoOptions {
  const path = pathname.replace(/\/+$/, '') || '/'

  if (path === '/') {
    return { title: t.seo.home, description: t.seo.defaultDescription, noindex: false }
  }
  if (path.startsWith('/category')) return { title: t.seo.category, noindex: false }
  if (path.startsWith('/product')) return { title: t.seo.product, noindex: false }
  if (path.startsWith('/pay')) return { title: t.seo.pay, noindex: true }
  if (path.startsWith('/admin')) {
    if (path === '/admin/mfa/enroll') return { title: t.seo.adminMfaEnroll, noindex: true }
    if (path === '/admin/mfa/challenge') return { title: t.seo.adminMfaChallenge, noindex: true }
    return { title: t.seo.admin, noindex: true }
  }
  if (path === '/__kit' && import.meta.env.DEV) return { title: 'UI Kit', noindex: true }

  const s = t.seo
  switch (path) {
    case '/cart':
      return { title: s.cart, noindex: false }
    case '/login':
      return { title: s.login, noindex: false }
    case '/register':
      return { title: s.register, noindex: false }
    case '/about':
      return { title: s.about, noindex: false }
    case '/terms':
      return { title: s.terms, noindex: false }
    case '/privacy':
      return { title: s.privacy, noindex: false }
    case '/returns':
      return { title: s.returns, noindex: false }
    case '/shipping':
      return { title: s.shipping, noindex: false }
    case '/reset-password':
      return { title: s.resetPassword, noindex: true }
    case '/resend-confirmation':
      return { title: s.resendConfirmation, noindex: true }
    case '/checkout':
      return { title: s.checkout, noindex: true }
    case '/account':
      return { title: t.account.details, noindex: true }
    case '/account/orders':
      return { title: s.orders, noindex: true }
    case '/account/security':
      return { title: s.security, noindex: true }
    case '/account/mfa/enroll':
      return { title: s.mfaEnroll, noindex: true }
    case '/mfa/challenge':
      return { title: s.mfaChallenge, noindex: true }
    default:
      return { title: s.notFound, noindex: true }
  }
}

export function useRouteSeo() {
  const { pathname } = useLocation()
  const { t } = useLanguage()
  useSeo(getRouteMetadata(pathname, t))
}

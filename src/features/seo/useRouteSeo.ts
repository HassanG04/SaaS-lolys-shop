import { useLocation } from 'react-router-dom'
import { useLanguage } from '../../i18n/LanguageProvider'
import { useSeo } from './useSeo'
import type { SeoOptions } from './types'

export function getRouteMetadata(
  pathname: string,
  t: ReturnType<typeof useLanguage>['t'],
): SeoOptions {
  const p = pathname.replace(/\/+$/, '') || '/'
  const s = t.seo

  if (p === '/') return { title: s.home, description: s.defaultDescription, noindex: false }
  if (p.startsWith('/category')) return { title: s.category, noindex: false }
  if (p.startsWith('/product')) return { title: s.product, noindex: false }
  if (p.startsWith('/pay')) return { title: s.pay, noindex: true }
  if (p.startsWith('/admin')) {
    if (p === '/admin/mfa/enroll') return { title: s.adminMfaEnroll, noindex: true }
    if (p === '/admin/mfa/challenge') return { title: s.adminMfaChallenge, noindex: true }
    return { title: s.admin, noindex: true }
  }
  if (p === '/__kit' && import.meta.env.DEV) return { title: 'UI Kit', noindex: true }

  const map: Record<string, [string, boolean]> = {
    '/cart': [s.cart, false],
    '/login': [s.login, false],
    '/register': [s.register, false],
    '/about': [s.about, false],
    '/terms': [s.terms, false],
    '/privacy': [s.privacy, false],
    '/returns': [s.returns, false],
    '/shipping': [s.shipping, false],
    '/account': [t.account.details, true],
    '/account/orders': [s.orders, true],
    '/account/favorites': [s.favorites, true],
    '/account/security': [s.security, true],
    '/account/mfa/enroll': [s.mfaEnroll, true],
    '/mfa/challenge': [s.mfaChallenge, true],
    '/checkout': [s.checkout, true],
    '/reset-password': [s.resetPassword, true],
    '/resend-confirmation': [s.resendConfirmation, true],
  }
  const match = map[p]
  return match ? { title: match[0], noindex: match[1] } : { title: s.notFound, noindex: true }
}

export function useRouteSeo() {
  const { pathname } = useLocation()
  const { t } = useLanguage()
  useSeo(getRouteMetadata(pathname, t))
}

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

  const pubMap: Record<string, string> = {
    '/cart': s.cart,
    '/login': s.login,
    '/register': s.register,
    '/about': s.about,
    '/terms': s.terms,
    '/privacy': s.privacy,
    '/returns': s.returns,
    '/shipping': s.shipping,
  }
  if (pubMap[p]) return { title: pubMap[p], noindex: false }

  const privMap: Record<string, string> = {
    '/account': t.account.details,
    '/account/orders': s.orders,
    '/account/favorites': s.favorites,
    '/account/security': s.security,
    '/account/mfa/enroll': s.mfaEnroll,
    '/mfa/challenge': s.mfaChallenge,
    '/checkout': s.checkout,
    '/reset-password': s.resetPassword,
    '/resend-confirmation': s.resendConfirmation,
  }
  return { title: privMap[p] || s.notFound, noindex: true }
}

export function useRouteSeo() {
  const { pathname } = useLocation()
  const { t } = useLanguage()
  useSeo(getRouteMetadata(pathname, t))
}

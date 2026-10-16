import { useLocation } from 'react-router-dom'
import { useLanguage } from '../../i18n/LanguageProvider'
import { useSeo } from './useSeo'
import type { SeoOptions } from './types'

const TITLES: Record<string, string> = {
  '/cart': 'cart',
  '/login': 'login',
  '/register': 'register',
  '/about': 'about',
  '/terms': 'terms',
  '/privacy': 'privacy',
  '/returns': 'returns',
  '/shipping': 'shipping',
  '/contact': 'contact',
  '/account/orders': 'orders',
  '/account/favorites': 'favorites',
  '/account/security': 'security',
  '/account/mfa/enroll': 'mfaEnroll',
  '/mfa/challenge': 'mfaChallenge',
  '/admin/mfa/enroll': 'adminMfaEnroll',
  '/admin/mfa/challenge': 'adminMfaChallenge',
  '/checkout': 'checkout',
  '/reset-password': 'resetPassword',
  '/resend-confirmation': 'resendConfirmation',
}

export function getRouteMetadata(
  pathname: string,
  t: ReturnType<typeof useLanguage>['t'],
): SeoOptions {
  const p = pathname.replace(/\/+$/, '') || '/'
  const s = t.seo
  if (p === '/') return { title: s.home, description: s.defaultDescription }
  if (p === '/account') return { title: t.account.details, noindex: true }

  const k = TITLES[p]
  if (k)
    return {
      title: (s as Record<string, string>)[k],
      noindex: /account|admin|checkout|reset|resend|mfa/.test(p),
    }

  if (p.startsWith('/category')) return { title: s.category }
  if (p.startsWith('/product')) return { title: s.product }
  if (p.startsWith('/pay') || p.startsWith('/admin'))
    return { title: p.startsWith('/pay') ? s.pay : s.admin, noindex: true }
  if (p === '/__kit' && import.meta.env.DEV) return { title: 'UI Kit', noindex: true }
  return { title: s.notFound, noindex: true }
}

export function useRouteSeo() {
  const { pathname } = useLocation()
  const { t } = useLanguage()
  useSeo(getRouteMetadata(pathname, t))
}

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

  const pub: Record<string, string | undefined> = {
    '/cart': s.cart,
    '/login': s.login,
    '/register': s.register,
    '/about': s.about,
    '/terms': s.terms,
    '/privacy': s.privacy,
    '/returns': s.returns,
    '/shipping': s.shipping,
    '/contact': s.contact,
  }
  const tPub =
    pub[p] ||
    (p.startsWith('/category') ? s.category : p.startsWith('/product') ? s.product : undefined)
  if (tPub) return { title: tPub, noindex: false }

  const priv: Record<string, string | undefined> = {
    '/account': t.account.details,
    '/account/orders': s.orders,
    '/account/favorites': s.favorites,
    '/account/security': s.security,
    '/account/mfa/enroll': s.mfaEnroll,
    '/mfa/challenge': s.mfaChallenge,
    '/admin/mfa/enroll': s.adminMfaEnroll,
    '/admin/mfa/challenge': s.adminMfaChallenge,
    '/checkout': s.checkout,
    '/reset-password': s.resetPassword,
    '/resend-confirmation': s.resendConfirmation,
  }
  const tPriv =
    priv[p] ||
    (p.startsWith('/pay')
      ? s.pay
      : p.startsWith('/admin')
        ? s.admin
        : p === '/__kit' && import.meta.env.DEV
          ? 'UI Kit'
          : undefined)
  return { title: tPriv || s.notFound, noindex: true }
}

export function useRouteSeo() {
  const { pathname } = useLocation()
  const { t } = useLanguage()
  useSeo(getRouteMetadata(pathname, t))
}

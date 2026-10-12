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

  const pubTitle =
    p === '/cart'
      ? s.cart
      : p === '/login'
        ? s.login
        : p === '/register'
          ? s.register
          : p === '/about'
            ? s.about
            : p === '/terms'
              ? s.terms
              : p === '/privacy'
                ? s.privacy
                : p === '/returns'
                  ? s.returns
                  : p === '/shipping'
                    ? s.shipping
                    : null
  if (pubTitle) return { title: pubTitle, noindex: false }

  const privTitle =
    p === '/account'
      ? t.account.details
      : p === '/account/orders'
        ? s.orders
        : p === '/account/favorites'
          ? s.favorites
          : p === '/account/security'
            ? s.security
            : p === '/account/mfa/enroll'
              ? s.mfaEnroll
              : p === '/mfa/challenge'
                ? s.mfaChallenge
                : p === '/checkout'
                  ? s.checkout
                  : p === '/reset-password'
                    ? s.resetPassword
                    : p === '/resend-confirmation'
                      ? s.resendConfirmation
                      : s.notFound

  return { title: privTitle, noindex: true }
}

export function useRouteSeo() {
  const { pathname } = useLocation()
  const { t } = useLanguage()
  useSeo(getRouteMetadata(pathname, t))
}

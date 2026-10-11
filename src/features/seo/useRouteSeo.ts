import { useLocation } from 'react-router-dom'
import { useLanguage } from '../../i18n/LanguageProvider'
import { useSeo } from './useSeo'
import type { SeoOptions } from './types'

export function getRouteMetadata(
  pathname: string,
  t: ReturnType<typeof useLanguage>['t'],
): SeoOptions {
  // Normalize trailing slashes
  const path = pathname.replace(/\/+$/, '') || '/'

  if (path === '/') {
    return {
      title: t.seo.home,
      description: t.seo.defaultDescription,
      noindex: false,
    }
  }

  if (path.startsWith('/category')) {
    return {
      title: t.seo.category,
      noindex: false,
    }
  }

  if (path.startsWith('/product')) {
    return {
      title: t.seo.product,
      noindex: false,
    }
  }

  if (path === '/cart') {
    return {
      title: t.seo.cart,
      noindex: false,
    }
  }

  if (path === '/login') {
    return {
      title: t.seo.login,
      noindex: false,
    }
  }

  if (path === '/register') {
    return {
      title: t.seo.register,
      noindex: false,
    }
  }

  if (path === '/reset-password') {
    return {
      title: t.seo.resetPassword,
      noindex: true,
    }
  }

  if (path === '/resend-confirmation') {
    return {
      title: t.seo.resendConfirmation,
      noindex: true,
    }
  }

  if (path === '/checkout') {
    return {
      title: t.seo.checkout,
      noindex: true,
    }
  }

  if (path.startsWith('/pay')) {
    return {
      title: t.seo.pay,
      noindex: true,
    }
  }

  if (path === '/account/orders') {
    return {
      title: t.seo.orders,
      noindex: true,
    }
  }

  if (path === '/account/security') {
    return {
      title: t.seo.security,
      noindex: true,
    }
  }

  if (path === '/account/mfa/enroll') {
    return {
      title: t.seo.mfaEnroll,
      noindex: true,
    }
  }

  if (path === '/mfa/challenge') {
    return {
      title: t.seo.mfaChallenge,
      noindex: true,
    }
  }

  if (path === '/admin/mfa/enroll') {
    return {
      title: t.seo.adminMfaEnroll,
      noindex: true,
    }
  }

  if (path === '/admin/mfa/challenge') {
    return {
      title: t.seo.adminMfaChallenge,
      noindex: true,
    }
  }

  if (path === '/admin' || path.startsWith('/admin/')) {
    return {
      title: t.seo.admin,
      noindex: true,
    }
  }

  if (path === '/about') {
    return {
      title: t.seo.about,
      noindex: false,
    }
  }

  if (path === '/terms') {
    return {
      title: t.seo.terms,
      noindex: false,
    }
  }

  if (path === '/privacy') {
    return {
      title: t.seo.privacy,
      noindex: false,
    }
  }

  if (path === '/returns') {
    return {
      title: t.seo.returns,
      noindex: false,
    }
  }

  if (path === '/shipping') {
    return {
      title: t.seo.shipping,
      noindex: false,
    }
  }

  if (path === '/__kit' && import.meta.env.DEV) {
    return {
      title: 'UI Kit',
      noindex: true,
    }
  }

  return {
    title: t.seo.notFound,
    noindex: true,
  }
}

export function useRouteSeo() {
  const { pathname } = useLocation()
  const { t } = useLanguage()
  const metadata = getRouteMetadata(pathname, t)

  useSeo(metadata)
}

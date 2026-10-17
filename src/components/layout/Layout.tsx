import { lazy, Suspense, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Navbar } from './Navbar'
import { useCart } from '../../features/cart'
import { useLanguage } from '../../i18n/LanguageProvider'
import { useRouteSeo } from '../../features/seo'

const CartDrawer = lazy(() => import('../../features/cart/components/CartDrawer'))
const Footer = lazy(() => import('./Footer'))

export function Layout() {
  const { t } = useLanguage()
  const { isDrawerOpen } = useCart()
  const { pathname } = useLocation()
  const isAdminWorkspace = pathname === '/admin' || pathname.startsWith('/admin/')
  useRouteSeo()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text">
      {/* Skip to Main Content Link */}
      <a
        href={isAdminWorkspace ? '#admin-main' : '#main-content'}
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:start-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-brand focus:text-brand-contrast focus:rounded-pill"
      >
        {t.nav.skipToContent}
      </a>

      {/* Navigation Header */}
      {!isAdminWorkspace && <Navbar />}

      {/* Cart Drawer Slide-over */}
      {isDrawerOpen && (
        <Suspense fallback={null}>
          <CartDrawer />
        </Suspense>
      )}

      {/* Main Content Area */}
      <main
        id="main-content"
        tabIndex={-1}
        className={
          isAdminWorkspace
            ? 'flex-1 w-full min-w-0 focus:outline-none'
            : 'flex-1 w-full max-w-(--container-layout) mx-auto px-4 sm:px-6 py-8 focus:outline-none'
        }
      >
        <Suspense
          fallback={
            <div
              role="status"
              aria-label={t.ui.loading}
              className="route-loader mx-auto flex min-h-64 max-w-3xl flex-col justify-center gap-4"
            >
              <div className="h-10 w-2/3 rounded-pill bg-surface-tint animate-pulse" />
              <div className="h-4 rounded-chip bg-surface-tint animate-pulse" />
            </div>
          }
        >
          <div
            key={isAdminWorkspace ? 'admin-workspace' : pathname}
            className={isAdminWorkspace ? undefined : 'page-transition'}
          >
            <Outlet />
          </div>
        </Suspense>
      </main>

      {/* Global Footer */}
      {!isAdminWorkspace && (
        <Suspense fallback={null}>
          <Footer />
        </Suspense>
      )}
    </div>
  )
}

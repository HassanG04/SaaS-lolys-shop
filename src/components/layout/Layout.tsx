import { lazy, Suspense, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Navbar } from './Navbar'
import { useCart } from '../../features/cart'
import { useLanguage } from '../../i18n/LanguageProvider'
import { useRouteSeo } from '../../features/seo'

const CartDrawer = lazy(() =>
  import('../../features/cart/components/CartDrawer').then((m) => ({ default: m.CartDrawer })),
)

const Footer = lazy(() => import('./Footer').then((m) => ({ default: m.Footer })))

export function Layout() {
  const { t } = useLanguage()
  const { isDrawerOpen } = useCart()
  const { pathname } = useLocation()
  useRouteSeo()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text font-sans antialiased">
      {/* Skip to Main Content Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:start-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-brand focus:text-brand-contrast focus:rounded-pill focus:outline-none focus:ring-2 focus:ring-focus"
      >
        {t.nav.skipToContent}
      </a>

      {/* Navigation Header */}
      <Navbar />

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
        className="flex-1 w-full max-w-(--container-layout) mx-auto px-4 sm:px-6 py-8 focus:outline-none"
      >
        <Suspense
          fallback={
            <div
              role="status"
              aria-label="Loading"
              className="flex h-64 items-center justify-center text-brand"
            >
              <span
                className="size-6 animate-spin rounded-pill border-2 border-brand border-t-transparent"
                aria-hidden="true"
              />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>

      {/* Global Footer */}
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  )
}

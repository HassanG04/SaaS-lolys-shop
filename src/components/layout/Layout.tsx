import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { useLanguage } from '../../i18n/LanguageProvider'
import { useRouteSeo } from '../../features/seo'

export function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])

  return null
}

export function Layout() {
  const { t } = useLanguage()
  useRouteSeo()

  return (
    <div className="min-h-screen flex flex-col bg-(--color-bg) text-(--color-text) font-sans antialiased">
      {/* Scroll restoration */}
      <ScrollToTop />

      {/* Skip to Main Content Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:start-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-(--color-brand) focus:text-(--color-brand-contrast) focus:rounded-(--radius-pill) focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
      >
        {t.nav.skipToContent}
      </a>

      {/* Navigation Header */}
      <Navbar />

      {/* Main Content Area */}
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 w-full max-w-(--container-layout) mx-auto px-4 sm:px-6 py-8 focus:outline-none"
      >
        <Outlet />
      </main>

      {/* Global Footer */}
      <Footer />
    </div>
  )
}

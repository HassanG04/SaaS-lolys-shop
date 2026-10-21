import { lazy, Suspense, useContext, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useLanguage } from '../../i18n/LanguageProvider'
import { useCart } from '../../features/cart'
import { AuthContext } from '../../features/auth/AuthProvider'
import ThemeToggle from '../ui/ThemeToggle'
import LanguageToggle from '../ui/LanguageToggle'
// Match the search form's md:flex breakpoint. Do not fetch or resolve a hidden
// desktop-only suspense boundary while the mobile page is loading.
const NavbarSearch = lazy(() => {
  const screen = window.matchMedia('(min-width: 768px)')
  if (screen.matches) return import('./NavbarSearch')
  return new Promise<typeof import('./NavbarSearch')>((resolve) => {
    screen.addEventListener('change', () => resolve(import('./NavbarSearch')), { once: true })
  })
})
const NavbarQuickMenu = lazy(() => import('./NavbarQuickMenu'))
const NotificationBell = lazy(
  () => import('../../features/notifications/components/NotificationBell'),
)

const initials = (n?: string | null, e?: string | null) => (n || e || 'U').slice(0, 2).toUpperCase()

const pill =
  'h-11 items-center rounded-pill border border-border bg-surface-2 px-3 text-small hover:border-brand focus:ring-2'
const iconBtn =
  'flex size-11 items-center justify-center rounded-pill hover:border-brand focus:ring-2'

const Svg = ({ d, className }: { d: string; className: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
)

export function Navbar({ cartCount }: { cartCount?: number } = {}) {
  const { t } = useLanguage()
  const cart = useCart()
  const auth = useContext(AuthContext)
  const user = auth?.user
  const profile = auth?.profile
  const displayCartCount = cartCount ?? cart.totalCount
  const [quickMenuOpen, setQuickMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-surface/95 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-(--container-layout) items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6">
        <Link
          to="/"
          className="group flex items-center gap-3 text-brand rounded-pill p-1 shrink-0 focus:ring-2"
          aria-label="Lolys"
        >
          <div className="relative flex size-9 sm:size-12 items-center justify-center overflow-hidden rounded-pill border border-border bg-bg">
            <img
              src="/brand/logo-navbar.jpg"
              width={120}
              height={120}
              fetchPriority="low"
              alt=""
              aria-hidden="true"
              className="size-full object-cover"
              onError={(e) => (e.currentTarget.hidden = true)}
            />
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="font-accent text-h3 font-bold">Lolys&apos;</span>
            <span className="text-caption text-text-muted">{t.footer.tagline}</span>
          </div>
        </Link>

        <Suspense fallback={null}>
          <NavbarSearch />
        </Suspense>

        <nav className="hidden lg:flex items-center gap-6" aria-label="Desktop">
          <NavLink to="/" className="nav-link focus:ring-2">
            {t.nav.store}
          </NavLink>
          <NavLink to="/category/all" className="nav-link focus:ring-2">
            {t.nav.browse}
          </NavLink>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link
            to="/cart"
            onClick={(e) => (e.preventDefault(), cart.openDrawer())}
            className={`ui-control flex justify-center gap-2 ${pill}`}
            aria-label={`${t.nav.cart} (${displayCartCount})`}
          >
            <Svg
              className="hidden sm:block size-5 text-brand"
              d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4ZM3 6h18M16 10a4 4 0 0 1-8 0"
            />
            <span key={displayCartCount} className="font-bold text-brand cart-badge-pop">
              {displayCartCount}
            </span>
          </Link>

          {!user ? (
            <Link to="/login" className={`hidden sm:flex ${pill}`}>
              {t.nav.loginRegister}
            </Link>
          ) : (
            <Link
              to="/account"
              className={`${iconBtn} bg-brand/10 border border-brand/30 text-brand font-bold text-caption hover:bg-brand/20 shrink-0`}
              aria-label={t.nav.account}
              title={profile?.full_name || user.email || ''}
            >
              {initials(profile?.full_name, user.email)}
            </Link>
          )}

          {user && (
            <Suspense fallback={null}>
              <NotificationBell />
            </Suspense>
          )}

          {!auth?.loading && user && auth?.role === 'admin' && (
            <Link
              to="/admin"
              className={`ui-control flex gap-1.5 ${pill} border-brand/40 bg-brand/10 text-brand font-semibold shrink-0`}
              aria-label={t.admin.dashboard}
            >
              <Svg
                className="size-5 shrink-0"
                d="M3 3h7v9H3zm11 0h7v5h-7zm0 9h7v9h-7zM3 16h7v5H3z"
              />
              <span className="hidden md:inline">{t.admin.dashboard}</span>
            </Link>
          )}

          <LanguageToggle />
          <ThemeToggle />

          <div className="relative">
            <button
              type="button"
              onClick={() => setQuickMenuOpen(!quickMenuOpen)}
              className={`${iconBtn} border border-border bg-surface-2 text-text`}
              aria-expanded={quickMenuOpen}
              aria-label={quickMenuOpen ? t.nav.closeMenu : t.nav.openMenu}
            >
              <svg
                className={`size-5 overflow-visible ${quickMenuOpen ? 'hamburger-open' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <line x1="4" y1="6" x2="20" y2="6" className="hamburger-line hamburger-line-1" />
                <line x1="4" y1="12" x2="20" y2="12" className="hamburger-line hamburger-line-2" />
                <line x1="4" y1="18" x2="20" y2="18" className="hamburger-line hamburger-line-3" />
              </svg>
            </button>

            {/* Quick Buttons Dropdown */}
            {quickMenuOpen && (
              <Suspense fallback={null}>
                <NavbarQuickMenu onClose={() => setQuickMenuOpen(false)} />
              </Suspense>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

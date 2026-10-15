import { lazy, Suspense, useContext, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useLanguage } from '../../i18n/LanguageProvider'
import { useCart } from '../../features/cart'
import { AuthContext } from '../../features/auth/AuthProvider'
import ThemeToggle from '../ui/ThemeToggle'
import LanguageToggle from '../ui/LanguageToggle'
const NavbarSearch = lazy(() => import('./NavbarSearch'))
const NavbarQuickMenu = lazy(() => import('./NavbarQuickMenu'))

const Icon = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <svg
    className={`size-5 ${className}`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
)

const initials = (n?: string | null, e?: string | null) => {
  const [a, b] = (n || '').trim().split(/\s+/)
  return (b ? a[0] + b[0] : n || e || 'U').slice(0, 2).toUpperCase()
}

const pill =
  'h-11 items-center rounded-pill border border-border bg-surface-2 px-3 text-small hover:border-brand focus:ring-2'
const iconBtn =
  'flex size-11 items-center justify-center rounded-pill hover:border-brand focus:ring-2'

const navLink = ({ isActive }: { isActive: boolean }) =>
  `text-small rounded-chip px-2 py-1 focus:ring-2 ${isActive ? 'text-brand font-bold' : 'text-text hover:text-brand'}`

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
      <div className="mx-auto flex h-20 max-w-(--container-layout) items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          to="/"
          className="group flex items-center gap-3 text-brand rounded-pill p-1 shrink-0 focus:ring-2"
          aria-label="Lolys"
        >
          <div className="relative flex size-12 items-center justify-center overflow-hidden rounded-pill border border-border bg-bg">
            <img
              src="/brand/logo.png"
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          </div>
          <div className="flex flex-col">
            <span className="font-accent text-h3 font-bold">Lolys&apos;</span>
            <span className="text-caption text-text-muted">{t.footer.tagline}</span>
          </div>
        </Link>

        <Suspense fallback={null}>
          <NavbarSearch />
        </Suspense>

        <nav className="hidden lg:flex items-center gap-6" aria-label="Desktop">
          <NavLink to="/" className={navLink}>
            {t.nav.store}
          </NavLink>
          <NavLink to="/category/all" className={navLink}>
            {t.nav.browse}
          </NavLink>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link
            to="/cart"
            onClick={(e) => (e.preventDefault(), cart.openDrawer())}
            className={`flex gap-2 ${pill}`}
            aria-label={`${t.nav.cart} (${displayCartCount})`}
          >
            <Icon className="text-brand">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4ZM3 6h18M16 10a4 4 0 0 1-8 0" />
            </Icon>
            <span className="font-bold text-brand">{displayCartCount}</span>
          </Link>

          {!user ? (
            <Link to="/login" className={`hidden sm:flex ${pill}`} aria-label={t.nav.loginRegister}>
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
              <Icon>
                <path d={quickMenuOpen ? 'M18 6 6 18M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
              </Icon>
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

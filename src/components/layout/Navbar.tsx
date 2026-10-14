import { lazy, Suspense, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useLanguage } from '../../i18n/LanguageProvider'
import { ThemeToggle } from '../ui/ThemeToggle'
import { LanguageToggle } from '../ui/LanguageToggle'
import { useCart } from '../../features/cart'

const NavbarMobileMenu = lazy(() => import('./NavbarMobileMenu'))

function NavIcon({
  children,
  className = 'size-5',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <svg
      className={className}
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
}

const pillBtnClass =
  'h-11 items-center rounded-pill border border-border bg-surface-2 px-3 py-1 text-small font-medium text-text transition-colors hover:border-brand focus:outline-none focus:ring-2 focus:ring-focus'

interface NavbarProps {
  cartCount?: number
}

export function Navbar({ cartCount }: NavbarProps) {
  const { t } = useLanguage()
  const cart = useCart()
  const displayCartCount = cartCount ?? cart.totalCount
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()

  const navLinks = [
    { to: '/', label: t.nav.store },
    { to: '/category/all', label: t.nav.browse },
    { to: '/about', label: t.nav.about },
  ]

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
      setMobileMenuOpen(false)
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-surface/95 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-(--container-layout) items-center justify-between gap-4 px-4 sm:px-6">
        {/* Brand Logo & Wordmark */}
        <Link
          to="/"
          className="group flex items-center gap-3 text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus rounded-pill p-1"
          aria-label="Lolys' Accessories & Home"
        >
          <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-pill border border-border bg-bg">
            <img
              src="/brand/logo.png"
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover"
              onError={(e) => {
                // Graceful fallback if image is not loaded
                e.currentTarget.style.display = 'none'
              }}
            />
            <NavIcon className="size-6 text-brand">
              <path d="M11 10C4 2 1 5 3 10s6 4 8 2m2-2c7-8 10-5 8 0s-6 4-8 2M10 13l-4 8 4-2 2 2 2-8m-1 0 5 8-1-5 4 1-6-5" />
              <rect x="10" y="9" width="4" height="5" />
            </NavIcon>
          </div>
          <div className="flex flex-col">
            <span className="font-accent text-h3 font-bold leading-tight tracking-normal text-brand">
              Lolys&apos;
            </span>
            <span className="text-caption text-text-muted">{t.footer.tagline}</span>
          </div>
        </Link>

        {/* Desktop Search Pill */}
        <form
          role="search"
          onSubmit={handleSearchSubmit}
          className="hidden md:flex flex-1 max-w-sm items-center"
        >
          <div className="relative w-full">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.search.placeholder}
              className="w-full h-11 rounded-pill border border-border-input bg-bg ps-4 pe-11 text-small text-text placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-focus"
            />
            <button
              type="submit"
              aria-label={t.ui.search}
              className="absolute end-1.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-pill bg-brand text-brand-contrast transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-focus"
            >
              <NavIcon className="size-4">
                <path d="M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16m10 18-4.3-4.3" />
              </NavIcon>
            </button>
          </div>
        </form>

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-6" aria-label="Desktop Navigation">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `text-small font-medium transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus rounded-chip px-2 py-1 ${
                  isActive ? 'text-brand font-bold' : 'text-text'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Actions: Cart, Account, Theme, Language */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Cart Pill */}
          <Link
            to="/cart"
            onClick={(e) => {
              e.preventDefault()
              cart.openDrawer()
            }}
            className={`flex gap-2 ${pillBtnClass}`}
            aria-label={`${t.nav.cart} (${displayCartCount})`}
          >
            <NavIcon className="size-5 text-brand">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4ZM3 6h18M16 10a4 4 0 0 1-8 0" />
            </NavIcon>
            <span className="font-semibold text-brand">{displayCartCount}</span>
          </Link>

          {/* Account Link */}
          <Link
            to="/account"
            className={`hidden sm:flex justify-center ${pillBtnClass}`}
            aria-label={t.nav.account}
          >
            <NavIcon className="size-5 text-brand">
              <path d="M12 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10m8 18a8 8 0 1 0-16 0" />
            </NavIcon>
          </Link>

          {/* Theme & Language Toggles */}
          <ThemeToggle />
          <LanguageToggle />

          {/* Mobile Hamburger Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex lg:hidden h-11 w-11 items-center justify-center rounded-pill border border-border bg-surface-2 text-text focus:outline-none focus:ring-2 focus:ring-focus"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? t.nav.closeMenu : t.nav.openMenu}
          >
            <NavIcon className="size-5">
              {mobileMenuOpen ? (
                <path d="M18 6 6 18M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </NavIcon>
          </button>
        </div>
      </div>

      {/* Mobile Drawer / Dropdown */}
      {mobileMenuOpen && (
        <Suspense fallback={null}>
          <NavbarMobileMenu
            navLinks={navLinks}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onSearchSubmit={handleSearchSubmit}
            onClose={() => setMobileMenuOpen(false)}
          />
        </Suspense>
      )}
    </header>
  )
}

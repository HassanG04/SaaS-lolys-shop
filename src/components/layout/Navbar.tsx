import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useLanguage } from '../../i18n/LanguageProvider'
import { ThemeToggle } from '../ui/ThemeToggle'
import { LanguageToggle } from '../ui/LanguageToggle'
import { RibbonBow } from '../ui/ornaments'

interface NavbarProps {
  cartCount?: number
}

export function Navbar({ cartCount = 0 }: NavbarProps) {
  const { t } = useLanguage()
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
      navigate(`/category/all?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
      setMobileMenuOpen(false)
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-(--color-border) bg-(--color-surface)/95 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-(--container-layout) items-center justify-between gap-4 px-4 sm:px-6">
        {/* Brand Logo & Wordmark */}
        <Link
          to="/"
          className="group flex items-center gap-3 text-(--color-brand) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus) rounded-(--radius-pill) p-1"
          aria-label="Lolys' Accessories & Home"
        >
          <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-(--radius-pill) border border-(--color-border) bg-(--color-bg)">
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
            <RibbonBow className="size-6 text-(--color-brand)" />
          </div>
          <div className="flex flex-col">
            <span className="font-accent text-h3 font-bold leading-tight tracking-normal text-(--color-brand)">
              Lolys&apos;
            </span>
            <span className="text-caption text-(--color-text-muted)">{t.footer.tagline}</span>
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
              className="w-full h-11 rounded-(--radius-pill) border border-(--color-border-input) bg-(--color-bg) ps-4 pe-11 text-small text-(--color-text) placeholder:text-(--color-text-muted) focus:border-(--color-brand) focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
            />
            <button
              type="submit"
              aria-label={t.ui.search}
              className="absolute end-1.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-(--radius-pill) bg-(--color-brand) text-(--color-brand-contrast) transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
            >
              <svg
                className="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
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
                `text-small font-medium transition-colors hover:text-(--color-brand) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus) rounded-(--radius-chip) px-2 py-1 ${
                  isActive ? 'text-(--color-brand) font-bold' : 'text-(--color-text)'
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
            className="flex h-11 items-center gap-2 rounded-(--radius-pill) border border-(--color-border) bg-(--color-surface-2) px-3 py-1 text-small font-medium text-(--color-text) transition-colors hover:border-(--color-brand) focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
            aria-label={`${t.nav.cart} (${cartCount})`}
          >
            <svg
              className="size-5 text-(--color-brand)"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <path d="M3 6h18" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            <span className="font-semibold text-(--color-brand)">{cartCount}</span>
          </Link>

          {/* Account Link */}
          <Link
            to="/account/orders"
            className="hidden sm:flex h-11 items-center justify-center rounded-(--radius-pill) border border-(--color-border) bg-(--color-surface-2) px-3 py-1 text-small font-medium text-(--color-text) transition-colors hover:border-(--color-brand) focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
            aria-label={t.nav.account}
          >
            <svg
              className="size-5 text-(--color-brand)"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="8" r="5" />
              <path d="M20 21a8 8 0 1 0-16 0" />
            </svg>
          </Link>

          {/* Theme & Language Toggles */}
          <ThemeToggle />
          <LanguageToggle />

          {/* Mobile Hamburger Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex lg:hidden h-11 w-11 items-center justify-center rounded-(--radius-pill) border border-(--color-border) bg-(--color-surface-2) text-(--color-text) focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? t.nav.closeMenu : t.nav.openMenu}
          >
            {mobileMenuOpen ? (
              <svg
                className="size-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg
                className="size-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="4" x2="20" y1="12" y2="12" />
                <line x1="4" x2="20" y1="6" y2="6" />
                <line x1="4" x2="20" y1="18" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer / Dropdown */}
      {mobileMenuOpen && (
        <div className="border-t border-(--color-border) bg-(--color-surface) px-4 py-4 lg:hidden">
          {/* Mobile Search */}
          <form role="search" onSubmit={handleSearchSubmit} className="mb-4">
            <div className="relative">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.search.placeholder}
                className="w-full h-11 rounded-(--radius-pill) border border-(--color-border-input) bg-(--color-bg) ps-4 pe-11 text-small text-(--color-text) placeholder:text-(--color-text-muted) focus:border-(--color-brand) focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
              />
              <button
                type="submit"
                aria-label={t.ui.search}
                className="absolute end-1.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-(--radius-pill) bg-(--color-brand) text-(--color-brand-contrast)"
              >
                <svg
                  className="size-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </button>
            </div>
          </form>

          {/* Mobile Links */}
          <nav className="flex flex-col gap-2" aria-label="Mobile Navigation">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex h-11 items-center px-4 rounded-(--radius-chip) text-body font-medium transition-colors ${
                    isActive
                      ? 'bg-(--color-surface-tint) text-(--color-brand) font-bold'
                      : 'text-(--color-text) hover:bg-(--color-surface-2)'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
            <Link
              to="/account/orders"
              onClick={() => setMobileMenuOpen(false)}
              className="flex h-11 items-center px-4 rounded-(--radius-chip) text-body font-medium text-(--color-text) hover:bg-(--color-surface-2)"
            >
              {t.nav.account}
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}

import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useLanguage } from '../../i18n/LanguageProvider'

interface NavbarMobileMenuProps {
  navLinks: { to: string; label: string }[]
  onClose: () => void
}

export default function NavbarMobileMenu({ navLinks, onClose }: NavbarMobileMenuProps) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
      onClose()
    }
  }

  return (
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
            onClick={onClose}
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
          to="/account"
          onClick={onClose}
          className="flex h-11 items-center px-4 rounded-(--radius-chip) text-body font-medium text-(--color-text) hover:bg-(--color-surface-2)"
        >
          {t.nav.account}
        </Link>
      </nav>
    </div>
  )
}

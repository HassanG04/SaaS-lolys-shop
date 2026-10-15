import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../../i18n/LanguageProvider'

export default function NavbarSearch() {
  const { t } = useLanguage()
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
    }
  }

  return (
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
            <path d="M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16m10 18-4.3-4.3" />
          </svg>
        </button>
      </div>
    </form>
  )
}

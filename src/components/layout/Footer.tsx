import { Link } from 'react-router-dom'
import { useLanguage } from '../../i18n/LanguageProvider'
import { RibbonDivider } from '../ui/RibbonDivider'

export function Footer() {
  const { t } = useLanguage()
  const year = new Date().getFullYear()

  const brandName = "Lolys' Accessories & Home"

  return (
    <footer className="w-full border-t border-border bg-brand text-brand-contrast mt-auto">
      <div className="mx-auto max-w-(--container-layout) px-4 py-10 sm:px-6">
        <div className="flex flex-col items-center text-center gap-6">
          {/* Brand Wordmark & Tagline */}
          <div className="flex flex-col items-center gap-2">
            <span className="font-accent text-h2 font-bold tracking-normal text-brand-contrast">
              {brandName}
            </span>
            <p className="text-body text-brand-contrast/90 max-w-md">{t.footer.tagline}</p>
          </div>

          {/* Ribbon Divider Ornament */}
          <div className="w-full max-w-xs text-gold" aria-hidden="true">
            <RibbonDivider className="h-6 w-full text-gold" />
          </div>

          {/* Policy Navigation Links */}
          <nav
            aria-label="Policy Links"
            className="flex flex-wrap justify-center gap-4 sm:gap-6 text-small"
          >
            {[
              ['/terms', t.footer.terms],
              ['/privacy', t.footer.privacy],
              ['/returns', t.footer.returns],
              ['/shipping', t.footer.shipping],
              ['/contact', t.footer.contact],
            ].map(([to, label]) => (
              <Link
                key={to}
                to={to}
                className="transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus rounded-chip px-2 py-1"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Copyright */}
          <div className="border-t border-brand-contrast/20 pt-6 w-full text-center text-caption text-brand-contrast/80">
            <p>
              &copy; {year} {brandName}. {t.footer.rights}.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer

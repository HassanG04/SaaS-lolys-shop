import { Link } from 'react-router-dom'
import { useLanguage } from '../../i18n/LanguageProvider'
import { RibbonDivider } from '../ui/ornaments'

export function Footer() {
  const { t } = useLanguage()
  const year = new Date().getFullYear()

  const policyLinks = [
    { to: '/terms', label: t.footer.terms },
    { to: '/privacy', label: t.footer.privacy },
    { to: '/returns', label: t.footer.returns },
    { to: '/shipping', label: t.footer.shipping },
  ]

  return (
    <footer className="w-full border-t border-(--color-border) bg-(--color-brand) text-(--color-brand-contrast) mt-auto">
      <div className="mx-auto max-w-(--container-layout) px-4 py-10 sm:px-6">
        <div className="flex flex-col items-center text-center gap-6">
          {/* Brand Wordmark & Tagline */}
          <div className="flex flex-col items-center gap-2">
            <span className="font-accent text-h2 font-bold tracking-normal text-(--color-brand-contrast)">
              Lolys&apos; Accessories &amp; Home
            </span>
            <p className="text-body text-(--color-brand-contrast)/90 max-w-md">
              {t.footer.tagline}
            </p>
          </div>

          {/* Ribbon Divider Ornament */}
          <div className="w-full max-w-xs text-(--color-gold)" aria-hidden="true">
            <RibbonDivider className="h-6 w-full text-(--color-gold)" />
          </div>

          {/* Policy Navigation Links */}
          <nav
            aria-label="Policy Links"
            className="flex flex-wrap justify-center gap-4 sm:gap-6 text-small"
          >
            {policyLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus) rounded-(--radius-chip) px-2 py-1"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Copyright */}
          <div className="border-t border-(--color-brand-contrast)/20 pt-6 w-full text-center text-caption text-(--color-brand-contrast)/80">
            <p>
              &copy; {year} Lolys&apos; Accessories &amp; Home. {t.footer.rights}.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

import { Link } from 'react-router-dom'
import { useLanguage } from '../../i18n/LanguageProvider'
import { RibbonDivider } from '../ui/RibbonDivider'
import { MotionSelect } from '../ui/MotionSelect'
import { usePublicSettings } from '../../features/settings'
import {
  POLICY_ROUTES,
  readStorefrontContent,
  type PolicyRoute,
} from '../../features/settings/content'

export function Footer() {
  const { t, lang } = useLanguage()
  const { data: settings } = usePublicSettings()
  const content = readStorefrontContent(settings?.storefront_content)
  const year = new Date().getFullYear()

  const suffix = lang === 'en' ? 'en' : 'ar'
  const localized = (field: string, fallback: string) => {
    const value = content[`${field}_${suffix}` as keyof typeof content]
    return typeof value === 'string' && value.trim() ? value.trim() : fallback
  }
  const brandName = localized('brand_name', "Lolys' Accessories & Home")
  const tagline = localized('tagline', t.footer.tagline)
  const copyright = localized('copyright', t.footer.rights)
  const configuredOrder = content.footer_order ?? []
  const footerOrder = [
    ...configuredOrder,
    ...POLICY_ROUTES.filter((route) => !configuredOrder.includes(route)),
  ]
  const labels: Record<PolicyRoute, string> = {
    terms: localized('terms_label', t.footer.terms),
    privacy: localized('privacy_label', t.footer.privacy),
    returns: localized('returns_label', t.footer.returns),
    shipping: localized('shipping_label', t.footer.shipping),
    contact: localized('contact_label', t.footer.contact),
  }

  return (
    <footer className="w-full border-t border-border bg-brand text-brand-contrast mt-auto">
      <div className="mx-auto max-w-(--container-layout) px-4 py-10 sm:px-6">
        <div className="flex flex-col items-center text-center gap-6">
          {/* Brand Wordmark & Tagline */}
          <div className="flex flex-col items-center gap-2">
            <span className="font-accent text-h2 font-bold tracking-normal text-brand-contrast">
              {brandName}
            </span>
            <p className="text-body text-brand-contrast/90 max-w-md whitespace-pre-wrap break-words">
              {tagline}
            </p>
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
            {footerOrder.map((route) => (
              <Link
                key={route}
                to={`/${route}`}
                className="transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus rounded-chip px-2 py-1"
              >
                {labels[route]}
              </Link>
            ))}
          </nav>

          {/* Accessible Motion Preference Selector */}
          <div className="flex justify-center">
            <MotionSelect variant="footer" id="footer-motion-select" />
          </div>

          {/* Copyright */}
          <div className="border-t border-brand-contrast/20 pt-6 w-full text-center text-caption text-brand-contrast/80">
            <p>
              &copy; {year} {brandName}. {copyright}.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer

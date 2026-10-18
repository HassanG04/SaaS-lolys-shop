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

function safeExternalUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString()
    }
  } catch {
    // ignore malformed URLs
  }
  return null
}

function safeTelUrl(phone: string): string | null {
  const sanitized = phone.replace(/[^\d+]/g, '')
  if (sanitized.length >= 6) {
    return `tel:${sanitized}`
  }
  return null
}

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

  const rawPhone = (content.phone || settings?.phone || '').trim()
  const rawWhatsapp = (content.whatsapp_url || settings?.whatsapp || '').trim()
  const rawInstagram = (content.instagram_url || settings?.instagram || '').trim()
  const rawTiktok = (content.tiktok_url || '').trim()

  const telLink = rawPhone ? safeTelUrl(rawPhone) : null
  const whatsappUrl = rawWhatsapp.startsWith('http')
    ? safeExternalUrl(rawWhatsapp)
    : rawWhatsapp
      ? safeExternalUrl(`https://wa.me/${rawWhatsapp.replace(/\D/g, '')}`)
      : null
  const instagramUrl = rawInstagram.startsWith('http')
    ? safeExternalUrl(rawInstagram)
    : rawInstagram
      ? safeExternalUrl(`https://instagram.com/${rawInstagram.replace(/^@/, '')}`)
      : null
  const tiktokUrl = rawTiktok.startsWith('http')
    ? safeExternalUrl(rawTiktok)
    : rawTiktok
      ? safeExternalUrl(`https://tiktok.com/@${rawTiktok.replace(/^@/, '')}`)
      : null

  const hasContacts = Boolean(telLink || whatsappUrl || instagramUrl || tiktokUrl)

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

          {/* Contact Details & Channels */}
          {hasContacts && (
            <div
              aria-label={lang === 'ar' ? 'بيانات وقنوات التواصل' : 'Contact channels'}
              className="flex flex-wrap items-center justify-center gap-3 sm:gap-5 text-small text-brand-contrast/90"
            >
              {telLink && (
                <a
                  href={telLink}
                  dir="ltr"
                  className="transition-opacity hover:opacity-80 inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus rounded-chip px-2 py-1"
                >
                  <span aria-hidden="true">📞</span>
                  <span>{rawPhone}</span>
                </a>
              )}
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-opacity hover:opacity-80 inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus rounded-chip px-2 py-1"
                >
                  <span aria-hidden="true">💬</span>
                  <span>{lang === 'ar' ? 'واتساب' : 'WhatsApp'}</span>
                </a>
              )}
              {instagramUrl && (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-opacity hover:opacity-80 inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus rounded-chip px-2 py-1"
                >
                  <span aria-hidden="true">📸</span>
                  <span>{lang === 'ar' ? 'إنستغرام' : 'Instagram'}</span>
                </a>
              )}
              {tiktokUrl && (
                <a
                  href={tiktokUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-opacity hover:opacity-80 inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus rounded-chip px-2 py-1"
                >
                  <span aria-hidden="true">🎵</span>
                  <span>{lang === 'ar' ? 'تيك توك' : 'TikTok'}</span>
                </a>
              )}
            </div>
          )}

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

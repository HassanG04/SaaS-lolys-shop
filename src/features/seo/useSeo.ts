import { useEffect } from 'react'
import type { SeoOptions } from './types'

export const BRAND_NAME = "Lolys' Accessories & Home"
export const DEFAULT_DESCRIPTION_AR =
  'أشياء لطيفة لأسلوبك ومساحتك - إكسسوارات راقية ولمسات منزلية دافئة'
export const DEFAULT_DESCRIPTION_EN =
  'Cute things for your style & space - elegant accessories and warm home touches'
export const DEFAULT_IMAGE = '/brand/logo.png'

function setMetaTag(selector: string, attrName: string, attrValue: string, content: string) {
  if (typeof document === 'undefined') return
  let meta = document.head.querySelector<HTMLMetaElement>(selector)
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute(attrName, attrValue)
    document.head.appendChild(meta)
  }
  meta.setAttribute('content', content)
}

function removeMetaTag(selector: string) {
  if (typeof document === 'undefined') return
  const meta = document.head.querySelector<HTMLMetaElement>(selector)
  if (meta) {
    meta.remove()
  }
}

export function formatDocumentTitle(title?: string): string {
  if (!title) return BRAND_NAME
  const trimmed = title.trim()
  if (!trimmed || trimmed === BRAND_NAME) return BRAND_NAME
  return `${trimmed} | ${BRAND_NAME}`
}

export function useSeo({
  title,
  description,
  image = DEFAULT_IMAGE,
  type = 'website',
  noindex = false,
}: SeoOptions = {}) {
  useEffect(() => {
    if (typeof document === 'undefined') return

    const fullTitle = formatDocumentTitle(title)
    document.title = fullTitle

    const isEnglish = document.documentElement.lang === 'en'
    const finalDescription =
      description?.trim() || (isEnglish ? DEFAULT_DESCRIPTION_EN : DEFAULT_DESCRIPTION_AR)
    const locale = isEnglish ? 'en_US' : 'ar_EG'

    // Standard description
    setMetaTag('meta[name="description"]', 'name', 'description', finalDescription)

    // Open Graph
    setMetaTag('meta[property="og:site_name"]', 'property', 'og:site_name', BRAND_NAME)
    setMetaTag('meta[property="og:type"]', 'property', 'og:type', type)
    setMetaTag('meta[property="og:title"]', 'property', 'og:title', fullTitle)
    setMetaTag('meta[property="og:description"]', 'property', 'og:description', finalDescription)
    setMetaTag('meta[property="og:image"]', 'property', 'og:image', image)
    setMetaTag('meta[property="og:locale"]', 'property', 'og:locale', locale)

    // Twitter card
    setMetaTag('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image')
    setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', fullTitle)
    setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', finalDescription)
    setMetaTag('meta[name="twitter:image"]', 'name', 'twitter:image', image)

    // Robots
    if (noindex) {
      setMetaTag('meta[name="robots"]', 'name', 'robots', 'noindex, nofollow')
    } else {
      removeMetaTag('meta[name="robots"]')
    }
  }, [title, description, image, type, noindex])
}

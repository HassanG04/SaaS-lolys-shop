import { useEffect } from 'react'
import type { SeoOptions } from './types'

export const BRAND_NAME = "Lolys' Accessories & Home"
export const DEFAULT_DESCRIPTION_AR = 'إكسسوارات راقية ولمسات منزلية'
export const DEFAULT_DESCRIPTION_EN = 'Elegant accessories and warm home touches'
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

    const tags: [string, string, boolean?][] = [
      ['description', finalDescription],
      ['og:site_name', BRAND_NAME, true],
      ['og:type', type, true],
      ['og:title', fullTitle, true],
      ['og:description', finalDescription, true],
      ['og:image', image, true],
      ['og:locale', locale, true],
      ['twitter:card', 'summary_large_image'],
      ['twitter:title', fullTitle],
      ['twitter:description', finalDescription],
      ['twitter:image', image],
    ]
    for (const [key, val, isProp] of tags) {
      const a = isProp ? 'property' : 'name'
      setMetaTag(`meta[${a}="${key}"]`, a, key, val)
    }

    if (noindex) {
      setMetaTag('meta[name="robots"]', 'name', 'robots', 'noindex, nofollow')
    } else {
      removeMetaTag('meta[name="robots"]')
    }
  }, [title, description, image, type, noindex])
}

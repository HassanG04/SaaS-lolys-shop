import { useEffect } from 'react'
import type { SeoOptions } from './types'

export const BRAND_NAME = "Lolys' Accessories & Home"
export const DEFAULT_DESCRIPTION_AR = 'إكسسوارات راقية ولمسات منزلية'
export const DEFAULT_DESCRIPTION_EN = 'Elegant accessories and warm home touches'
export const DEFAULT_IMAGE = '/brand/logo.png'

function setMeta(attr: string, name: string, content: string) {
  if (typeof document === 'undefined') return
  let meta = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`)
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute(attr, name)
    document.head.appendChild(meta)
  }
  meta.setAttribute('content', content)
}

export function formatDocumentTitle(title?: string): string {
  const t = title?.trim()
  return !t || t === BRAND_NAME ? BRAND_NAME : `${t} | ${BRAND_NAME}`
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
    const desc =
      description?.trim() || (isEnglish ? DEFAULT_DESCRIPTION_EN : DEFAULT_DESCRIPTION_AR)
    const locale = isEnglish ? 'en_US' : 'ar_EG'

    const set = (attr: string, name: string, val: string) => setMeta(attr, name, val)
    set('name', 'description', desc)
    set('property', 'og:site_name', BRAND_NAME)
    set('property', 'og:type', type)
    set('property', 'og:title', fullTitle)
    set('property', 'og:description', desc)
    set('property', 'og:image', image)
    set('property', 'og:locale', locale)
    set('name', 'twitter:card', 'summary_large_image')
    set('name', 'twitter:title', fullTitle)
    set('name', 'twitter:description', desc)
    set('name', 'twitter:image', image)

    if (noindex) {
      set('name', 'robots', 'noindex, nofollow')
    } else {
      document.head.querySelector('meta[name="robots"]')?.remove()
    }
  }, [title, description, image, type, noindex])
}

import type { ReactNode } from 'react'
import { createContext, useContext } from 'react'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useSeo } from '@/features/seo'
import { usePublicSettings } from './hooks'
import { readStorefrontContent, type PolicyRoute } from './content'

const PublishedPolicyTitleContext = createContext<string | null>(null)

export function usePublishedPolicyTitle(defaultTitle: string): string {
  const custom = useContext(PublishedPolicyTitleContext)
  return custom?.trim() || defaultTitle
}

export function PublishedPolicyTitle({ fallback }: { fallback: string }) {
  const custom = useContext(PublishedPolicyTitleContext)
  return <>{custom?.trim() || fallback}</>
}

type PublishedPolicyProps = {
  route: PolicyRoute
  title: string
  description: string
  children: ReactNode
}

/**
 * Applies the owner's published policy copy without making legal pages depend on
 * a successful settings request. Empty or unavailable content keeps the audited
 * bilingual page copy rendered by the route itself.
 */
export function PublishedPolicy({ route, title, description, children }: PublishedPolicyProps) {
  const { lang } = useLanguage()
  const { data: settings } = usePublicSettings()
  const content = readStorefrontContent(settings?.storefront_content)
  const suffix = lang === 'en' ? 'en' : 'ar'
  const customLabel = content[`${route}_label_${suffix}`]
  const customBody = content[`${route}_body_${suffix}`]
  const publishedTitle = customLabel?.trim() || title

  useSeo({ title: publishedTitle, description })

  if (customBody?.trim()) {
    return (
      <article className="mx-auto max-w-3xl space-y-8 pb-12" data-policy-state="custom-body">
        <div className="rounded-card border border-border bg-surface p-6 sm:p-10 space-y-8">
          <header className="space-y-3 border-b border-border pb-6">
            <h1 className="text-h1 font-bold font-accent text-brand">{publishedTitle}</h1>
          </header>
          <div className="whitespace-pre-wrap break-words text-body text-text-muted leading-relaxed">
            {customBody}
          </div>
        </div>
      </article>
    )
  }

  return (
    <PublishedPolicyTitleContext.Provider value={customLabel?.trim() || null}>
      <div data-policy-state="static-body">{children}</div>
    </PublishedPolicyTitleContext.Provider>
  )
}

PublishedPolicy.Title = PublishedPolicyTitle

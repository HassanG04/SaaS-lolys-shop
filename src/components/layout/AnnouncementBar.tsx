import { useContext } from 'react'
import { QueryClientContext } from '@tanstack/react-query'
import { RibbonBow } from '../ui/ornaments'
import { useLanguage } from '@/i18n/LanguageProvider'
import { usePublicSettings } from '@/features/settings/hooks'
import { readStorefrontContent } from '@/features/settings/content'

function AnnouncementContent() {
  const { lang } = useLanguage()
  const { data: settings } = usePublicSettings()
  const content = readStorefrontContent(settings?.storefront_content)

  const announcement =
    (lang === 'en'
      ? content.announcement_en || content.announcement_ar || settings?.announcement_ar
      : content.announcement_ar || settings?.announcement_ar
    )?.trim() || ''

  if (!announcement) return null

  return (
    <aside
      role="region"
      aria-label={lang === 'ar' ? 'إعلان المتجر' : 'Store Announcement'}
      className="w-full bg-brand text-brand-contrast px-4 py-2 text-center text-caption sm:text-small font-semibold shadow-card flex items-center justify-center gap-2"
    >
      <RibbonBow className="size-4 shrink-0 text-brand-contrast" />
      <span className="whitespace-pre-wrap break-words">{announcement}</span>
    </aside>
  )
}

export default function AnnouncementBar() {
  const hasQueryClient = Boolean(useContext(QueryClientContext))
  if (!hasQueryClient) return null
  return <AnnouncementContent />
}

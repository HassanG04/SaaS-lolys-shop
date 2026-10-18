import { useLanguage } from '@/i18n/LanguageProvider'

export function SocialMenuLinks({
  onClose,
  menuItems = true,
}: {
  onClose: () => void
  menuItems?: boolean
}) {
  const { t } = useLanguage()
  const links = [
    {
      label: 'TikTok',
      url: 'https://www.tiktok.com/@lolys_11?_r=1',
      icon: (
        <path
          fill="currentColor"
          stroke="none"
          d="M16.6 2H13v13.3a3 3 0 1 1-2.6-3V8.6A6.6 6.6 0 1 0 16.6 15V8.2A9 9 0 0 0 22 10V6.4A5.5 5.5 0 0 1 16.6 2Z"
        />
      ),
    },
    {
      label: 'Instagram',
      url: 'https://www.instagram.com/11_lolys_11',
      icon: (
        <>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none" />
        </>
      ),
    },
    {
      label: t.nav.chatWithUs,
      url: 'https://chat.whatsapp.com/BtoioO8A1SvA5TaSREHPJs?s=cl&p=i&ilr=4&iam=2',
      icon: (
        <>
          <path d="M21 11.5a9 9 0 0 1-13 8L3 21l1.5-5A9 9 0 1 1 21 11.5Z" />
          <path d="m8 7 2 3-1 1a7 7 0 0 0 4 4l1-1 3 2c-1 2-3 2-5 1s-5-4-5-6 0-3 1-4Z" />
        </>
      ),
    },
  ]
  return (
    <div className="social-menu-links flex items-center justify-around gap-1 border-t border-border pt-2 sm:flex-col sm:items-stretch">
      {links.map(({ label, url, icon }) => (
        <a
          key={url}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          role={menuItems ? 'menuitem' : undefined}
          title={label}
          onClick={onClose}
          className="ui-control flex items-center justify-center gap-2.5 rounded-chip px-3 text-small font-medium text-text hover:bg-surface-2 hover:text-brand sm:justify-start"
        >
          <svg
            className="size-5 shrink-0 text-brand"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {icon}
          </svg>
          <span className="sr-only sm:not-sr-only">{label}</span>
        </a>
      ))}
    </div>
  )
}

import { useLanguage } from '../../i18n/LanguageProvider'
import { LanguageToggle } from '../../components/ui/LanguageToggle'
import { ThemeToggle } from '../../components/ui/ThemeToggle'
import { Ltr } from '../../components/ui/Ltr'
import { useAuth } from '../auth/AuthProvider'

interface AdminHeaderProps {
  onToggleSidebar: () => void
  isSidebarOpen: boolean
  desktopCollapsed?: boolean
  onToggleDesktopSidebar?: () => void
}

export function AdminHeader({
  onToggleSidebar,
  isSidebarOpen,
  desktopCollapsed,
  onToggleDesktopSidebar,
}: AdminHeaderProps) {
  const { t } = useLanguage()
  const { signOut, user } = useAuth()

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-(--color-border) bg-(--color-surface)/95 backdrop-blur-md px-4 sm:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={t.admin.sidebarToggle}
          aria-expanded={isSidebarOpen}
          className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-(--radius-pill) border border-(--color-border-input) bg-(--color-surface-2) text-(--color-text) hover:border-(--color-brand) hover:text-(--color-brand) focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
        >
          <svg
            className="size-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="4" x2="20" y1="12" y2="12" />
            <line x1="4" x2="20" y1="6" y2="6" />
            <line x1="4" x2="20" y1="18" y2="18" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onToggleDesktopSidebar}
          aria-label={desktopCollapsed ? t.admin.expandSidebar : t.admin.collapseSidebar}
          aria-controls="admin-desktop-sidebar"
          aria-expanded={!desktopCollapsed}
          className="hidden lg:inline-flex ui-control items-center justify-center rounded-pill border border-border-input bg-surface-2 text-brand"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            aria-hidden="true"
          >
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M15 4v16m-7-8h4" />
          </svg>
        </button>

        <span className="font-accent text-body font-bold text-(--color-brand) sm:text-h3">
          {t.admin.dashboard}
        </span>
      </div>

      {/* Header controls: user email, language toggle, theme toggle, sign out */}
      <div className="flex items-center gap-2 sm:gap-3">
        {user?.email && (
          <span className="hidden md:inline-block text-caption text-(--color-text-muted) max-w-[150px] truncate">
            <Ltr>{user.email}</Ltr>
          </span>
        )}

        <LanguageToggle />
        <ThemeToggle />

        <button
          type="button"
          onClick={() => void signOut()}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-(--radius-pill) border border-(--color-border-input) bg-(--color-surface-2) px-3 text-caption font-semibold text-(--color-text) hover:border-(--color-danger) hover:text-(--color-danger) focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
          aria-label={t.account.logout}
        >
          <svg
            className="size-4 rtl:rotate-180"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" x2="9" y1="12" y2="12" />
          </svg>
          <span className="hidden sm:inline">{t.account.logout}</span>
        </button>
      </div>
    </header>
  )
}

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
    <header className="admin-header relative z-30 flex h-16 w-full shrink-0 flex-row-reverse rtl:flex-row items-center justify-between gap-2 border-b border-border bg-surface px-3 sm:px-6">
      <div className="flex min-w-0 flex-row-reverse rtl:flex-row items-center gap-2 sm:gap-3">
        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={t.admin.sidebarToggle}
          aria-expanded={isSidebarOpen}
          aria-controls="admin-mobile-sidebar"
          className="lg:hidden inline-flex size-11 shrink-0 items-center justify-center rounded-pill border border-border-input bg-surface-2 text-text hover:border-brand hover:text-brand focus:outline-none focus:ring-2 focus:ring-focus"
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
          className="hidden lg:inline-flex ui-control shrink-0 items-center justify-center rounded-pill border border-border-input bg-surface-2 text-brand"
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

        <span className="truncate font-accent text-small font-bold text-brand sm:text-h3">
          {t.admin.dashboard}
        </span>
      </div>

      {/* Header controls: user email, language toggle, theme toggle, sign out */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
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
          className="ui-control inline-flex items-center justify-center gap-1.5 rounded-pill border border-border-input bg-surface-2 px-3 text-caption font-semibold text-text hover:border-danger hover:text-danger focus:outline-none focus:ring-2 focus:ring-focus"
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

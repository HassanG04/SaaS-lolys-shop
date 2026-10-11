import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useLanguage } from '../../i18n/LanguageProvider'
import type { AdminNavItem } from './types'

function NavIcon({ type }: { type: AdminNavItem['icon'] }): ReactNode {
  switch (type) {
    case 'dashboard':
      return (
        <svg
          className="size-5 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect width="7" height="9" x="3" y="3" rx="1" />
          <rect width="7" height="5" x="14" y="3" rx="1" />
          <rect width="7" height="9" x="14" y="12" rx="1" />
          <rect width="7" height="5" x="3" y="16" rx="1" />
        </svg>
      )
    case 'products':
      return (
        <svg
          className="size-5 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m7.5 4.27 9 5.15" />
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="m3.3 7 8.7 5 8.7-5" />
          <path d="M12 22V12" />
        </svg>
      )
    case 'categories':
      return (
        <svg
          className="size-5 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
        </svg>
      )
    case 'orders':
      return (
        <svg
          className="size-5 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
          <path d="M3 6h18" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      )
    case 'payments':
      return (
        <svg
          className="size-5 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect width="20" height="14" x="2" y="5" rx="2" />
          <line x1="2" x2="22" y1="10" y2="10" />
        </svg>
      )
    case 'delivery':
      return (
        <svg
          className="size-5 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
          <path d="M15 18H9" />
          <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14v10Z" />
          <circle cx="17" cy="18" r="2" />
          <circle cx="7" cy="18" r="2" />
        </svg>
      )
    case 'audit':
      return (
        <svg
          className="size-5 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      )
    case 'analytics':
      return (
        <svg
          className="size-5 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="18" x2="18" y1="20" y2="10" />
          <line x1="12" x2="12" y1="20" y2="4" />
          <line x1="6" x2="6" y1="20" y2="14" />
        </svg>
      )
  }
}

interface AdminSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const { t } = useLanguage()

  const navItems: AdminNavItem[] = [
    { to: '/admin', label: t.admin.dashboard, icon: 'dashboard', end: true },
    { to: '/admin/products', label: t.admin.products, icon: 'products' },
    { to: '/admin/categories', label: t.admin.categories, icon: 'categories' },
    { to: '/admin/orders', label: t.admin.orders, icon: 'orders' },
    { to: '/admin/payments', label: t.admin.payments, icon: 'payments' },
    { to: '/admin/delivery', label: t.admin.delivery, icon: 'delivery' },
    { to: '/admin/audit', label: t.admin.audit, icon: 'audit' },
    { to: '/admin/analytics', label: t.admin.analytics, icon: 'analytics' },
  ]

  const renderSidebarContent = (isDrawer = false) => (
    <div className="flex h-full flex-col justify-between">
      <div className="space-y-6">
        {/* Brand & Admin Rail Title */}
        <div className="flex items-center justify-between border-b border-(--color-border) pb-4">
          <Link
            to="/admin"
            className="flex items-center gap-3 text-(--color-brand) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus) rounded-(--radius-pill) p-1"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-(--radius-pill) border border-(--color-border) bg-(--color-bg)">
              <span className="font-accent text-h3 font-bold leading-none text-(--color-brand)">
                L
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-accent text-body font-bold leading-tight text-(--color-brand)">
                Lolys&apos; Admin
              </span>
              <span className="text-caption text-(--color-text-muted)">{t.admin.dashboard}</span>
            </div>
          </Link>

          {/* Mobile close button (rendered only inside drawer) */}
          {isDrawer && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-(--radius-pill) text-(--color-text-muted) hover:bg-(--color-surface-2) hover:text-(--color-text) focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
              aria-label="إغلاق القائمة"
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
                <line x1="18" x2="6" y1="6" y2="18" />
                <line x1="6" x2="18" y1="6" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Navigation list */}
        <nav aria-label="لوحة التحكم" className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-(--radius-chip) px-3 py-2.5 text-small font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus) ${
                  isActive
                    ? 'bg-(--color-brand) text-(--color-brand-contrast) shadow-(--shadow-pill)'
                    : 'text-(--color-text) hover:bg-(--color-surface-2) hover:text-(--color-brand)'
                }`
              }
            >
              <NavIcon type={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Footer Actions & Security Badge */}
      <div className="space-y-4 border-t border-(--color-border) pt-4">
        {/* Security assurance badge */}
        <div className="flex items-center gap-2 rounded-(--radius-chip) bg-(--color-surface-2) px-3 py-2 text-caption text-(--color-text-muted)">
          <svg
            className="size-4 text-(--color-success) shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          <span className="font-semibold text-(--color-success)">{t.admin.mfaBadge}</span>
          <span className="ms-auto font-mono text-caption text-(--color-text-muted)">AAL2</span>
        </div>

        {/* Back to store link */}
        <Link
          to="/"
          className="flex w-full items-center justify-center gap-2 rounded-(--radius-pill) border border-(--color-border-input) bg-(--color-surface) px-4 py-2 text-small font-semibold text-(--color-text) hover:border-(--color-brand) hover:text-(--color-brand) focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
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
            <path d="m15 18-6-6 6-6" />
          </svg>
          <span>{t.admin.backToStore}</span>
        </Link>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop permanent sidebar rail */}
      <aside
        aria-label="شريط لوحة التحكم"
        className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:border-e lg:border-(--color-border) lg:bg-(--color-surface) lg:p-4 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto"
      >
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile drawer overlay and sidebar */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-(--color-text)/40 backdrop-blur-xs transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <aside
            aria-label="شريط لوحة التحكم"
            className="fixed inset-y-0 start-0 z-50 w-72 bg-(--color-surface) border-e border-(--color-border) p-4 shadow-(--shadow-popover) transition-transform flex flex-col overflow-y-auto"
          >
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}
    </>
  )
}

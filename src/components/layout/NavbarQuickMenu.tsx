import { useContext, useEffect, useRef } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useLanguage } from '../../i18n/LanguageProvider'
import { AuthContext } from '../../features/auth/AuthProvider'
import { ToastContext } from '../ui/ToastProvider'

interface NavbarQuickMenuProps {
  onClose: () => void
}

export default function NavbarQuickMenu({ onClose }: NavbarQuickMenuProps) {
  const { t, lang } = useLanguage()
  const isAr = lang === 'ar'
  const auth = useContext(AuthContext)
  const user = auth?.user ?? null
  const role = auth?.role ?? 'customer'
  const signOut = auth?.signOut ?? (async () => {})
  const toast = useContext(ToastContext)
  const navigate = useNavigate()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  const itemClass =
    'flex h-10 items-center gap-2.5 px-3 rounded-chip text-small font-medium text-text hover:bg-surface-2 hover:text-brand transition-all active:scale-[0.98]'

  return (
    <div
      ref={menuRef}
      className="absolute end-0 top-full mt-2 w-60 rounded-card border border-border bg-surface/95 backdrop-blur-md shadow-popover p-2 z-50 flex flex-col gap-1 animate-in fade-in slide-in-from-top-2 zoom-in-95 duration-150"
      role="menu"
      aria-label="Quick menu"
    >
      {/* Mobile Navigation Links */}
      <div className="lg:hidden flex flex-col gap-1 pb-1.5 border-b border-border">
        <NavLink to="/" onClick={onClose} className={itemClass} role="menuitem">
          <svg
            className="size-4 shrink-0 text-brand"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span>{t.nav.store}</span>
        </NavLink>
        <NavLink to="/category/all" onClick={onClose} className={itemClass} role="menuitem">
          <svg
            className="size-4 shrink-0 text-brand"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
          </svg>
          <span>{t.nav.browse}</span>
        </NavLink>
      </div>

      {!user ? (
        <>
          <Link to="/login" onClick={onClose} className={itemClass} role="menuitem">
            <svg
              className="size-4 shrink-0 text-brand"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            <span>{t.nav.login}</span>
          </Link>
          <Link to="/register" onClick={onClose} className={itemClass} role="menuitem">
            <svg
              className="size-4 shrink-0 text-brand"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
            <span>{t.nav.register}</span>
          </Link>
          <Link to="/about" onClick={onClose} className={itemClass} role="menuitem">
            <svg
              className="size-4 shrink-0 text-brand"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>{t.nav.about}</span>
          </Link>
        </>
      ) : (
        <>
          {role === 'admin' && (
            <Link
              to="/admin"
              onClick={onClose}
              className="flex h-10 items-center gap-2.5 px-3 rounded-chip text-small font-semibold text-brand hover:bg-surface-2 transition-all active:scale-[0.98]"
              role="menuitem"
            >
              <svg
                className="size-4 shrink-0 text-brand"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              <span>{t.admin.dashboard}</span>
            </Link>
          )}
          <Link to="/about" onClick={onClose} className={itemClass} role="menuitem">
            <svg
              className="size-4 shrink-0 text-brand"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>{t.nav.about}</span>
          </Link>
          <button
            type="button"
            onClick={async () => {
              onClose()
              await signOut()
              toast?.success(isAr ? 'تم تسجيل الخروج بنجاح' : 'Logged out successfully')
              navigate('/')
            }}
            className="flex h-10 items-center gap-2.5 px-3 rounded-chip text-small font-medium text-danger hover:bg-danger/10 transition-all active:scale-[0.98] w-full text-start"
            role="menuitem"
          >
            <svg
              className="size-4 shrink-0 text-danger"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>{t.account.logout}</span>
          </button>
        </>
      )}
    </div>
  )
}

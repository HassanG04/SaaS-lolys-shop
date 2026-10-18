import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '@/i18n/LanguageProvider'
import {
  useCustomerNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '../hooks'
import { notificationCopy } from '../copy'
import type { CustomerNotification } from '../types'

export default function NotificationBell() {
  const { lang } = useLanguage()
  const isAr = lang === 'ar'
  const copy = notificationCopy[lang]
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const { notifications, unreadCount } = useCustomerNotifications()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleNotificationClick = (notification: CustomerNotification) => {
    if (!notification.is_read) {
      markRead.mutate(notification.id)
    }
    if (notification.link) {
      setIsOpen(false)
      navigate(notification.link)
    }
  }

  const renderIcon = (type: CustomerNotification['type']) => {
    switch (type) {
      case 'wishlist_sale':
        return (
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-danger/10 text-danger"
            aria-hidden="true"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </span>
        )
      case 'order_approved':
        return (
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-success/10 text-success"
            aria-hidden="true"
          >
            <svg
              className="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
        )
      case 'general_sale':
      default:
        return (
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-brand/10 text-brand"
            aria-hidden="true"
          >
            <svg
              className="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="m3 11 18-5v12L3 14v-3z" />
              <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
            </svg>
          </span>
        )
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative flex size-11 items-center justify-center rounded-pill border border-border bg-surface-2 text-text hover:border-brand focus:ring-2 focus:ring-brand"
        aria-label={copy.title}
        aria-expanded={isOpen}
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
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>

        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -end-1 flex min-w-5 h-5 items-center justify-center rounded-pill bg-danger px-1 text-caption font-bold text-surface"
            aria-label={copy.unreadCount.replace('{{count}}', String(unreadCount))}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="dialog-arrive absolute end-0 top-full mt-2 w-80 sm:w-96 max-w-[calc(100vw-1.5rem)] rounded-card border border-border bg-surface/95 backdrop-blur-md shadow-popover z-50 overflow-hidden flex flex-col max-h-[calc(100dvh-6rem)]"
          role="region"
          aria-label={copy.title}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border p-3 sm:px-4 bg-surface-2/60">
            <div className="flex items-center gap-2">
              <h2 className="text-small font-bold text-text">{copy.title}</h2>
              {unreadCount > 0 && (
                <span className="rounded-pill bg-brand/15 px-2 py-0.5 text-caption font-semibold text-brand">
                  {unreadCount}
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="text-caption text-brand hover:underline font-medium disabled:opacity-50"
              >
                {copy.markAllRead}
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto divide-y divide-border/60">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-text-muted text-small">
                <p>{copy.empty}</p>
              </div>
            ) : (
              notifications.map((n) => {
                const title = isAr ? n.title_ar : n.title_en
                const message = isAr ? n.message_ar : n.message_en
                const createdDate = new Date(n.created_at).toLocaleDateString(
                  isAr ? 'ar-EG' : 'en-US',
                  { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
                )

                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full text-start p-3 sm:px-4 flex items-start gap-3 transition-colors hover:bg-surface-2/80 focus:bg-surface-2 ${
                      !n.is_read ? 'bg-brand/5 font-medium' : 'opacity-85'
                    }`}
                  >
                    {renderIcon(n.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-small font-semibold text-text truncate">{title}</span>
                        {!n.is_read && (
                          <span
                            className="size-2 shrink-0 rounded-pill bg-brand"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                      <p className="mt-0.5 text-caption text-text-muted line-clamp-2 leading-relaxed">
                        {message}
                      </p>
                      <span className="mt-1 block text-caption text-text-muted">{createdDate}</span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

import type { ReactNode } from 'react'
import { useLanguage } from '../../i18n/LanguageProvider'
import { RibbonBow } from './ornaments'

export interface EmptyStateProps {
  title?: string
  description?: ReactNode
  icon?: ReactNode
  action?: ReactNode
  className?: string
}

export function EmptyState({ title, description, icon, action, className = '' }: EmptyStateProps) {
  const { t } = useLanguage()
  const defaultTitle = t.ui.emptyState

  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center rounded-card border border-border bg-surface p-8 text-center text-text shadow-pill sm:p-12 ${className}`}
    >
      <div className="mb-4 flex size-14 items-center justify-center rounded-pill bg-surface-tint text-brand">
        {icon || <RibbonBow className="size-8" />}
      </div>
      <h3 className="text-h3 font-bold text-brand">{title || defaultTitle}</h3>
      {description && <div className="mt-2 max-w-sm text-small text-text-muted">{description}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

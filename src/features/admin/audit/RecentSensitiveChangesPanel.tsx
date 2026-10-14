import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PearlLoader } from '@/components/ui/PearlLoader'
import { EmptyState } from '@/components/ui/EmptyState'
import { useLanguage } from '@/i18n/LanguageProvider'
import { formatDate } from '@/lib/format'
import { useRecentSensitiveAudit } from './hooks'
import { AuditDetailModal } from './AuditDetailModal'
import { type AuditLogEntry, ENTITY_LABELS, ACTION_LABELS } from './types'

export interface RecentSensitiveChangesPanelProps {
  onSelectEntry?: (entry: AuditLogEntry) => void
  limit?: number
  className?: string
}

export function RecentSensitiveChangesPanel({
  onSelectEntry,
  limit = 5,
  className = '',
}: RecentSensitiveChangesPanelProps) {
  const { lang } = useLanguage()
  const isAr = lang === 'ar'

  const { data: sensitiveLogs = [], isLoading, error } = useRecentSensitiveAudit(limit)
  const [internalSelectedEntry, setInternalSelectedEntry] = useState<AuditLogEntry | null>(null)

  const handleViewDetails = (entry: AuditLogEntry) => {
    if (onSelectEntry) {
      onSelectEntry(entry)
    } else {
      setInternalSelectedEntry(entry)
    }
  }

  const validLogs = sensitiveLogs.filter(
    (entry): entry is AuditLogEntry => entry != null && entry.id != null,
  )

  return (
    <Card className={`p-6 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-pill bg-warning/10 text-warning">
              <svg
                className="size-4"
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
            </div>
            <h2 className="text-h3 font-bold text-text">
              {isAr ? 'العمليات والتغييرات الحساسة الأخيرة' : 'Recent Sensitive Changes'}
            </h2>
          </div>
          <span className="text-caption text-text-muted">
            {isAr
              ? 'مراقبة الصلاحيات، المدفوعات، الرسوم، والإعدادات'
              : 'Monitoring roles, payments, delivery fees, & settings'}
          </span>
        </div>

        {/* Content */}
        {isLoading ? (
          <div
            role="status"
            aria-label={isAr ? 'جارٍ تحميل العمليات الحساسة' : 'Loading sensitive changes'}
            className="flex h-32 items-center justify-center text-brand"
          >
            <PearlLoader loading />
          </div>
        ) : error != null ? (
          <div className="rounded-card border border-danger/30 bg-danger/10 p-4 text-small text-danger">
            {isAr ? 'تعذر تحميل سجل العمليات الحساسة' : 'Failed to load sensitive audit logs'}
          </div>
        ) : validLogs.length === 0 ? (
          <EmptyState
            title={
              isAr ? 'لا توجد عمليات حساسة مسجلة مؤخرًا' : 'No recent sensitive actions recorded'
            }
          />
        ) : (
          <div className="divide-y divide-border rounded-card border border-border overflow-hidden">
            {validLogs.map((entry) => {
              const entityName = ENTITY_LABELS[entry.entity]?.[isAr ? 'ar' : 'en'] || entry.entity
              const actionName = ACTION_LABELS[entry.action]?.[isAr ? 'ar' : 'en'] || entry.action

              return (
                <div
                  key={entry.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-tint/30 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-pill bg-warning/10 text-warning px-2.5 py-0.5 text-caption font-semibold border border-warning/30">
                        {entityName}
                      </span>
                      <span className="rounded-pill bg-brand/10 text-brand px-2 py-0.5 text-caption font-semibold">
                        {actionName}
                      </span>
                      <span className="text-caption font-mono text-text-muted" dir="ltr">
                        #{entry.entity_id}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-small text-text-muted">
                      <span dir="ltr" className="font-mono">
                        {formatDate(entry.at)}
                      </span>
                      <span>•</span>
                      <span>
                        {entry.actor_role === 'admin'
                          ? isAr
                            ? 'مسؤول المتجر'
                            : 'Admin'
                          : entry.actor_role}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    onClick={() => handleViewDetails(entry)}
                    className="self-start sm:self-auto text-small px-3 py-1.5"
                  >
                    {isAr ? 'عرض المقارنة' : 'Compare'}
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Internal Modal if standalone without external handler */}
      {!onSelectEntry && (
        <AuditDetailModal
          entry={internalSelectedEntry}
          open={internalSelectedEntry !== null}
          onClose={() => setInternalSelectedEntry(null)}
        />
      )}
    </Card>
  )
}

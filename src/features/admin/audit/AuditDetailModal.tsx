import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { useLanguage } from '@/i18n/LanguageProvider'
import { formatDate } from '@/lib/format'
import { type AuditLogEntry, ENTITY_LABELS, ACTION_LABELS, isSensitiveAuditEntry } from './types'

export interface AuditDetailModalProps {
  entry: AuditLogEntry | null
  open: boolean
  onClose: () => void
}

export function AuditDetailModal({ entry, open, onClose }: AuditDetailModalProps) {
  const { lang } = useLanguage()
  const isAr = lang === 'ar'
  const [showRawJson, setShowRawJson] = useState(false)

  if (!open || !entry) return null

  const entityLabel = ENTITY_LABELS[entry.entity]?.[isAr ? 'ar' : 'en'] || entry.entity
  const actionLabel = ACTION_LABELS[entry.action]?.[isAr ? 'ar' : 'en'] || entry.action
  const isSensitive = isSensitiveAuditEntry(entry)

  // Extract all distinct keys between old and new
  const oldObj = (entry.old && typeof entry.old === 'object' ? entry.old : {}) as Record<
    string,
    unknown
  >
  const newObj = (entry.new && typeof entry.new === 'object' ? entry.new : {}) as Record<
    string,
    unknown
  >

  const allKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)])).sort()

  const renderValue = (val: unknown) => {
    if (val === undefined || val === null) {
      return <span className="text-text-muted italic">{isAr ? 'لا يوجد' : 'None'}</span>
    }
    if (typeof val === 'boolean') {
      return (
        <span className={val ? 'text-success font-semibold' : 'text-danger font-semibold'}>
          {String(val)}
        </span>
      )
    }
    if (typeof val === 'object') {
      return (
        <pre
          className="max-h-36 overflow-auto rounded-card bg-surface-2 p-2 text-caption font-mono"
          dir="ltr"
        >
          {JSON.stringify(val, null, 2)}
        </pre>
      )
    }
    return <span className="font-mono">{String(val)}</span>
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isAr ? `تفاصيل العملية #${entry.id}` : `Audit Details #${entry.id}`}
      description={
        isAr
          ? 'سجل غير قابل للتعديل يوثق الحالة السابقة والجديدة للتغيير'
          : 'Immutable audit log record comparing previous and current states'
      }
    >
      <div className="space-y-6 max-w-2xl max-h-[75vh] overflow-y-auto pe-1">
        {/* Top Summary Banner */}
        <div className="rounded-card border border-border bg-surface-tint p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-text">{entityLabel}</span>
              <span className="text-caption font-mono text-text-muted" dir="ltr">
                ({entry.entity_id})
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isSensitive && (
                <span className="rounded-pill bg-warning/10 text-warning px-2.5 py-0.5 text-caption font-semibold border border-warning/30">
                  {isAr ? 'عملية حساسة' : 'Sensitive Action'}
                </span>
              )}
              <span className="rounded-pill bg-brand/10 text-brand px-2.5 py-0.5 text-caption font-semibold border border-brand/30">
                {actionLabel}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-small pt-2 border-t border-border/60">
            <div>
              <span className="text-text-muted block">
                {isAr ? 'التاريخ والوقت:' : 'Timestamp:'}
              </span>
              <span className="font-mono text-text" dir="ltr">
                {formatDate(entry.at)}
              </span>
            </div>
            <div>
              <span className="text-text-muted block">
                {isAr ? 'المنفّذ والدور:' : 'Actor & Role:'}
              </span>
              <span className="font-semibold text-text">
                {entry.actor_role === 'admin'
                  ? isAr
                    ? 'مسؤول المتجر (admin)'
                    : 'Admin'
                  : entry.actor_role}
              </span>
              {entry.actor && (
                <span
                  className="block font-mono text-caption text-text-muted truncate"
                  dir="ltr"
                  title={entry.actor}
                >
                  {entry.actor}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Changes Comparison */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-body font-bold text-text">
              {isAr ? 'مقارنة القيم (قبل وبعد):' : 'Before and After Values:'}
            </h3>
            <button
              type="button"
              onClick={() => setShowRawJson((prev) => !prev)}
              className="text-caption text-brand hover:underline font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus rounded-pill px-2 py-1"
            >
              {showRawJson
                ? isAr
                  ? 'عرض المقارنة المنظمة'
                  : 'Show Key Comparison'
                : isAr
                  ? 'عرض كود JSON الخام'
                  : 'View Raw JSON'}
            </button>
          </div>

          {showRawJson ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-small font-semibold text-danger block">
                  {isAr ? 'الحالة السابقة (Old):' : 'Previous State (Old):'}
                </span>
                <pre
                  className="max-h-64 overflow-auto rounded-card border border-border bg-surface-2 p-3 text-caption font-mono"
                  dir="ltr"
                >
                  {JSON.stringify(entry.old, null, 2)}
                </pre>
              </div>
              <div className="space-y-1">
                <span className="text-small font-semibold text-success block">
                  {isAr ? 'الحالة الجديدة (New):' : 'New State (New):'}
                </span>
                <pre
                  className="max-h-64 overflow-auto rounded-card border border-border bg-surface-2 p-3 text-caption font-mono"
                  dir="ltr"
                >
                  {JSON.stringify(entry.new, null, 2)}
                </pre>
              </div>
            </div>
          ) : allKeys.length === 0 ? (
            <div className="p-4 text-center text-small text-text-muted rounded-card border border-border bg-surface-2">
              {isAr ? 'لا توجد خصائص مفصلة مسجلة' : 'No detailed properties recorded'}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-card border border-border">
              <table className="w-full text-start text-small">
                <thead>
                  <tr className="border-b border-border bg-surface-2 text-text-muted">
                    <th className="p-2.5 text-start font-semibold">{isAr ? 'الحقل' : 'Field'}</th>
                    <th className="p-2.5 text-start font-semibold">
                      {isAr ? 'قبل التعديل' : 'Before'}
                    </th>
                    <th className="p-2.5 text-start font-semibold">
                      {isAr ? 'بعد التعديل' : 'After'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {allKeys.map((key) => {
                    const oldVal = oldObj[key]
                    const newVal = newObj[key]
                    const isChanged = JSON.stringify(oldVal) !== JSON.stringify(newVal)

                    return (
                      <tr
                        key={key}
                        className={
                          isChanged ? 'bg-warning/5 font-medium' : 'hover:bg-surface-tint/30'
                        }
                      >
                        <td className="p-2.5 whitespace-nowrap font-mono text-text">
                          {key}
                          {isChanged && (
                            <span className="ms-2 rounded-pill bg-warning/20 text-warning px-1.5 py-0.5 text-caption font-semibold">
                              {isAr ? 'معدّل' : 'Changed'}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 max-w-xs break-all text-text-muted">
                          {renderValue(oldVal)}
                        </td>
                        <td className="p-2.5 max-w-xs break-all text-text font-semibold">
                          {renderValue(newVal)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Read-only assurance footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <span className="text-caption text-text-muted">
            {isAr
              ? 'سجل غير قابل للتعديل أو الحذف بموجب سياسات أمان قاعدة البيانات.'
              : 'Audit log is append-only and strictly immutable per database security rules.'}
          </span>
          <Button variant="secondary" onClick={onClose}>
            {isAr ? 'إغلاق' : 'Close'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

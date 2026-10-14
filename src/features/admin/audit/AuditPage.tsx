import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Field } from '@/components/ui/Field'
import { PearlLoader } from '@/components/ui/PearlLoader'
import { ErrorPanel } from '@/components/ui/ErrorPanel'
import { EmptyState } from '@/components/ui/EmptyState'
import { useLanguage } from '@/i18n/LanguageProvider'
import { formatDate } from '@/lib/format'
import { useAuditLogs } from './hooks'
import { AuditDetailModal } from './AuditDetailModal'
import { RecentSensitiveChangesPanel } from './RecentSensitiveChangesPanel'
import {
  ExportCsvButton,
  formatAuditLogsCsv,
  downloadCsv,
  getExportFilename,
} from '@/features/admin/export'
import { getAuditLogsForExport } from './api'
import {
  type AuditLogEntry,
  type AuditLogFilter,
  AUDIT_ENTITIES,
  AUDIT_ACTIONS,
  ENTITY_LABELS,
  ACTION_LABELS,
  isSensitiveAuditEntry,
} from './types'

export default function AuditPage() {
  const { lang } = useLanguage()
  const isAr = lang === 'ar'

  const [selectedEntity, setSelectedEntity] = useState<string>('all')
  const [selectedAction, setSelectedAction] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 20

  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null)

  const filter: AuditLogFilter = useMemo(
    () => ({
      entity: selectedEntity,
      action: selectedAction,
      search,
      from: startDate || undefined,
      to: endDate || undefined,
    }),
    [selectedEntity, selectedAction, search, startDate, endDate],
  )

  const { data, isLoading, error, refetch } = useAuditLogs(filter, page, pageSize)

  const handleResetFilters = () => {
    setSelectedEntity('all')
    setSelectedAction('all')
    setSearch('')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  const getActionBadgeClass = (action: string) => {
    switch (action) {
      case 'INSERT':
        return 'bg-success/10 text-success border-success/30'
      case 'DELETE':
        return 'bg-danger/10 text-danger border-danger/30'
      case 'PAYMENT_REVIEW':
        return 'bg-brand/10 text-brand border-brand/30'
      case 'UPDATE':
      default:
        return 'bg-surface-2 text-text border-border'
    }
  }

  const renderChangesSummary = (entry: AuditLogEntry) => {
    const oldObj = (entry.old && typeof entry.old === 'object' ? entry.old : {}) as Record<
      string,
      unknown
    >
    const newObj = (entry.new && typeof entry.new === 'object' ? entry.new : {}) as Record<
      string,
      unknown
    >

    if (entry.action === 'INSERT') {
      return (
        <span className="text-success text-caption font-semibold">
          {isAr ? 'عنصر جديد' : 'New record created'}
        </span>
      )
    }

    if (entry.action === 'DELETE') {
      return (
        <span className="text-danger text-caption font-semibold">
          {isAr ? 'تم حذف العنصر' : 'Record deleted'}
        </span>
      )
    }

    // Find keys that changed
    const changedKeys = Object.keys(newObj).filter(
      (k) => JSON.stringify(newObj[k]) !== JSON.stringify(oldObj[k]),
    )

    if (changedKeys.length === 0) {
      return <span className="text-text-muted text-caption">{isAr ? 'لا تغيير' : 'No diff'}</span>
    }

    return (
      <span
        className="text-caption font-mono text-text truncate max-w-xs block"
        title={changedKeys.join(', ')}
      >
        {changedKeys.slice(0, 3).join(', ')}
        {changedKeys.length > 3 ? ` (+${changedKeys.length - 3})` : ''}
      </span>
    )
  }

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6">
        <div>
          <h1 className="text-h2 font-bold text-text">
            {isAr ? 'سجل العمليات الإدارية' : 'Audit Log'}
          </h1>
          <p className="text-small text-text-muted">
            {isAr
              ? 'سجل غير قابل للتعديل يوثق جميع العمليات الإدارية وتغييرات النظام'
              : 'Immutable record of all administrative operations and system modifications'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ExportCsvButton
            onExport={async () => {
              const filename = getExportFilename('audit-log')
              const exportEntries = await getAuditLogsForExport(filter)
              const csv = formatAuditLogsCsv(exportEntries, lang)
              downloadCsv(csv, filename)
            }}
            successMessage={
              isAr ? 'تم تصدير سجل العمليات بنجاح' : 'Audit log exported successfully'
            }
            disabled={isLoading || (data?.entries.length ?? 0) === 0}
          />
        </div>
      </div>

      {/* 1. Recent Sensitive Changes Panel */}
      <RecentSensitiveChangesPanel onSelectEntry={(entry) => setSelectedEntry(entry)} />

      {/* 2. Filters Card */}
      <Card className="p-6">
        <div className="space-y-4">
          <h2 className="text-h3 font-bold text-text">
            {isAr ? 'تصفية سجل العمليات' : 'Filter Audit Logs'}
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 items-end">
            {/* Entity Select */}
            <Field id="filter-entity" label={isAr ? 'الكيان' : 'Entity'}>
              <select
                id="filter-entity"
                value={selectedEntity}
                onChange={(e) => {
                  setSelectedEntity(e.target.value)
                  setPage(1)
                }}
                className="ui-control ui-field block w-full rounded-pill border border-border-input bg-surface px-4 py-2 text-text"
              >
                {AUDIT_ENTITIES.map((ent) => (
                  <option key={ent} value={ent}>
                    {ent === 'all'
                      ? isAr
                        ? 'كل الكيانات'
                        : 'All Entities'
                      : ENTITY_LABELS[ent]?.[isAr ? 'ar' : 'en'] || ent}
                  </option>
                ))}
              </select>
            </Field>

            {/* Action Select */}
            <Field id="filter-action" label={isAr ? 'نوع العملية' : 'Action'}>
              <select
                id="filter-action"
                value={selectedAction}
                onChange={(e) => {
                  setSelectedAction(e.target.value)
                  setPage(1)
                }}
                className="ui-control ui-field block w-full rounded-pill border border-border-input bg-surface px-4 py-2 text-text"
              >
                {AUDIT_ACTIONS.map((act) => (
                  <option key={act} value={act}>
                    {act === 'all'
                      ? isAr
                        ? 'كل العمليات'
                        : 'All Actions'
                      : ACTION_LABELS[act]?.[isAr ? 'ar' : 'en'] || act}
                  </option>
                ))}
              </select>
            </Field>

            {/* From Date */}
            <Field id="filter-from-date" label={isAr ? 'من تاريخ' : 'From Date'}>
              <input
                id="filter-from-date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  setPage(1)
                }}
                className="ui-control ui-field block w-full rounded-pill border border-border-input bg-surface px-4 py-2 text-text"
                dir="ltr"
              />
            </Field>

            {/* To Date */}
            <Field id="filter-to-date" label={isAr ? 'إلى تاريخ' : 'To Date'}>
              <input
                id="filter-to-date"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  setPage(1)
                }}
                className="ui-control ui-field block w-full rounded-pill border border-border-input bg-surface px-4 py-2 text-text"
                dir="ltr"
              />
            </Field>

            {/* Reset Button */}
            <div className="flex">
              <Button variant="secondary" onClick={handleResetFilters} className="w-full">
                {isAr ? 'إعادة التعيين' : 'Reset'}
              </Button>
            </div>
          </div>

          {/* Search box */}
          <div className="pt-2">
            <Input
              label={isAr ? 'بحث بالمعرّف أو الدور' : 'Search by Entity ID or Role'}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder={
                isAr ? 'اكتب معرّف العنصر أو دور المنفّذ…' : 'Search entity ID, actor role…'
              }
            />
          </div>
        </div>
      </Card>

      {/* 3. Table of Audit Logs */}
      {error != null ? (
        <ErrorPanel
          error={error}
          onRetry={() => {
            void refetch()
          }}
        />
      ) : isLoading ? (
        <div
          role="status"
          aria-label={isAr ? 'جارٍ تحميل السجل' : 'Loading audit log'}
          className="flex h-64 items-center justify-center text-brand"
        >
          <PearlLoader loading />
        </div>
      ) : !data || data.entries.length === 0 ? (
        <EmptyState
          title={
            isAr
              ? 'لا توجد عمليات تطابق معايير البحث والتصفية'
              : 'No audit records match your filters'
          }
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-small">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-text-muted">
                  <th className="p-3 text-start font-semibold">#ID</th>
                  <th className="p-3 text-start font-semibold">
                    {isAr ? 'التاريخ والوقت' : 'Timestamp'}
                  </th>
                  <th className="p-3 text-start font-semibold">{isAr ? 'الكيان' : 'Entity'}</th>
                  <th className="p-3 text-start font-semibold">{isAr ? 'المعرّف' : 'Entity ID'}</th>
                  <th className="p-3 text-start font-semibold">{isAr ? 'العملية' : 'Action'}</th>
                  <th className="p-3 text-start font-semibold">{isAr ? 'المنفّذ' : 'Actor'}</th>
                  <th className="p-3 text-start font-semibold">
                    {isAr ? 'ملخص التغيير' : 'Summary'}
                  </th>
                  <th className="p-3 text-end font-semibold">{isAr ? 'التفاصيل' : 'Details'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.entries.map((entry) => {
                  const entityName =
                    ENTITY_LABELS[entry.entity]?.[isAr ? 'ar' : 'en'] || entry.entity
                  const actionName =
                    ACTION_LABELS[entry.action]?.[isAr ? 'ar' : 'en'] || entry.action
                  const isSensitive = isSensitiveAuditEntry(entry)

                  return (
                    <tr key={entry.id} className="hover:bg-surface-tint/30 transition-colors">
                      <td className="p-3 font-mono text-caption text-text-muted" dir="ltr">
                        {entry.id}
                      </td>
                      <td className="p-3 whitespace-nowrap font-mono text-caption" dir="ltr">
                        {formatDate(entry.at)}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="font-semibold text-text">{entityName}</span>
                        {isSensitive && (
                          <span
                            className="ms-1.5 inline-block size-2 rounded-pill bg-warning"
                            title={isAr ? 'عملية حساسة' : 'Sensitive'}
                          />
                        )}
                      </td>
                      <td
                        className="p-3 font-mono text-caption text-text max-w-xs truncate"
                        dir="ltr"
                        title={entry.entity_id}
                      >
                        {entry.entity_id}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`rounded-pill px-2 py-0.5 text-caption font-semibold border ${getActionBadgeClass(entry.action)}`}
                        >
                          {actionName}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap text-text-muted">
                        <span className="font-semibold text-text">
                          {entry.actor_role === 'admin'
                            ? isAr
                              ? 'مسؤول المتجر'
                              : 'Admin'
                            : entry.actor_role}
                        </span>
                      </td>
                      <td className="p-3 max-w-xs">{renderChangesSummary(entry)}</td>
                      <td className="p-3 text-end whitespace-nowrap">
                        <Button
                          variant="ghost"
                          onClick={() => setSelectedEntry(entry)}
                          className="text-small px-3 py-1"
                        >
                          {isAr ? 'عرض' : 'View'}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 border-t border-border bg-surface-2 text-small">
            <span className="text-text-muted">
              {isAr
                ? `إجمالي السجلات: ${data.total} | صفحة ${data.page} من ${data.totalPages}`
                : `Total records: ${data.total} | Page ${data.page} of ${data.totalPages}`}
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                disabled={data.page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="px-3 py-1 text-small"
              >
                {isAr ? 'الصفحة السابقة' : 'Previous'}
              </Button>
              <Button
                variant="secondary"
                disabled={data.page >= data.totalPages}
                onClick={() => setPage((prev) => prev + 1)}
                className="px-3 py-1 text-small"
              >
                {isAr ? 'الصفحة التالية' : 'Next'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Detail Before/After Modal */}
      <AuditDetailModal
        entry={selectedEntry}
        open={selectedEntry !== null}
        onClose={() => setSelectedEntry(null)}
      />
    </div>
  )
}

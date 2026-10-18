import { useState, useContext } from 'react'
import { useLanguage } from '@/i18n/LanguageProvider'
import { PearlLoader } from '@/components/ui/PearlLoader'
import { ErrorPanel } from '@/components/ui/ErrorPanel'
import { EmptyState } from '@/components/ui/EmptyState'
import { ToastContext } from '@/components/ui/ToastProvider'
import { useAdminSuggestions, useAdminReviewSuggestion } from '@/features/suggestions/hooks'
import { suggestionCopy } from '@/features/suggestions/copy'
import type {
  CustomerSuggestion,
  SuggestionStatus,
  SuggestionTopic,
} from '@/features/suggestions/types'

function getTopicLabel(topic: SuggestionTopic, copy: (typeof suggestionCopy)['ar' | 'en']) {
  switch (topic) {
    case 'products':
      return copy.topicProducts
    case 'service':
      return copy.topicService
    case 'delivery':
      return copy.topicDelivery
    case 'website':
      return copy.topicWebsite
    case 'other':
      return copy.topicOther
  }
}

function getStatusLabel(status: string, copy: (typeof suggestionCopy)['ar' | 'en']) {
  switch (status) {
    case 'pending':
      return copy.statusPending
    case 'reviewed':
      return copy.statusReviewed
    case 'archived':
      return copy.statusArchived
    default:
      return status
  }
}

export function AdminSuggestionsTable() {
  const { t, lang } = useLanguage()
  const copy = suggestionCopy[lang]
  const isAr = lang === 'ar'
  const toast = useContext(ToastContext)

  const [statusFilter, setStatusFilter] = useState<'all' | SuggestionStatus>('all')
  const [reviewingSuggestion, setReviewingSuggestion] = useState<CustomerSuggestion | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<SuggestionStatus>('reviewed')
  const [adminNotes, setAdminNotes] = useState('')

  const { data: suggestions, isLoading, error, refetch } = useAdminSuggestions()
  const reviewMutation = useAdminReviewSuggestion()

  const openReviewModal = (s: CustomerSuggestion) => {
    setReviewingSuggestion(s)
    setSelectedStatus(s.status === 'pending' ? 'reviewed' : s.status)
    setAdminNotes(s.admin_notes || '')
  }

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reviewingSuggestion) return

    try {
      await reviewMutation.mutateAsync({
        id: reviewingSuggestion.id,
        status: selectedStatus,
        notes: adminNotes.trim(),
      })
      toast?.success(isAr ? 'تم تحديث حالة الاقتراح بنجاح' : 'Suggestion updated successfully')
      setReviewingSuggestion(null)
    } catch {
      toast?.error(isAr ? 'تعذر حفظ التحديث' : 'Could not save updates')
    }
  }

  if (isLoading) {
    return (
      <div
        role="status"
        aria-label={isAr ? 'جارٍ تحميل الاقتراحات' : 'Loading suggestions'}
        className="flex min-h-[300px] w-full items-center justify-center text-brand"
      >
        <PearlLoader loading />
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-6">
        <ErrorPanel error={error} onRetry={() => void refetch()} />
      </div>
    )
  }

  const allSuggestions = suggestions ?? []
  const filtered =
    statusFilter === 'all'
      ? allSuggestions
      : allSuggestions.filter((s) => s.status === statusFilter)

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {(['all', 'pending', 'reviewed', 'archived'] as const).map((status) => {
            const active = statusFilter === status
            const label = status === 'all' ? (isAr ? 'الكل' : 'All') : getStatusLabel(status, copy)

            return (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`h-9 rounded-pill px-3.5 text-caption font-semibold transition-all ${
                  active
                    ? 'bg-brand text-brand-contrast'
                    : 'border border-border bg-surface-2 text-text-muted hover:text-text'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>

        <span className="text-caption text-text-muted">
          {filtered.length} {isAr ? 'اقتراح' : 'suggestions'}
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={isAr ? 'لا توجد اقتراحات في هذا القسم' : 'No suggestions in this section'}
          description={
            isAr
              ? 'اقتراحات العملاء وآراؤهم ستظهر هنا بمجرد إرسالها.'
              : 'Customer feedback will appear here as soon as it is submitted.'
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-card border border-border bg-surface shadow-card">
          <table className="w-full text-small text-text">
            <thead>
              <tr className="border-b border-border bg-surface-2 text-start font-semibold text-text-muted">
                <th scope="col" className="p-3.5 text-start">
                  {copy.topicLabel}
                </th>
                <th scope="col" className="p-3.5 text-start">
                  {copy.messageLabel}
                </th>
                <th scope="col" className="p-3.5 text-start">
                  {isAr ? 'الحالة' : 'Status'}
                </th>
                <th scope="col" className="p-3.5 text-start">
                  {isAr ? 'التاريخ' : 'Date'}
                </th>
                <th scope="col" className="p-3.5 text-end">
                  {t.admin.tableColActions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((s) => {
                const topicName = getTopicLabel(s.topic, copy)
                const statusName = getStatusLabel(s.status, copy)
                const dateStr = new Date(s.created_at).toLocaleDateString(
                  isAr ? 'ar-EG' : 'en-US',
                  { year: 'numeric', month: 'short', day: 'numeric' },
                )

                return (
                  <tr key={s.id} className="hover:bg-surface-2/60 transition-colors">
                    <td className="p-3.5 whitespace-nowrap">
                      <span className="inline-block rounded-pill bg-brand/10 border border-brand/20 px-2.5 py-0.5 text-caption font-semibold text-brand">
                        {topicName}
                      </span>
                    </td>
                    <td className="p-3.5 max-w-xs md:max-w-md">
                      <p className="text-small text-text leading-relaxed line-clamp-3">
                        {s.message}
                      </p>
                      {s.admin_notes && (
                        <div className="mt-1 text-caption text-text-muted italic bg-surface-2/80 p-1.5 rounded-chip">
                          <span className="font-semibold text-text not-italic">
                            {isAr ? 'ملاحظة المشرف: ' : 'Admin note: '}
                          </span>
                          {s.admin_notes}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span
                        className={`rounded-pill px-2.5 py-0.5 text-caption font-semibold ${
                          s.status === 'pending'
                            ? 'bg-warning/10 text-warning border border-warning/20'
                            : s.status === 'reviewed'
                              ? 'bg-success/10 text-success border border-success/20'
                              : 'bg-surface-2 text-text-muted border border-border'
                        }`}
                      >
                        {statusName}
                      </span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap text-caption text-text-muted">
                      {dateStr}
                    </td>
                    <td className="p-3.5 whitespace-nowrap text-end">
                      <button
                        type="button"
                        onClick={() => openReviewModal(s)}
                        className="inline-flex h-9 items-center rounded-pill border border-border bg-surface-2 px-3 text-caption font-semibold text-text hover:border-brand hover:text-brand focus:ring-2"
                      >
                        {isAr ? 'مراجعة الاقتراح' : 'Review Suggestion'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Review Dialog */}
      {reviewingSuggestion && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-text/40 backdrop-blur-xs dialog-arrive"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-card border border-border bg-surface p-6 shadow-popover space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-h3 font-bold text-text">
                {isAr ? 'مراجعة الاقتراح' : 'Review Suggestion'}
              </h3>
              <button
                type="button"
                onClick={() => setReviewingSuggestion(null)}
                className="flex size-8 items-center justify-center rounded-pill text-text-muted hover:bg-surface-2 hover:text-text"
              >
                ✕
              </button>
            </div>

            <p className="text-small text-text-muted p-3 bg-surface-2 rounded-chip">
              {reviewingSuggestion.message}
            </p>

            <form onSubmit={handleSaveReview} className="space-y-4">
              <div>
                <label className="block text-small font-medium text-text mb-1">
                  {isAr ? 'تغيير الحالة' : 'Status'}
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as SuggestionStatus)}
                  className="w-full rounded-chip border border-border bg-surface-2 px-3 py-2 text-small text-text"
                >
                  <option value="pending">{copy.statusPending}</option>
                  <option value="reviewed">{copy.statusReviewed}</option>
                  <option value="archived">{copy.statusArchived}</option>
                </select>
              </div>

              <div>
                <label className="block text-small font-medium text-text mb-1">
                  {isAr ? 'ملاحظات المشرف' : 'Admin Notes'}
                </label>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={isAr ? 'أي ملاحظات داخلية…' : 'Internal notes…'}
                  className="w-full rounded-chip border border-border bg-surface-2 p-2.5 text-small text-text placeholder:text-text-muted"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewingSuggestion(null)}
                  className="h-10 rounded-pill border border-border px-4 text-small text-text hover:bg-surface-2"
                >
                  {t.admin.cancel}
                </button>
                <button
                  type="submit"
                  disabled={reviewMutation.isPending}
                  className="h-10 rounded-pill bg-brand px-5 text-small font-bold text-brand-contrast hover:bg-brand/90 disabled:opacity-50"
                >
                  {reviewMutation.isPending ? t.ui.loading : t.admin.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

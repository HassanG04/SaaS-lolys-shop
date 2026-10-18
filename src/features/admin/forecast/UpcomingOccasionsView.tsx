import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '@/i18n/LanguageProvider'
import { PearlLoader } from '@/components/ui/PearlLoader'
import { ErrorPanel } from '@/components/ui/ErrorPanel'
import {
  useAdminOccasionReminders,
  useDismissAdminOccasionReminder,
  useGenerateAdminOccasionReminders,
  useUpcomingOccasions,
} from './hooks'
import { useForecastI18n } from './i18n'
import type { AdminOccasionReminder, UpcomingOccasion } from './types'

function formatCairoDate(dateStr: string, lang: 'ar' | 'en'): string {
  try {
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      const year = Number(parts[0])
      const month = Number(parts[1]) - 1
      const day = Number(parts[2])
      const date = new Date(Date.UTC(year, month, day, 12, 0, 0))
      return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
        timeZone: 'Africa/Cairo',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(date)
    }
    return dateStr
  } catch {
    return dateStr
  }
}

export function UpcomingOccasionsView() {
  const { lang } = useLanguage()
  const copy = useForecastI18n(lang)
  const [daysAhead, setDaysAhead] = useState<number>(120)

  const {
    data: occasions = [],
    isLoading: isOccasionsLoading,
    isError: isOccasionsError,
    error: occasionsError,
    refetch: refetchOccasions,
  } = useUpcomingOccasions(daysAhead)

  const {
    data: reminders = [],
    isError: isRemindersError,
    error: remindersError,
    refetch: refetchReminders,
  } = useAdminOccasionReminders()

  const dismissMutation = useDismissAdminOccasionReminder()
  const generateMutation = useGenerateAdminOccasionReminders()

  const handleDismiss = (id: string) => {
    dismissMutation.mutate(id)
  }

  const handleGenerate = () => {
    generateMutation.mutate(undefined)
  }

  return (
    <div className="space-y-6" data-testid="upcoming-occasions-section">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-h2 font-bold font-accent text-brand">{copy.occasionsTitle}</h2>
          <p className="mt-1 text-body text-text-muted">{copy.occasionsSubtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor="occasions-days-ahead" className="text-caption font-medium text-text">
            {copy.daysFilterLabel}
          </label>
          <select
            id="occasions-days-ahead"
            value={daysAhead}
            onChange={(e) => setDaysAhead(Number(e.target.value))}
            className="rounded-pill border border-border bg-surface px-3 py-1.5 text-caption text-text"
            data-testid="occasions-days-select"
          >
            <option value={60}>{copy.days60}</option>
            <option value={120}>{copy.days120}</option>
            <option value={180}>{copy.days180}</option>
            <option value={365}>{copy.days365}</option>
          </select>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="rounded-pill bg-surface-2 hover:bg-surface-tint border border-border px-3.5 py-1.5 text-caption font-semibold text-text transition-colors disabled:opacity-50"
            data-testid="generate-reminders-button"
          >
            {generateMutation.isPending ? '…' : copy.refreshReminders}
          </button>
        </div>
      </div>

      {/* Active Admin Reminders Banner */}
      {isRemindersError ? (
        <ErrorPanel
          title={lang === 'ar' ? 'تعذر تحميل التنبيهات' : 'Failed to load reminders'}
          message={remindersError?.message}
          onRetry={refetchReminders}
        />
      ) : reminders.length > 0 ? (
        <div
          className="rounded-card border border-brand/30 bg-brand/5 p-4 sm:p-5 space-y-3"
          data-testid="admin-reminders-banner"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-body font-bold text-brand flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-pill bg-brand animate-pulse" />
              {copy.remindersTitle} ({reminders.length})
            </h3>
            <span className="text-caption text-text-muted">{copy.remindersSubtitle}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {reminders.map((reminder: AdminOccasionReminder) => {
              const title = lang === 'ar' ? reminder.title_ar : reminder.title_en
              const message = lang === 'ar' ? reminder.message_ar : reminder.message_en
              const formattedDate = formatCairoDate(reminder.event_date, lang)

              return (
                <div
                  key={reminder.id}
                  className="rounded-card border border-border bg-surface p-4 flex flex-col justify-between gap-3 shadow-card"
                  data-testid={`reminder-card-${reminder.occasion_key}`}
                >
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-body font-semibold text-text">{title}</span>
                      <span className="rounded-pill bg-brand/10 text-brand px-2.5 py-0.5 text-caption font-bold shrink-0">
                        {reminder.days_until === 0
                          ? copy.today
                          : copy.daysUntil.replace('{days}', String(reminder.days_until))}
                      </span>
                    </div>
                    <p className="text-caption text-text-muted">{message}</p>
                    <p className="text-caption font-mono text-text-muted pt-1">{formattedDate}</p>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
                    <Link
                      to="/admin/products"
                      className="text-caption font-semibold text-brand hover:underline inline-flex items-center gap-1"
                    >
                      {copy.reviewProducts}
                      <span aria-hidden="true">→</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleDismiss(reminder.id)}
                      disabled={dismissMutation.isPending}
                      className="text-caption text-text-muted hover:text-danger font-medium transition-colors disabled:opacity-50"
                      data-testid={`dismiss-reminder-${reminder.id}`}
                    >
                      {copy.dismissReminder}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      {/* Occasions List */}
      {isOccasionsLoading ? (
        <div className="flex h-48 items-center justify-center text-brand">
          <PearlLoader loading />
        </div>
      ) : isOccasionsError ? (
        <ErrorPanel
          title={lang === 'ar' ? 'تعذر تحميل بيانات المناسبات' : 'Failed to load occasions'}
          message={occasionsError?.message}
          onRetry={refetchOccasions}
        />
      ) : occasions.length === 0 ? (
        <div className="rounded-card border border-border bg-surface p-8 text-center text-text-muted">
          {copy.noUpcomingOccasions}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {occasions.map((occasion: UpcomingOccasion) => {
            const name = lang === 'ar' ? occasion.name_ar : occasion.name_en
            const isSingleDay = occasion.start_date === occasion.end_date
            const dateDisplay = isSingleDay
              ? formatCairoDate(occasion.start_date, lang)
              : `${formatCairoDate(occasion.start_date, lang)} – ${formatCairoDate(occasion.end_date, lang)}`

            const uncertaintyNote =
              lang === 'ar' ? occasion.uncertainty_note_ar : occasion.uncertainty_note_en

            return (
              <div
                key={`${occasion.occasion_key}-${occasion.start_date}`}
                className="rounded-card border border-border bg-surface p-5 flex flex-col justify-between gap-4 shadow-card hover:border-brand/40 transition-colors"
                data-testid={`occasion-card-${occasion.occasion_key}`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-body font-bold text-text">{name}</h3>
                    <span
                      className={`rounded-pill px-2.5 py-0.5 text-caption font-bold shrink-0 ${
                        occasion.is_ongoing
                          ? 'bg-success/10 text-success'
                          : occasion.days_until <= 14
                            ? 'bg-warning/15 text-warning'
                            : 'bg-surface-2 text-text-muted'
                      }`}
                    >
                      {occasion.is_ongoing
                        ? copy.ongoing
                        : occasion.days_until === 0
                          ? copy.today
                          : copy.daysUntil.replace('{days}', String(occasion.days_until))}
                    </span>
                  </div>

                  <p className="text-caption font-mono text-text-muted">{dateDisplay}</p>

                  {/* Uncertainty labeling for Hijri events */}
                  {occasion.is_uncertain && (
                    <div className="rounded-chip border border-warning/30 bg-warning/5 px-2.5 py-1 text-caption text-warning flex items-center gap-1.5">
                      <span className="font-semibold text-caption">ⓘ</span>
                      <span>{uncertaintyNote || copy.uncertaintyBadge}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between">
                  <Link
                    to={occasion.action_url || '/admin/products'}
                    className="rounded-pill bg-brand text-brand-contrast px-3.5 py-1.5 text-caption font-semibold hover:opacity-90 transition-opacity inline-flex items-center gap-1.5"
                    data-testid={`review-button-${occasion.occasion_key}`}
                  >
                    {copy.reviewProducts}
                  </Link>

                  <span className="text-caption text-text-muted font-mono">
                    {occasion.occasion_key}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Note disclosure */}
      <p className="text-caption text-text-muted">{copy.occasionsNote}</p>
    </div>
  )
}

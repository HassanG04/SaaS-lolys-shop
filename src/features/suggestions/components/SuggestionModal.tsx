import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useSubmitSuggestion, useCustomerSuggestions } from '../hooks'
import { suggestionCopy } from '../copy'
import type { SuggestionTopic } from '../types'

interface SuggestionModalProps {
  isOpen: boolean
  onClose: () => void
}

const TOPICS: SuggestionTopic[] = ['products', 'service', 'delivery', 'website', 'other']

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

export default function SuggestionModal({ isOpen, onClose }: SuggestionModalProps) {
  const { t, lang } = useLanguage()
  const copy = suggestionCopy[lang]
  const modalRef = useRef<HTMLDivElement>(null)

  const [topic, setTopic] = useState<SuggestionTopic>('products')
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const submitMutation = useSubmitSuggestion()
  const { data: previousSuggestions = [] } = useCustomerSuggestions(isOpen)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    const trimmed = message.trim()
    if (trimmed.length < 10) {
      setErrorMessage(copy.minCharsError)
      return
    }
    if (trimmed.length > 1000) {
      setErrorMessage(copy.maxCharsError)
      return
    }

    try {
      await submitMutation.mutateAsync({ topic, message: trimmed })
      setMessage('')
      setSuccessMessage(copy.success)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('rate limit') || msg.includes('5 suggestions') || msg.includes('P0001')) {
        setErrorMessage(copy.rateLimitError)
      } else {
        setErrorMessage(copy.genericError)
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-text/40 backdrop-blur-xs dialog-arrive"
      role="dialog"
      aria-modal="true"
      aria-labelledby="suggestion-modal-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-lg rounded-card border border-border bg-surface p-6 shadow-popover max-h-[90vh] overflow-y-auto space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h2 id="suggestion-modal-title" className="text-h3 font-bold text-text">
              {copy.title}
            </h2>
            <p className="mt-1 text-caption text-text-muted">{copy.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-pill text-text-muted hover:bg-surface-2 hover:text-text focus:ring-2 focus:ring-brand"
            aria-label={t.ui.closeDialog}
          >
            <svg
              className="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Feedback Alerts */}
        {errorMessage && (
          <div
            className="rounded-chip border border-danger/30 bg-danger/10 p-3 text-small text-danger"
            role="alert"
          >
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div
            className="rounded-chip border border-success/30 bg-success/10 p-3 text-small text-success"
            role="status"
          >
            {successMessage}
          </div>
        )}

        {/* Submission Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="suggestion-topic"
              className="block text-small font-medium text-text mb-1"
            >
              {copy.topicLabel}
            </label>
            <select
              id="suggestion-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value as SuggestionTopic)}
              className="w-full rounded-chip border border-border bg-surface-2 px-3 py-2 text-small text-text focus:border-brand focus:ring-2 focus:ring-brand"
            >
              {TOPICS.map((top) => (
                <option key={top} value={top}>
                  {getTopicLabel(top, copy)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="suggestion-message"
                className="block text-small font-medium text-text"
              >
                {copy.messageLabel}
              </label>
              <span
                className={`text-caption ${message.length > 1000 ? 'text-danger font-bold' : 'text-text-muted'}`}
              >
                {message.length} / 1000
              </span>
            </div>
            <textarea
              id="suggestion-message"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={copy.messagePlaceholder}
              className="w-full rounded-chip border border-border bg-surface-2 p-3 text-small text-text placeholder:text-text-muted focus:border-brand focus:ring-2 focus:ring-brand"
              required
              minLength={10}
              maxLength={1000}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-pill border border-border bg-surface-2 px-4 text-small font-medium text-text hover:border-brand focus:ring-2"
            >
              {t.admin.cancel}
            </button>
            <button
              type="submit"
              disabled={
                submitMutation.isPending || message.trim().length < 10 || message.length > 1000
              }
              className="h-10 rounded-pill bg-brand px-5 text-small font-bold text-brand-contrast hover:bg-brand/90 disabled:opacity-50 focus:ring-2"
            >
              {submitMutation.isPending ? copy.submitting : copy.submit}
            </button>
          </div>
        </form>

        {/* Previous Suggestions History (if any) */}
        {previousSuggestions.length > 0 && (
          <div className="border-t border-border pt-4 space-y-3">
            <h3 className="text-small font-bold text-text">{copy.historyTitle}</h3>
            <div className="max-h-40 overflow-y-auto space-y-2 pe-1">
              {previousSuggestions.map((s) => (
                <div
                  key={s.id}
                  className="rounded-chip border border-border/70 bg-surface-2/50 p-2.5 text-small space-y-1"
                >
                  <div className="flex items-center justify-between text-caption">
                    <span className="font-semibold text-brand">{getTopicLabel(s.topic, copy)}</span>
                    <span className="rounded-pill bg-surface-2 px-2 py-0.5 text-caption text-text-muted">
                      {getStatusLabel(s.status, copy)}
                    </span>
                  </div>
                  <p className="text-caption text-text-muted line-clamp-2">{s.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

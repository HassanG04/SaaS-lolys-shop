import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { PearlLoader } from '@/components/ui/PearlLoader'
import { ErrorMessage } from '@/lib/errors'
import { formatEGP, formatDate } from '@/lib/format'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useSignedProofUrl } from './hooks'
import type { AdminPaymentOrder } from './types'

export interface ProofViewerModalProps {
  open: boolean
  order: AdminPaymentOrder | null
  onClose: () => void
}

export function ProofViewerModal({ open, order, onClose }: ProofViewerModalProps) {
  const { lang } = useLanguage()
  const isAr = lang === 'ar'
  const [copied, setCopied] = useState(false)

  const {
    data: signedUrl,
    isLoading,
    error,
  } = useSignedProofUrl(order?.payment_proof_path ?? null, open)

  if (!open || !order) return null

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const title = isAr ? `إثبات الدفع للطلب #${order.id}` : `Payment Proof for Order #${order.id}`

  return (
    <Dialog open title={title} onClose={onClose}>
      <div className="space-y-4 max-w-lg">
        {/* Order & Payment Summary */}
        <div className="rounded-chip border border-border bg-surface-2 p-3 space-y-2 text-small">
          <div className="flex items-center justify-between">
            <span className="text-text-muted">{isAr ? 'العميل:' : 'Customer:'}</span>
            <span className="font-semibold text-text">
              {order.ship_name} ({order.ship_phone})
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-text-muted">{isAr ? 'المبلغ المطلوب:' : 'Amount:'}</span>
            <span className="font-bold text-brand">{formatEGP(order.total, lang)}</span>
          </div>

          {order.payment_reference ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-text-muted">{isAr ? 'مرجع التحويل:' : 'Reference:'}</span>
              <div className="flex items-center gap-2">
                <code dir="ltr" className="font-mono font-bold text-brand">
                  {order.payment_reference}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopy(order.payment_reference ?? '')}
                  className="rounded-pill border border-border bg-surface px-2 py-0.5 text-caption font-semibold text-text hover:border-brand focus:outline-none focus:ring-2 focus:ring-focus"
                >
                  {copied ? (isAr ? 'تم النسخ ✓' : 'Copied ✓') : isAr ? 'نسخ' : 'Copy'}
                </button>
              </div>
            </div>
          ) : null}

          {order.payment_submitted_at && (
            <div className="flex items-center justify-between">
              <span className="text-text-muted">{isAr ? 'وقت الإرسال:' : 'Submitted:'}</span>
              <span className="text-text-muted">
                {formatDate(order.payment_submitted_at, undefined, lang)}
              </span>
            </div>
          )}
        </div>

        {/* Ephemeral Privacy Notice */}
        <div className="rounded-chip border border-border bg-surface p-2.5 text-center text-caption text-text-muted">
          {isAr
            ? '🔒 رابط الإثبات مؤقت وصالح لمدة 60 ثانية فقط لحماية خصوصية بيانات العميل.'
            : '🔒 Proof link is temporary and valid for 60 seconds only to protect customer privacy.'}
        </div>

        {/* Proof Image Display */}
        <div className="min-h-56 flex flex-col items-center justify-center rounded-chip border border-border bg-surface-2 p-3 overflow-hidden">
          {isLoading && (
            <div
              role="status"
              aria-label={isAr ? 'جارٍ تحميل الإثبات...' : 'Loading proof...'}
              className="py-12 text-brand"
            >
              <PearlLoader loading />
            </div>
          )}

          {error && (
            <div className="p-4 w-full">
              <ErrorMessage error={error} />
            </div>
          )}

          {signedUrl && !isLoading && !error && (
            <div className="space-y-3 w-full flex flex-col items-center">
              <img
                src={signedUrl}
                alt={isAr ? `إيصال دفع الطلب #${order.id}` : `Payment proof #${order.id}`}
                className="max-h-96 w-auto rounded-card object-contain border border-border shadow-card"
              />
              <a
                href={signedUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-small font-semibold text-brand hover:underline"
              >
                <span>
                  {isAr ? 'عرض بالحجم الكامل في نافذة جديدة' : 'Open full size in new tab'}
                </span>
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
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-border">
          <Button variant="ghost" onClick={onClose}>
            {isAr ? 'إغلاق' : 'Close'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

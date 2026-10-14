import { useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  useOrderPaymentDetails,
  usePaymentInstructions,
  useSubmitPaymentProof,
  usePaymentCountdown,
  validateProofFile,
} from '@/features/payments'
import { useLanguage } from '@/i18n/LanguageProvider'
import { publicImageUrl } from '@/lib/images'
import { formatEGP } from '@/lib/format'
import { PearlLoader } from '@/components/ui/PearlLoader'
import { ErrorPanel } from '@/components/ui/ErrorPanel'
import { ErrorMessage } from '@/lib/errors'
import { useToast } from '@/components/ui/ToastProvider'

export default function PayOrderPage() {
  const { t } = useLanguage()
  const { orderId } = useParams<{ orderId: string }>()
  const parsedOrderId = orderId ? parseInt(orderId, 10) : undefined

  const { user } = useAuth()
  const { success: toastSuccess } = useToast()
  const { data: order, isLoading, error, refetch } = useOrderPaymentDetails(parsedOrderId)
  const canReadInstructions = Boolean(
    order &&
      order.user_id === user?.id &&
      order.payment_method === 'instapay_qr' &&
      (order.status === 'pending' || order.status === 'confirmed') &&
      (order.payment_status === 'under_review' ||
        ((order.payment_status === 'awaiting_proof' || order.payment_status === 'rejected') &&
          order.payment_deadline && new Date(order.payment_deadline).getTime() > Date.now())),
  )
  const {
    data: instructions,
    isLoading: instructionsLoading,
    error: instructionsError,
    refetch: refetchInstructions,
  } = usePaymentInstructions(parsedOrderId, canReadInstructions)

  const [referenceInput, setReferenceInput] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<'UPL-001' | 'UPL-002' | null>(null)
  const [copiedField, setCopiedField] = useState<'handle' | 'reference' | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const submitMutation = useSubmitPaymentProof()

  const countdown = usePaymentCountdown(instructions?.deadline ?? order?.payment_deadline)

  const handleCopy = (text: string, field: 'handle' | 'reference') => {
    if (!text) return
    void navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleFileChange = async (file: File | null) => {
    setValidationError(null)
    if (filePreviewUrl) {
      try {
        URL.revokeObjectURL(filePreviewUrl)
      } catch {
        // ignore in environments without object URL
      }
      setFilePreviewUrl(null)
    }

    if (!file) {
      setSelectedFile(null)
      return
    }

    const validation = await validateProofFile(file)
    if (!validation.ok) {
      setValidationError(validation.code)
      setSelectedFile(null)
      return
    }

    setSelectedFile(file)
    try {
      if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        setFilePreviewUrl(URL.createObjectURL(file))
      }
    } catch {
      // ignore
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !order || !selectedFile || !referenceInput.trim() || !canReadInstructions || !instructions || countdown.isExpired) return

    try {
      await submitMutation.mutateAsync({
        userId: user.id,
        orderId: order.id,
        reference: referenceInput.trim(),
        file: selectedFile,
      })

      toastSuccess('إشعار التحويل قيد المراجعة من قبل إدارة المتجر.', 'تم إرسال إثبات الدفع')
      setSelectedFile(null)
      setFilePreviewUrl(null)
      setReferenceInput('')
    } catch {
      // Error handled by submitMutation.error
    }
  }

  if (isLoading) {
    return (
      <div
        role="status"
        aria-label="جارٍ تحميل بيانات الدفع"
        className="flex min-h-[50vh] w-full items-center justify-center text-brand"
      >
        <PearlLoader loading />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-xl py-12">
        <ErrorPanel error={error} title="تعذّر تحميل بيانات الدفع" onRetry={() => void refetch()} />
      </div>
    )
  }

  // Not an InstaPay order
  if (order.payment_method !== 'instapay_qr') {
    return (
      <div className="mx-auto max-w-xl space-y-6 py-12">
        <div className="rounded-card border border-border bg-surface p-6 sm:p-8 text-center space-y-4">
          <h1 className="text-h2 font-bold font-accent text-brand">الدفع عند الاستلام</h1>
          <p className="text-body text-text-muted">
            هذا الطلب (#{order.id}) مسجل بطريقة الدفع عند الاستلام، ولا يتطلب تحويلًا عبر إنستاباي.
          </p>
          <div className="pt-4 flex justify-center gap-4">
            <Link
              to="/account/orders"
              className="inline-flex h-11 items-center justify-center rounded-pill bg-brand px-6 text-small font-semibold text-brand-contrast transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-focus"
            >
              عرض تفاصيل الطلب
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (order.payment_status === 'awaiting_approval' && order.status === 'pending') {
    return (
      <div className="mx-auto max-w-xl space-y-6 py-12">
        <div role="status" className="rounded-card border border-border bg-surface p-6 sm:p-8 text-center space-y-4">
          <h1 className="text-h2 font-bold font-accent text-brand">{t('paystatus.awaiting_approval')}</h1>
          <p className="text-body text-text-muted">{t('order.approval_wait')}</p>
          <Link to="/account/orders" className="inline-flex h-11 items-center justify-center rounded-pill bg-brand px-6 text-small font-semibold text-brand-contrast focus:outline-none focus:ring-2 focus:ring-focus">
            {t.account.orders}
          </Link>
        </div>
      </div>
    )
  }

  const isExpired = countdown.isExpired || order.status === 'cancelled'
  const isPaid = order.payment_status === 'paid'
  const isUnderReview = order.payment_status === 'under_review'
  const isRejected = order.payment_status === 'rejected'
  const isAwaitingProof = order.payment_status === 'awaiting_proof'

  const qrImageUrl = instructions?.qr_path ? publicImageUrl(instructions.qr_path) : null
  const instapayHandle = instructions?.instapay_handle ?? ''
  const instructionsAvailable = canReadInstructions && Boolean(instructions && (qrImageUrl || instapayHandle))
  const canUploadProof = (isAwaitingProof || isRejected) && !isExpired && instructionsAvailable

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-12">
      {/* Header and status */}
      <div className="rounded-card border border-border bg-surface p-6 sm:p-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <span className="text-caption font-medium text-text-muted">دفع الطلب</span>
            <h1 className="text-h2 font-bold font-accent text-brand">#{order.id}</h1>
          </div>

          {/* Status chips */}
          <div>
            {isPaid && (
              <span className="inline-flex items-center gap-1.5 rounded-pill border border-success bg-surface-tint px-3 py-1 text-small font-semibold text-success">
                <span className="size-2 rounded-pill bg-success" aria-hidden="true" />
                تم تأكيد الدفع
              </span>
            )}
            {isUnderReview && (
              <span className="inline-flex items-center gap-1.5 rounded-pill border border-caramel bg-surface-tint px-3 py-1 text-small font-semibold text-caramel">
                <span className="size-2 rounded-pill bg-caramel" aria-hidden="true" />
                قيد المراجعة
              </span>
            )}
            {isAwaitingProof && !isExpired && (
              <span className="inline-flex items-center gap-1.5 rounded-pill border border-warning bg-surface-tint px-3 py-1 text-small font-semibold text-warning">
                <span className="size-2 rounded-pill bg-warning" aria-hidden="true" />
                بانتظار الدفع
              </span>
            )}
            {isRejected && !isExpired && (
              <span className="inline-flex items-center gap-1.5 rounded-pill border border-danger bg-surface-tint px-3 py-1 text-small font-semibold text-danger">
                <span className="size-2 rounded-pill bg-danger" aria-hidden="true" />
                مرفوض
              </span>
            )}
            {isExpired && !isPaid && (
              <span className="inline-flex items-center gap-1.5 rounded-pill border border-danger bg-surface-tint px-3 py-1 text-small font-semibold text-danger">
                <span className="size-2 rounded-pill bg-danger" aria-hidden="true" />
                ملغي / انتهت المهلة
              </span>
            )}
          </div>
        </div>

        {/* Deadline countdown */}
        {order.payment_deadline && !isPaid && !isUnderReview && (
          <div
            className={`flex items-center justify-between rounded-chip border p-4 text-small ${
              isExpired
                ? 'border-danger/30 bg-danger/10 text-danger'
                : 'border-warning/30 bg-warning/10 text-warning'
            }`}
          >
            <span className="font-medium">
              {isExpired ? 'انتهت مهلة الدفع المحددة لهذا الطلب' : 'الوقت المتبقي لإتمام التحويل:'}
            </span>
            {!isExpired && (
              <span dir="ltr" className="font-mono text-body font-bold text-brand">
                {countdown.formatted}
              </span>
            )}
          </div>
        )}

        {/* Total Amount Card */}
        {canReadInstructions && instructions && (
          <div className="flex items-center justify-between rounded-chip bg-surface-2 p-4">
            <span className="text-body font-medium text-text">المبلغ المطلوب بدقة:</span>
            <span className="text-h3 font-bold text-brand">{formatEGP(instructions.amount)}</span>
          </div>
        )}
      </div>

      {canReadInstructions && instructionsLoading && (
        <div role="status" className="flex justify-center p-6"><PearlLoader loading /></div>
      )}
      {canReadInstructions && instructionsError && (
        <ErrorPanel error={instructionsError} title={t('pay.instructions_unavailable')} onRetry={() => void refetchInstructions()} />
      )}
      {canReadInstructions && !instructionsLoading && !instructionsError && !instructionsAvailable && (
        <p role="status" className="rounded-card border border-border bg-surface p-6 text-text-muted">{t('pay.instructions_missing')}</p>
      )}

      {/* Step by step instructions & QR details */}
      {instructionsAvailable && (
      <div className="rounded-card border border-border bg-surface p-6 sm:p-8 space-y-6">
        <h2 className="text-h3 font-bold text-text">خطوات الدفع عبر إنستاباي</h2>

        <ol className="space-y-3 text-body text-text-muted list-decimal list-inside">
          <li>افتح تطبيق إنستاباي أو تطبيق البنك الخاص بك.</li>
          <li>امسح رمز QR أدناه أو حوّل إلى معرّف إنستاباي الموضح.</li>
          <li>
            اكتب رقم الطلب <strong className="text-brand">#{order.id}</strong> في خانة ملاحظات
            التحويل.
          </li>
          <li>التقط لقطة شاشة لإشعار نجاح التحويل وارفعها أدناه مع رقم العملية.</li>
        </ol>

        {/* QR Code and Handle Container */}
        <div className="flex flex-col sm:flex-row items-center gap-6 rounded-chip border border-border bg-surface-2 p-6">
          {qrImageUrl && (<div className="relative size-48 shrink-0 overflow-hidden rounded-chip border border-border bg-bg p-2">
            <img
              src={qrImageUrl}
              alt="رمز QR لإنستاباي"
              className="size-full object-contain"
            />
          </div>)}

          <div className="flex-1 space-y-4 w-full">
            {instapayHandle && (<div>
              <span className="text-caption font-medium text-text-muted">
                معرّف إنستاباي (IPA):
              </span>
              <div className="flex items-center gap-2 mt-1">
                <code
                  dir="ltr"
                  className="flex-1 rounded-chip border border-border-input bg-bg px-3 py-2 font-mono text-small text-brand"
                >
                  {instapayHandle}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopy(instapayHandle, 'handle')}
                  className="rounded-pill border border-border bg-surface px-3 py-2 text-caption font-semibold text-text transition-colors hover:border-brand focus:outline-none focus:ring-2 focus:ring-focus"
                >
                  {copiedField === 'handle' ? 'تم النسخ ✓' : 'نسخ'}
                </button>
              </div>
            </div>)}

            <div>
              <span className="text-caption font-medium text-text-muted">
                رقم الطلب (يكتب في الملاحظات):
              </span>
              <div className="flex items-center gap-2 mt-1">
                <code
                  dir="ltr"
                  className="flex-1 rounded-chip border border-border-input bg-bg px-3 py-2 font-mono text-small text-brand"
                >
                  {order.id}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopy(String(order.id), 'reference')}
                  className="rounded-pill border border-border bg-surface px-3 py-2 text-caption font-semibold text-text transition-colors hover:border-brand focus:outline-none focus:ring-2 focus:ring-focus"
                >
                  {copiedField === 'reference' ? 'تم النسخ ✓' : 'نسخ'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      )}

      {/* Proof upload or status banner */}
      {isPaid ? (
        <div className="rounded-card border border-success/30 bg-success/5 p-6 sm:p-8 text-center space-y-4">
          <h2 className="text-h3 font-bold text-success">تم تأكيد الدفع بنجاح!</h2>
          <p className="text-body text-text-muted">
            طلبك مؤكد وجارٍ تحضيره للشحن والتوصيل. يمكنك متابعة حالة الشحن في صفحة طلباتك.
          </p>
          <div className="pt-2">
            <Link
              to="/account/orders"
              className="inline-flex h-11 items-center justify-center rounded-pill bg-brand px-6 text-small font-semibold text-brand-contrast transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-focus"
            >
              عرض طلباتي
            </Link>
          </div>
        </div>
      ) : isUnderReview ? (
        <div className="rounded-card border border-caramel/30 bg-caramel/5 p-6 sm:p-8 space-y-4 text-center">
          <h2 className="text-h3 font-bold text-caramel">إثبات التحويل قيد المراجعة</h2>
          <p className="text-body text-text-muted max-w-md mx-auto">
            تم استلام إشعار التحويل ورقم العملية بنجاح. يقوم فريق العمل بمطابقة التحويل في أسرع وقت.
          </p>
          {order.payment_reference && (
            <p className="text-caption text-text-muted">
              رقم العملية المسجل:{' '}
              <span dir="ltr" className="font-mono font-bold text-text">
                {order.payment_reference}
              </span>
            </p>
          )}
          <div className="pt-2">
            <Link
              to="/account/orders"
              className="inline-flex h-11 items-center justify-center rounded-pill border border-border bg-surface px-6 text-small font-semibold text-text hover:border-brand focus:outline-none focus:ring-2 focus:ring-focus"
            >
              العودة إلى طلباتي
            </Link>
          </div>
        </div>
      ) : canUploadProof ? (
        <form
          onSubmit={handleSubmit}
          className="rounded-card border border-border bg-surface p-6 sm:p-8 space-y-6"
        >
          <div>
            <h2 className="text-h3 font-bold text-text">رفع إثبات التحويل</h2>
            <p className="text-caption text-text-muted mt-1">
              الصور المقبولة: JPG أو PNG أو WebP بحجم 5 ميجابايت كحد أقصى.
            </p>
          </div>

          {/* Rejection alert if prior proof was rejected */}
          {isRejected && (
            <div className="rounded-chip border border-danger/30 bg-danger/10 p-4 text-small text-danger space-y-1">
              <p className="font-bold">تم رفض إثبات الدفع السابق.</p>
              {order.payment_review_note ? (
                <p>ملاحظة الإدارة: {order.payment_review_note}</p>
              ) : (
                <p>يرجى التأكد من صحة رقم العملية ووضوح إشعار التحويل قبل إعادة الرفع.</p>
              )}
            </div>
          )}

          {/* Reference Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="transfer-reference"
              className="block text-small font-semibold text-text"
            >
              رقم عملية التحويل (Reference Number) <span className="text-danger">*</span>
            </label>
            <input
              id="transfer-reference"
              type="text"
              required
              value={referenceInput}
              onChange={(e) => setReferenceInput(e.target.value)}
              placeholder="مثال: 0123456789 أو Ref-987654"
              className="h-11 w-full rounded-chip border border-border-input bg-bg px-3 text-body text-text placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-focus"
            />
            <p className="text-caption text-text-muted">
              الرقم الظاهر في إشعار التحويل من تطبيق إنستاباي أو البنك.
            </p>
          </div>

          {/* File Upload Dropzone */}
          <div className="space-y-2">
            <label htmlFor="proof-file-input" className="block text-small font-semibold text-text">
              صورة إشعار التحويل <span className="text-danger">*</span>
            </label>

            <div
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  fileInputRef.current?.click()
                }
              }}
              role="button"
              tabIndex={0}
              className="flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-chip border-2 border-dashed border-border p-6 text-center transition-colors hover:border-brand hover:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-focus"
            >
              <input
                id="proof-file-input"
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null
                  void handleFileChange(file)
                }}
              />

              {filePreviewUrl ? (
                <div className="space-y-3">
                  <img
                    src={filePreviewUrl}
                    alt="معاينة إشعار التحويل"
                    className="max-h-40 rounded-chip object-contain mx-auto"
                  />
                  <p className="text-caption text-brand font-medium">
                    {selectedFile?.name} (انقر للتغيير)
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="size-10 rounded-pill bg-surface-2 mx-auto flex items-center justify-center text-brand">
                    <svg
                      className="size-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                      />
                    </svg>
                  </div>
                  <p className="text-body font-medium text-text">انقر لاختيار صورة إشعار التحويل</p>
                  <p className="text-caption text-text-muted">JPG أو PNG أو WebP حتى 5 ميجابايت</p>
                </div>
              )}
            </div>

            {/* Validation Error Display */}
            {validationError && (
              <div className="pt-1">
                <ErrorMessage code={validationError} />
              </div>
            )}
          </div>

          {/* Submission Error Display */}
          {submitMutation.error && (
            <div className="rounded-chip border border-danger/30 bg-danger/10 p-4">
              <ErrorMessage error={submitMutation.error} />
            </div>
          )}

          {/* Submit CTA */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={
                !selectedFile ||
                !referenceInput.trim() ||
                submitMutation.isPending ||
                Boolean(validationError)
              }
              className="inline-flex h-12 w-full items-center justify-center rounded-pill bg-brand px-6 text-body font-semibold text-brand-contrast transition-opacity hover:opacity-90 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-focus"
            >
              {submitMutation.isPending
                ? 'جارٍ رفع الإثبات وتأكيد الطلب...'
                : 'تأكيد وإرسال إثبات التحويل'}
            </button>
          </div>
        </form>
      ) : isExpired ? (
        <div className="rounded-card border border-danger/30 bg-danger/5 p-6 sm:p-8 text-center space-y-4">
          <h2 className="text-h3 font-bold text-danger">انتهت مهلة الدفع المحددة</h2>
          <p className="text-body text-text-muted">
            انتهت مهلة الدفع لهذا الطلب. تم إلغاء الطلب واسترجاع المنتجات إلى المخزون.
          </p>
          <div className="pt-2 flex justify-center gap-4">
            <Link
              to="/account/orders"
              className="inline-flex h-11 items-center justify-center rounded-pill border border-border bg-surface px-6 text-small font-semibold text-text hover:border-brand focus:outline-none focus:ring-2 focus:ring-focus"
            >
              متابعة طلباتي
            </Link>
            <Link
              to="/"
              className="inline-flex h-11 items-center justify-center rounded-pill bg-brand px-6 text-small font-semibold text-brand-contrast transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-focus"
            >
              العودة للتسوق
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}

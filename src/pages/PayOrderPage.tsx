import { useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useSeo } from '@/features/seo'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  useOrderPaymentDetails,
  usePaymentInstructions,
  useSubmitPaymentProof,
  usePaymentCountdown,
  validateProofFile,
} from '@/features/payments'
import { publicImageUrl } from '@/lib/images'
import { formatEGP } from '@/lib/format'
import { PearlLoader } from '@/components/ui/PearlLoader'
import { ErrorPanel } from '@/components/ui/ErrorPanel'
import { ErrorMessage } from '@/lib/errors'
import { useToast } from '@/components/ui/ToastProvider'
import { Ltr } from '@/components/ui/Ltr'
import { ThemedQrCode } from '@/components/ui/ThemedQrCode'

const copy = {
  ar: {
    loading: 'جارٍ تحميل بيانات الدفع',
    fetchError: 'تعذّر تحميل بيانات الدفع',
    retry: 'إعادة المحاولة',
    codTitle: 'الدفع عند الاستلام',
    codDesc: (id: number) =>
      `هذا الطلب (#${id}) مسجل بطريقة الدفع عند الاستلام، ولا يتطلب تحويلًا عبر إنستاباي.`,
    viewOrderDetails: 'عرض تفاصيل الطلب',
    payOrder: 'دفع الطلب',
    statusAwaitingApproval: 'بانتظار موافقة المتجر',
    statusPaid: 'تم تأكيد الدفع',
    statusUnderReview: 'قيد المراجعة',
    statusAwaitingProof: 'بانتظار الدفع',
    statusRejected: 'مرفوض',
    statusExpired: 'ملغي / انتهت المهلة',
    deadlineExpired: 'انتهت مهلة الدفع المحددة لهذا الطلب',
    deadlineRemaining: 'الوقت المتبقي لإتمام التحويل:',
    exactAmount: 'المبلغ المطلوب بدقة:',
    approvalTitle: 'طلبك قيد المراجعة والموافقة',
    approvalDesc: 'وصل طلبك للمتجر. سنراجعه ونرسل لك رابط الدفع قريبًا.',
    backToOrders: 'العودة إلى طلباتي',
    stepsTitle: 'خطوات الدفع عبر إنستاباي',
    step1: 'افتح تطبيق إنستاباي أو تطبيق البنك الخاص بك.',
    step2: 'امسح رمز QR أدناه أو حوّل إلى معرّف إنستاباي الموضح.',
    step3Pre: 'اكتب رقم الطلب ',
    step3Post: ' في خانة ملاحظات التحويل.',
    step4: 'التقط لقطة شاشة لإشعار نجاح التحويل وارفعها أدناه مع رقم العملية.',
    qrAlt: 'رمز QR لإنستاباي',
    ipaLabel: 'معرّف إنستاباي (IPA):',
    orderNumLabel: 'رقم الطلب (يكتب في الملاحظات):',
    copy: 'نسخ',
    copied: 'تم النسخ ✓',
    openInstaPay: 'فتح في تطبيق إنستاباي',
    qrUnavailable:
      'رمز الاستجابة السريعة غير متوفر حالياً. يرجى التحويل مباشرة إلى معرّف إنستاباي الموضح أعلاه.',
    paidTitle: 'تم تأكيد الدفع بنجاح!',
    paidDesc: 'طلبك مؤكد وجارٍ تحضيره للشحن والتوصيل. يمكنك متابعة حالة الشحن في صفحة طلباتك.',
    viewMyOrders: 'عرض طلباتي',
    underReviewTitle: 'إثبات التحويل قيد المراجعة',
    underReviewDesc:
      'تم استلام إشعار التحويل ورقم العملية بنجاح. يقوم فريق العمل بمطابقة التحويل في أسرع وقت.',
    registeredRef: 'رقم العملية المسجل: ',
    uploadTitle: 'رفع إثبات التحويل',
    uploadHints: 'الصور المقبولة: JPG أو PNG أو WebP بحجم 5 ميجابايت كحد أقصى.',
    proofRejected: 'تم رفض إثبات الدفع السابق.',
    adminNote: 'ملاحظة الإدارة: ',
    reuploadTip: 'يرجى التأكد من صحة رقم العملية ووضوح إشعار التحويل قبل إعادة الرفع.',
    refLabel: 'رقم عملية التحويل (Reference Number)',
    refPlaceholder: 'مثال: 0123456789 أو Ref-987654',
    refHint: 'الرقم الظاهر في إشعار التحويل من تطبيق إنستاباي أو البنك.',
    receiptLabel: 'صورة إشعار التحويل',
    receiptPreviewAlt: 'معاينة إشعار التحويل',
    clickToChange: '(انقر للتغيير)',
    clickToSelect: 'انقر لاختيار صورة إشعار التحويل',
    formatsAllowed: 'JPG أو PNG أو WebP حتى 5 ميجابايت',
    submitting: 'جارٍ رفع الإثبات وتأكيد الطلب...',
    submitBtn: 'تأكيد وإرسال إثبات التحويل',
    toastSuccessMsg: 'إشعار التحويل قيد المراجعة من قبل إدارة المتجر.',
    toastSuccessTitle: 'تم إرسال إثبات الدفع',
    windowExpiredTitle: 'انتهت مهلة الدفع المحددة',
    windowExpiredDesc: 'انتهت مهلة الدفع لهذا الطلب. تم إلغاء الطلب واسترجاع المنتجات إلى المخزون.',
    trackOrders: 'متابعة طلباتي',
    backToShopping: 'العودة للتسوق',
    seoTitle: (id?: number) => (id ? `دفع الطلب #${id} | لوليز` : 'دفع الطلب | لوليز'),
    seoDescription: 'سداد قيمة الطلب عبر تحويل إنستاباي ورفع إشعار الدفع',
  },
  en: {
    loading: 'Loading payment details...',
    fetchError: 'Failed to load payment details',
    retry: 'Retry',
    codTitle: 'Cash on Delivery',
    codDesc: (id: number) =>
      `This order (#${id}) is registered for Cash on Delivery and does not require an InstaPay transfer.`,
    viewOrderDetails: 'View Order Details',
    payOrder: 'Pay Order',
    statusAwaitingApproval: 'Awaiting store approval',
    statusPaid: 'Payment confirmed',
    statusUnderReview: 'Under review',
    statusAwaitingProof: 'Awaiting payment',
    statusRejected: 'Rejected',
    statusExpired: 'Cancelled / Expired',
    deadlineExpired: 'Payment deadline has expired for this order',
    deadlineRemaining: 'Time remaining to complete payment:',
    exactAmount: 'Exact amount required:',
    approvalTitle: 'Your order is under review and approval',
    approvalDesc:
      'Your order has been received. We will review it and send your payment link shortly.',
    backToOrders: 'Back to My Orders',
    stepsTitle: 'InstaPay Payment Steps',
    step1: 'Open the InstaPay app or your mobile banking app.',
    step2: 'Scan the QR code below or transfer to the indicated InstaPay handle.',
    step3Pre: 'Enter the order number ',
    step3Post: ' in the transfer notes/reference field.',
    step4:
      'Take a screenshot of the transfer confirmation and upload it below with the reference number.',
    qrAlt: 'InstaPay QR Code',
    ipaLabel: 'InstaPay Handle (IPA):',
    orderNumLabel: 'Order Number (include in notes):',
    copy: 'Copy',
    copied: 'Copied ✓',
    openInstaPay: 'Open InstaPay App',
    qrUnavailable:
      'QR code is currently unavailable. Please transfer directly to the InstaPay handle shown above.',
    paidTitle: 'Payment Confirmed Successfully!',
    paidDesc:
      'Your order is confirmed and being prepared for shipping. You can track shipping status on your orders page.',
    viewMyOrders: 'View My Orders',
    underReviewTitle: 'Payment Proof Under Review',
    underReviewDesc:
      'We have received your transfer receipt and reference number. Our team will verify the payment as quickly as possible.',
    registeredRef: 'Registered reference number: ',
    uploadTitle: 'Upload Payment Proof',
    uploadHints: 'Accepted formats: JPG, PNG, or WebP up to 5MB.',
    proofRejected: 'Previous payment proof was rejected.',
    adminNote: 'Admin note: ',
    reuploadTip:
      'Please verify the reference number and ensure the receipt is clear before re-uploading.',
    refLabel: 'Transfer Reference Number',
    refPlaceholder: 'e.g. 0123456789 or Ref-987654',
    refHint: 'The reference number shown on your InstaPay or bank receipt.',
    receiptLabel: 'Transfer Receipt Image',
    receiptPreviewAlt: 'Transfer receipt preview',
    clickToChange: '(Click to change)',
    clickToSelect: 'Click to select transfer receipt image',
    formatsAllowed: 'JPG, PNG, or WebP up to 5MB',
    submitting: 'Uploading proof and confirming...',
    submitBtn: 'Confirm and Submit Payment Proof',
    toastSuccessMsg: 'Transfer proof is under review by store administration.',
    toastSuccessTitle: 'Payment proof submitted',
    windowExpiredTitle: 'Payment Window Expired',
    windowExpiredDesc:
      'The payment deadline for this order has expired. The order was cancelled and items returned to stock.',
    trackOrders: 'View My Orders',
    backToShopping: 'Back to Shopping',
    seoTitle: (id?: number) => (id ? `Pay Order #${id} | Lolys` : 'Pay Order | Lolys'),
    seoDescription: 'Pay for your order via InstaPay transfer and upload proof of payment',
  },
}

export default function PayOrderPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const parsedOrderId = orderId ? parseInt(orderId, 10) : undefined

  const { lang } = useLanguage()
  const isAr = lang === 'ar'
  const tPage = isAr ? copy.ar : copy.en

  useSeo({
    title: tPage.seoTitle(parsedOrderId),
    description: tPage.seoDescription,
    noindex: true,
  })

  const { user } = useAuth()
  const { success: toastSuccess } = useToast()
  const { data: order, isLoading, error, refetch } = useOrderPaymentDetails(parsedOrderId)
  const isOrderAwaitingApproval =
    order?.payment_status === 'awaiting_approval' && order?.status !== 'cancelled'
  const { data: instructions } = usePaymentInstructions(
    parsedOrderId,
    !isOrderAwaitingApproval && Boolean(order) && order?.status !== 'cancelled',
  )

  const [referenceInput, setReferenceInput] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<'UPL-001' | 'UPL-002' | null>(null)
  const [copiedField, setCopiedField] = useState<'handle' | 'reference' | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const submitMutation = useSubmitPaymentProof()

  const effectiveDeadline = instructions?.deadline || order?.payment_deadline
  const countdown = usePaymentCountdown(effectiveDeadline)

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
    if (!user || !order || !selectedFile || !referenceInput.trim()) return

    try {
      await submitMutation.mutateAsync({
        userId: user.id,
        orderId: order.id,
        reference: referenceInput.trim(),
        file: selectedFile,
      })

      toastSuccess(tPage.toastSuccessMsg, tPage.toastSuccessTitle)
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
        aria-label={tPage.loading}
        className="flex min-h-[50vh] w-full items-center justify-center text-brand"
      >
        <PearlLoader loading />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-xl py-12">
        <ErrorPanel
          error={error}
          title={tPage.fetchError}
          retryLabel={tPage.retry}
          onRetry={() => void refetch()}
        />
      </div>
    )
  }

  // Not an InstaPay order
  if (order.payment_method !== 'instapay_qr') {
    return (
      <div className="mx-auto max-w-xl space-y-6 py-12">
        <div className="rounded-card border border-border bg-surface p-6 sm:p-8 text-center space-y-4">
          <h1 className="text-h2 font-bold font-accent text-brand">{tPage.codTitle}</h1>
          <p className="text-body text-text-muted">{tPage.codDesc(order.id)}</p>
          <div className="pt-4 flex justify-center gap-4">
            <Link
              to="/account/orders"
              className="inline-flex h-11 items-center justify-center rounded-pill bg-brand px-6 text-small font-semibold text-brand-contrast transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-focus"
            >
              {tPage.viewOrderDetails}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const isExpired = countdown.isExpired || order.status === 'cancelled'
  const isPaid = order.payment_status === 'paid'
  const isUnderReview = order.payment_status === 'under_review'
  const isRejected = order.payment_status === 'rejected'
  const isAwaitingProof = order.payment_status === 'awaiting_proof'
  const isAwaitingApproval = order.payment_status === 'awaiting_approval' && !isExpired

  const canUploadProof = (isAwaitingProof || isRejected) && !isExpired && !isAwaitingApproval

  const effectiveTotal = instructions?.amount ?? order.total

  const qrPath = instructions?.qr_path
  const qrImageUrl =
    !qrPath || qrPath === 'settings/instapay-qr-default.png'
      ? '/placeholders/instapay-qr.svg'
      : publicImageUrl(qrPath) || '/placeholders/instapay-qr.svg'

  const instapayHandle =
    instructions?.handle || instructions?.instapay_handle || 'alaa.ahm9624@instapay'

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-12">
      {/* Header and status */}
      <div className="rounded-card border border-border bg-surface p-6 sm:p-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <span className="text-caption font-medium text-text-muted">{tPage.payOrder}</span>
            <h1 className="text-h2 font-bold font-accent text-brand">
              <Ltr>#{order.id}</Ltr>
            </h1>
          </div>

          {/* Status chips */}
          <div>
            {isAwaitingApproval && (
              <span className="inline-flex items-center gap-1.5 rounded-pill border border-brand bg-surface-tint px-3 py-1 text-small font-semibold text-brand">
                <span className="size-2 rounded-pill bg-brand animate-pulse" aria-hidden="true" />
                {tPage.statusAwaitingApproval}
              </span>
            )}
            {isPaid && (
              <span className="inline-flex items-center gap-1.5 rounded-pill border border-success bg-surface-tint px-3 py-1 text-small font-semibold text-success">
                <span className="size-2 rounded-pill bg-success" aria-hidden="true" />
                {tPage.statusPaid}
              </span>
            )}
            {isUnderReview && (
              <span className="inline-flex items-center gap-1.5 rounded-pill border border-caramel bg-surface-tint px-3 py-1 text-small font-semibold text-caramel">
                <span className="size-2 rounded-pill bg-caramel" aria-hidden="true" />
                {tPage.statusUnderReview}
              </span>
            )}
            {isAwaitingProof && !isExpired && (
              <span className="inline-flex items-center gap-1.5 rounded-pill border border-warning bg-surface-tint px-3 py-1 text-small font-semibold text-warning">
                <span className="size-2 rounded-pill bg-warning" aria-hidden="true" />
                {tPage.statusAwaitingProof}
              </span>
            )}
            {isRejected && !isExpired && (
              <span className="inline-flex items-center gap-1.5 rounded-pill border border-danger bg-surface-tint px-3 py-1 text-small font-semibold text-danger">
                <span className="size-2 rounded-pill bg-danger" aria-hidden="true" />
                {tPage.statusRejected}
              </span>
            )}
            {isExpired && !isPaid && !isAwaitingApproval && (
              <span className="inline-flex items-center gap-1.5 rounded-pill border border-danger bg-surface-tint px-3 py-1 text-small font-semibold text-danger">
                <span className="size-2 rounded-pill bg-danger" aria-hidden="true" />
                {tPage.statusExpired}
              </span>
            )}
          </div>
        </div>

        {/* Deadline countdown */}
        {(effectiveDeadline || isExpired) && !isPaid && !isUnderReview && !isAwaitingApproval && (
          <div
            className={`flex items-center justify-between rounded-chip border p-4 text-small ${
              isExpired
                ? 'border-danger/30 bg-danger/10 text-danger'
                : 'border-warning/30 bg-warning/10 text-warning'
            }`}
          >
            <span className="font-medium">
              {isExpired ? tPage.deadlineExpired : tPage.deadlineRemaining}
            </span>
            {!isExpired && (
              <span dir="ltr" className="font-mono text-body font-bold text-brand">
                {countdown.formatted}
              </span>
            )}
          </div>
        )}

        {/* Total Amount Card */}
        <div className="flex items-center justify-between rounded-chip bg-surface-2 p-4">
          <span className="text-body font-medium text-text">{tPage.exactAmount}</span>
          <span className="text-h3 font-bold text-brand">{formatEGP(effectiveTotal)}</span>
        </div>
      </div>

      {isAwaitingApproval ? (
        <div className="rounded-card border border-border bg-surface p-6 sm:p-8 text-center space-y-4">
          <div className="mx-auto flex size-12 items-center justify-center rounded-pill bg-surface-2 text-brand">
            <svg
              className="size-6 animate-pulse"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-h3 font-bold font-accent text-brand">{tPage.approvalTitle}</h2>
          <p className="text-body text-text-muted max-w-md mx-auto">{tPage.approvalDesc}</p>
          <div className="pt-2">
            <Link
              to="/account/orders"
              className="inline-flex h-11 items-center justify-center rounded-pill border border-border bg-surface px-6 text-small font-semibold text-text hover:border-brand focus:outline-none focus:ring-2 focus:ring-focus"
            >
              {tPage.backToOrders}
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Step by step instructions & QR details */}
          <div className="rounded-card border border-border bg-surface p-6 sm:p-8 space-y-6">
            <h2 className="text-h3 font-bold text-text">{tPage.stepsTitle}</h2>

            <ol className="space-y-3 text-body text-text-muted list-decimal list-inside">
              <li>{tPage.step1}</li>
              <li>{tPage.step2}</li>
              <li>
                {tPage.step3Pre}
                <strong className="text-brand">
                  <Ltr>#{order.id}</Ltr>
                </strong>
                {tPage.step3Post}
              </li>
              <li>{tPage.step4}</li>
            </ol>

            {/* QR Code and Handle Container */}
            <div className="flex flex-col sm:flex-row items-center gap-6 rounded-chip border border-border bg-surface-2 p-6">
              <div className="shrink-0 flex flex-col items-center gap-3">
                {instructions?.link ? (
                  <ThemedQrCode
                    value={instructions.link}
                    handle={instapayHandle}
                    alt={tPage.qrAlt}
                    size={180}
                  />
                ) : qrImageUrl && qrImageUrl !== '/placeholders/instapay-qr.svg' ? (
                  <div className="relative size-48 shrink-0 overflow-hidden rounded-chip border border-border bg-bg p-2">
                    <img
                      src={qrImageUrl}
                      alt={tPage.qrAlt}
                      className="size-full object-contain"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholders/instapay-qr.svg'
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex size-48 flex-col items-center justify-center rounded-card border border-dashed border-border p-4 text-center text-text-muted">
                    <span className="text-small font-medium">{tPage.qrUnavailable}</span>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-4 w-full">
                {/* Mobile same-device direct open link */}
                {instructions?.link && (
                  <div>
                    <a
                      href={instructions.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-pill bg-brand px-4 py-2.5 text-small font-semibold text-brand-contrast shadow-pill transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-focus"
                    >
                      <svg
                        className="size-4 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                      <span>{tPage.openInstaPay}</span>
                    </a>
                  </div>
                )}

                <div>
                  <span className="text-caption font-medium text-text-muted">{tPage.ipaLabel}</span>
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
                      {copiedField === 'handle' ? tPage.copied : tPage.copy}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-caption font-medium text-text-muted">
                    {tPage.orderNumLabel}
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
                      {copiedField === 'reference' ? tPage.copied : tPage.copy}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Proof upload or status banner */}
          {isPaid ? (
            <div className="rounded-card border border-success/30 bg-success/5 p-6 sm:p-8 text-center space-y-4">
              <h2 className="text-h3 font-bold text-success">{tPage.paidTitle}</h2>
              <p className="text-body text-text-muted">{tPage.paidDesc}</p>
              <div className="pt-2">
                <Link
                  to="/account/orders"
                  className="inline-flex h-11 items-center justify-center rounded-pill bg-brand px-6 text-small font-semibold text-brand-contrast transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-focus"
                >
                  {tPage.viewMyOrders}
                </Link>
              </div>
            </div>
          ) : isUnderReview ? (
            <div className="rounded-card border border-caramel/30 bg-caramel/5 p-6 sm:p-8 space-y-4 text-center">
              <h2 className="text-h3 font-bold text-caramel">{tPage.underReviewTitle}</h2>
              <p className="text-body text-text-muted max-w-md mx-auto">{tPage.underReviewDesc}</p>
              {order.payment_reference && (
                <p className="text-caption text-text-muted">
                  {tPage.registeredRef}
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
                  {tPage.backToOrders}
                </Link>
              </div>
            </div>
          ) : canUploadProof ? (
            <form
              onSubmit={handleSubmit}
              className="rounded-card border border-border bg-surface p-6 sm:p-8 space-y-6"
            >
              <div>
                <h2 className="text-h3 font-bold text-text">{tPage.uploadTitle}</h2>
                <p className="text-caption text-text-muted mt-1">{tPage.uploadHints}</p>
              </div>

              {/* Rejection alert if prior proof was rejected */}
              {isRejected && (
                <div className="rounded-chip border border-danger/30 bg-danger/10 p-4 text-small text-danger space-y-1">
                  <p className="font-bold">{tPage.proofRejected}</p>
                  {order.payment_review_note ? (
                    <p>
                      {tPage.adminNote}
                      {order.payment_review_note}
                    </p>
                  ) : (
                    <p>{tPage.reuploadTip}</p>
                  )}
                </div>
              )}

              {/* Reference Input */}
              <div className="space-y-1.5">
                <label
                  htmlFor="transfer-reference"
                  className="block text-small font-semibold text-text"
                >
                  {tPage.refLabel} <span className="text-danger">*</span>
                </label>
                <input
                  id="transfer-reference"
                  type="text"
                  required
                  value={referenceInput}
                  onChange={(e) => setReferenceInput(e.target.value)}
                  placeholder={tPage.refPlaceholder}
                  className="h-11 w-full rounded-chip border border-border-input bg-bg px-3 text-body text-text placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-focus"
                />
                <p className="text-caption text-text-muted">{tPage.refHint}</p>
              </div>

              {/* File Upload Dropzone */}
              <div className="space-y-2">
                <label
                  htmlFor="proof-file-input"
                  className="block text-small font-semibold text-text"
                >
                  {tPage.receiptLabel} <span className="text-danger">*</span>
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
                        alt={tPage.receiptPreviewAlt}
                        className="max-h-40 rounded-chip object-contain mx-auto"
                      />
                      <p className="text-caption text-brand font-medium">
                        {selectedFile?.name} {tPage.clickToChange}
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
                      <p className="text-body font-medium text-text">{tPage.clickToSelect}</p>
                      <p className="text-caption text-text-muted">{tPage.formatsAllowed}</p>
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
                  {submitMutation.isPending ? tPage.submitting : tPage.submitBtn}
                </button>
              </div>
            </form>
          ) : (
            <div className="rounded-card border border-danger/30 bg-danger/5 p-6 sm:p-8 text-center space-y-4">
              <h2 className="text-h3 font-bold text-danger">{tPage.windowExpiredTitle}</h2>
              <p className="text-body text-text-muted">{tPage.windowExpiredDesc}</p>
              <div className="pt-2 flex justify-center gap-4">
                <Link
                  to="/account/orders"
                  className="inline-flex h-11 items-center justify-center rounded-pill border border-border bg-surface px-6 text-small font-semibold text-text hover:border-brand focus:outline-none focus:ring-2 focus:ring-focus"
                >
                  {tPage.trackOrders}
                </Link>
                <Link
                  to="/"
                  className="inline-flex h-11 items-center justify-center rounded-pill bg-brand px-6 text-small font-semibold text-brand-contrast transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-focus"
                >
                  {tPage.backToShopping}
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

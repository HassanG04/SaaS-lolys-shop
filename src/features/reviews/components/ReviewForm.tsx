import { useState, useId } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StarRating } from './StarRating'
import { containsProfanity, cleanProfanity, findProfanities } from '../profanity'
import { useSubmitReview } from '../hooks'
import { useToast } from '@/components/ui/ToastProvider'
import { useLanguage } from '@/i18n/LanguageProvider'
import { ErrorPanel } from '@/components/ui/ErrorPanel'
import { Sparkle } from '@/components/ui/ornaments'

interface ReviewFormProps {
  productId: number
  initialRating?: number
  initialComment?: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function ReviewForm({
  productId,
  initialRating = 5,
  initialComment = '',
  onSuccess,
  onCancel,
}: ReviewFormProps) {
  const { lang } = useLanguage()
  const isAr = lang === 'ar'
  const toast = useToast()
  const textareaId = useId()

  const [rating, setRating] = useState<number>(initialRating)
  const [comment, setComment] = useState<string>(initialComment)
  const [formError, setFormError] = useState<unknown | null>(null)

  const submitMutation = useSubmitReview()

  // Live profanity detection
  const hasProfanity = containsProfanity(comment)
  const detectedWords = hasProfanity ? findProfanities(comment) : []

  const handleCleanProfanities = () => {
    const cleaned = cleanProfanity(comment)
    setComment(cleaned)
    toast.info(
      isAr
        ? 'تم تنظيف واستبدال الكلمات غير اللائقة تلقائيًا.'
        : 'Inappropriate words replaced automatically.',
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (rating < 1 || rating > 5) {
      toast.error(isAr ? 'يرجى اختيار تقييم من 1 إلى 5 نجوم.' : 'Please choose 1-5 stars.')
      return
    }

    const trimmed = comment.trim()
    if (!trimmed) {
      toast.error(isAr ? 'يرجى كتابة نص التقييم.' : 'Please write your review.')
      return
    }

    if (hasProfanity) {
      toast.error(
        isAr
          ? 'تم منع الإرسال لاحتواء النص على كلمات غير لائقة. يرجى تعديلها أو تنظيفها.'
          : 'Submission blocked due to profanity. Please clean or remove.',
      )
      return
    }

    try {
      await submitMutation.mutateAsync({
        productId,
        rating,
        comment: trimmed,
      })

      toast.success(
        isAr
          ? 'شكرًا لك! تم نشر تقييمك للمنتج بنجاح.'
          : 'Thank you! Your review has been published.',
      )
      onSuccess?.()
    } catch (err) {
      setFormError(err)
    }
  }

  return (
    <Card className="p-5 sm:p-6 space-y-5 border border-brand/20 bg-surface shadow-card transition-all">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Sparkle className="size-5 text-brand" />
          <h3 className="text-h3 font-bold font-accent text-brand">
            {isAr ? 'تقييم المنتج وتجربتك' : 'Rate & Review Product'}
          </h3>
        </div>
        <span className="text-caption font-semibold text-success bg-success/10 border border-success/30 px-2.5 py-0.5 rounded-pill">
          {isAr ? 'مشتري موثق' : 'Verified Buyer'}
        </span>
      </div>

      {formError ? <ErrorPanel error={formError} /> : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 1. Star Rating Selector */}
        <div className="space-y-2">
          <label className="block text-small font-semibold text-text">
            {isAr ? 'تقييمك للمنتج' : 'Your Rating'} <span className="text-danger">*</span>
          </label>
          <div className="flex items-center gap-3">
            <StarRating
              value={rating}
              onChange={setRating}
              size="lg"
              className="bg-surface-tint p-2 rounded-card border border-border"
            />
          </div>
        </div>

        {/* 2. Comment Description */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor={textareaId} className="block text-small font-semibold text-text">
              {isAr ? 'رأيك وتفاصيل التجربة' : 'Your Experience & Review'}{' '}
              <span className="text-danger">*</span>
            </label>
            <span
              className={`text-caption font-mono ${
                comment.length > 900 ? 'text-warning font-bold' : 'text-text-muted'
              }`}
            >
              {comment.length} / 1000
            </span>
          </div>

          <textarea
            id={textareaId}
            rows={4}
            maxLength={1000}
            required
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={
              isAr
                ? 'شاركنا رأيك في جودة المنتج، الخامة، ودقة التفاصيل...'
                : 'Share your thoughts on product quality, materials, and finish...'
            }
            className={`w-full rounded-chip border p-3 text-body text-text focus:outline-none focus:ring-2 focus:ring-focus transition-colors ${
              hasProfanity
                ? 'border-danger bg-danger/5 focus:border-danger'
                : 'border-border-input bg-bg focus:border-brand'
            }`}
            dir={isAr ? 'rtl' : 'ltr'}
          />
        </div>

        {/* 3. Live Profanity Protection Warning */}
        {hasProfanity ? (
          <div
            className="rounded-card border border-danger/40 bg-danger/10 p-3.5 space-y-2.5 animate-pulse"
            role="alert"
          >
            <div className="flex items-start gap-2.5">
              <span className="text-body font-bold text-danger">🛡️</span>
              <div className="space-y-1">
                <p className="text-small font-bold text-danger">
                  {isAr
                    ? 'نظام الحماية: تم اكتشاف كلمات غير لائقة في النص!'
                    : 'Protection Alert: Inappropriate language detected!'}
                </p>
                <p className="text-caption text-text-muted leading-relaxed">
                  {isAr
                    ? 'يمنع نشر الشتائم والألفاظ غير اللائقة نهائيًا. إرسال تعليق يحتوي على هذه الألفاظ سيعرض حسابك للحظر الدائم فورًا.'
                    : 'Profanity is strictly prohibited. Submitting inappropriate language will permanently suspend your account.'}
                </p>
                {detectedWords.length > 0 ? (
                  <p className="text-caption font-mono text-danger">
                    {isAr ? 'الكلمات المكتشفة:' : 'Detected:'} {detectedWords.join(', ')}
                  </p>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              onClick={handleCleanProfanities}
              className="text-small font-semibold text-brand bg-surface border border-border px-3 py-1.5 rounded-pill hover:border-brand transition-colors inline-flex items-center gap-1.5 shadow-pill"
            >
              <span>
                ✨{' '}
                {isAr ? 'استبدال الكلمات غير اللائقة بـ (***)' : 'Clean words automatically (***)'}
              </span>
            </button>
          </div>
        ) : null}

        {/* 4. Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {onCancel ? (
            <Button type="button" variant="ghost" onClick={onCancel}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
          ) : null}

          <Button
            type="submit"
            variant="primary"
            disabled={submitMutation.isPending || hasProfanity || !comment.trim()}
            className="min-w-32"
          >
            {submitMutation.isPending
              ? isAr
                ? 'جارٍ النشر...'
                : 'Publishing...'
              : isAr
                ? 'نشر التقييم'
                : 'Submit Review'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { StarRating } from './StarRating'
import { ReviewForm } from './ReviewForm'
import { useProductReviews, useProductReviewSummary, useUserReviewEligibility } from '../hooks'
import { useLanguage } from '@/i18n/LanguageProvider'
import { RibbonBow, Sparkle } from '@/components/ui/ornaments'

interface ProductReviewsSectionProps {
  productId: number
}

export function ProductReviewsSection({ productId }: ProductReviewsSectionProps) {
  const { lang } = useLanguage()
  const isAr = lang === 'ar'

  const [isWritingReview, setIsWritingReview] = useState(false)

  const { data: reviews, isLoading: isReviewsLoading } = useProductReviews(productId)
  const { data: summary, isLoading: isSummaryLoading } = useProductReviewSummary(productId)
  const { data: eligibility, isLoading: isEligibilityLoading } = useUserReviewEligibility(productId)

  const reviewCount = summary?.review_count ?? 0
  const avgRating = summary?.average_rating ?? 0
  const distribution = summary?.distribution ?? { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }

  return (
    <section aria-labelledby="reviews-heading" className="space-y-6 pt-8 border-t border-border">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 id="reviews-heading" className="text-h2 font-bold font-accent text-brand">
            {isAr ? 'تقييمات وتجارب العملاء' : 'Customer Reviews & Ratings'}
          </h2>
          <p className="text-small text-text-muted mt-1">
            {isAr
              ? 'تقييمات حقيقية من عملاء موثقين اشتروا هذا المنتج بالفعل'
              : 'Authentic reviews from verified customers who purchased this item'}
          </p>
        </div>

        {/* Action Button depending on eligibility */}
        {!isEligibilityLoading && (
          <div>
            {!eligibility?.is_authenticated ? (
              <Link
                to="/login"
                className="inline-flex h-10 items-center justify-center rounded-pill border border-brand bg-surface px-5 text-small font-semibold text-brand hover:bg-brand/5 transition-colors"
              >
                {isAr ? 'سجّل دخولك للتقييم' : 'Sign in to review'}
              </Link>
            ) : eligibility.is_banned ? (
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-danger/10 border border-danger/30 px-3 py-1 text-small font-semibold text-danger">
                {isAr ? 'الحساب موقوف' : 'Account suspended'}
              </span>
            ) : eligibility.has_purchased ? (
              <Button
                variant={isWritingReview ? 'ghost' : 'primary'}
                onClick={() => setIsWritingReview(!isWritingReview)}
              >
                {isWritingReview
                  ? isAr
                    ? 'إغلاق النموذج'
                    : 'Close Form'
                  : eligibility.existing_review
                    ? isAr
                      ? 'تعديل تقييمك'
                      : 'Edit Your Review'
                    : isAr
                      ? 'أضف تقييمك الآن'
                      : 'Write a Review'}
              </Button>
            ) : (
              <span className="text-caption font-semibold text-text-muted bg-surface-2 border border-border px-3 py-1.5 rounded-pill inline-flex items-center gap-1.5">
                <span>🔒</span>
                {isAr ? 'متاح للمشترين فقط' : 'Verified buyers only'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 2. Interactive Review Form (when open) */}
      {isWritingReview && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-200">
          <ReviewForm
            productId={productId}
            initialRating={eligibility?.existing_review?.rating ?? 5}
            initialComment={eligibility?.existing_review?.comment ?? ''}
            onSuccess={() => setIsWritingReview(false)}
            onCancel={() => setIsWritingReview(false)}
          />
        </div>
      )}

      {/* 3. Summary Cards Breakdown */}
      {isSummaryLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32 rounded-card" />
          <Skeleton className="h-32 rounded-card md:col-span-2" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Big Score Block */}
          <Card className="p-6 flex flex-col items-center justify-center text-center bg-surface-tint border border-border shadow-card">
            <span className="text-display font-bold font-accent text-brand leading-none">
              {avgRating > 0 ? avgRating.toFixed(1) : '5.0'}
            </span>
            <div className="py-2">
              <StarRating value={Math.round(avgRating) || 5} readOnly size="md" />
            </div>
            <span className="text-small font-semibold text-text">
              {reviewCount > 0
                ? isAr
                  ? `بناءً على ${reviewCount} تقييم`
                  : `Based on ${reviewCount} reviews`
                : isAr
                  ? 'لا توجد تقييمات بعد'
                  : 'No reviews yet'}
            </span>
          </Card>

          {/* Distribution Bars */}
          <Card className="p-5 md:col-span-2 flex flex-col justify-center space-y-2.5 bg-surface border border-border shadow-card">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = distribution[String(stars) as keyof typeof distribution] || 0
              const percentage = reviewCount > 0 ? Math.round((count / reviewCount) * 100) : 0

              return (
                <div key={stars} className="flex items-center gap-3 text-small">
                  <div className="flex items-center gap-1 w-14 shrink-0 font-semibold text-text">
                    <span>{stars}</span>
                    <span className="text-gold">★</span>
                  </div>

                  <div className="flex-1 h-3 rounded-pill bg-surface-2 overflow-hidden border border-border/50">
                    <div
                      className="h-full bg-gold rounded-pill transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <span className="w-12 text-end text-caption text-text-muted font-mono">
                    {percentage}%
                  </span>
                </div>
              )
            })}
          </Card>
        </div>
      )}

      {/* 4. Verified Purchase Notice for non-buyers */}
      {eligibility?.is_authenticated && !eligibility.has_purchased && !eligibility.is_banned ? (
        <div className="rounded-card border border-brand/20 bg-brand/5 p-4 flex items-center gap-3 text-small text-brand">
          <Sparkle className="size-5 shrink-0" />
          <p className="leading-relaxed">
            {isAr
              ? 'تنويه: لضمان النزاهة والمصداقية الكاملة، يمكن فقط للعملاء الذين اشتروا هذا المنتج واستلموه كتابة تقييم وتجربة الشراء.'
              : 'Notice: To guarantee absolute authenticity, reviews are reserved exclusively for customers who have purchased this product.'}
          </p>
        </div>
      ) : null}

      {/* 5. Reviews List */}
      <div className="space-y-4 pt-2">
        <h3 className="text-h3 font-bold text-text">
          {isAr ? `آراء العملاء (${reviewCount})` : `Customer Reviews (${reviewCount})`}
        </h3>

        {isReviewsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 rounded-card" />
            <Skeleton className="h-24 rounded-card" />
          </div>
        ) : !reviews || reviews.length === 0 ? (
          <div className="rounded-card border border-border bg-surface p-8 text-center space-y-3">
            <div className="flex justify-center text-brand">
              <RibbonBow className="size-10" />
            </div>
            <p className="text-body font-semibold text-text">
              {isAr ? 'لا توجد تقييمات لهذا المنتج بعد' : 'No reviews for this product yet'}
            </p>
            <p className="text-small text-text-muted max-w-md mx-auto">
              {isAr
                ? 'إذا قمت بشراء هذا المنتج، كن أول من يشارك تجربته مع مجتمع لوليز!'
                : 'If you have purchased this item, be the first to share your experience!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {reviews.map((rev) => (
              <Card
                key={rev.id}
                className={`p-5 space-y-3 border transition-all ${
                  rev.is_own
                    ? 'border-brand/40 bg-brand/5 ring-1 ring-brand/20 shadow-card'
                    : 'border-border bg-surface hover:shadow-card'
                }`}
              >
                <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-pill bg-brand/10 border border-brand/20 flex items-center justify-center font-bold text-brand text-caption">
                      {rev.reviewer_name.slice(0, 1)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-small text-text">
                          {rev.reviewer_name}
                        </span>
                        {rev.is_own ? (
                          <span className="text-caption font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-pill">
                            {isAr ? 'تقييمك' : 'Your Review'}
                          </span>
                        ) : null}
                      </div>
                      <span className="text-caption text-text-muted">
                        {new Date(rev.created_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <StarRating value={rev.rating} readOnly size="sm" />
                    {rev.is_verified_purchase ? (
                      <span className="text-caption text-success font-medium inline-flex items-center gap-1">
                        <span>✓</span>
                        {isAr ? 'شراء مؤكد' : 'Verified Purchase'}
                      </span>
                    ) : null}
                  </div>
                </div>

                <p className="text-body text-text leading-relaxed whitespace-pre-line">
                  {rev.comment}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

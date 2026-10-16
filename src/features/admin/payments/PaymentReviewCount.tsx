import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/i18n/LanguageProvider'
import { ErrorMessage } from '@/lib/errors'
import { getPaymentReviewCount } from './api'

export function PaymentReviewCount() {
  const { lang } = useLanguage()
  const { data, error } = useQuery({
    queryKey: ['admin-payment-review-count'],
    queryFn: getPaymentReviewCount,
    staleTime: 15_000,
    refetchInterval: 30_000,
    retry: 1,
  })
  if (error) return <ErrorMessage error={error} />
  if (!data) return null
  return (
    <span
      className="ms-auto rounded-pill bg-brand px-2 text-brand-contrast"
      aria-label={
        lang === 'ar' ? `${data} دفعات بانتظار المراجعة` : `${data} payments awaiting review`
      }
    >
      {data}
    </span>
  )
}

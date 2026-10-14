import { useParams, Link } from 'react-router-dom'
import { useLanguage } from '@/i18n/LanguageProvider'
import { Card } from '@/components/ui/Card'
import { RibbonBow } from '@/components/ui/ornaments'
import { Ltr } from '@/components/ui/Ltr'
import { useSeo } from '@/features/seo'

export default function OrderConfirmationPage() {
  const { id, orderId: orderIdParam } = useParams<{ id?: string; orderId?: string }>()
  const orderId = id || orderIdParam || ''
  const { t } = useLanguage()

  useSeo({
    title: `تأكيد الطلب #${orderId}`,
    description: 'تم استلام طلبك بنجاح في متجر لوليز',
  })

  return (
    <div className="mx-auto max-w-2xl py-6 sm:py-12">
      <Card className="flex flex-col items-center justify-center p-8 sm:p-12 text-center space-y-6 shadow-card">
        <div className="flex size-16 items-center justify-center rounded-pill bg-surface-tint text-brand">
          <RibbonBow className="size-10" />
        </div>

        <div className="space-y-2">
          <h1 className="text-h1 font-bold font-accent text-brand">تم استلام طلبك بنجاح!</h1>
          <p className="text-body text-text-muted">
            شكرًا لطلبك من متجر لوليز. سنقوم بمراجعة الطلب وتجهيزه بعناية.
          </p>
        </div>

        {orderId && (
          <div className="rounded-card border border-border bg-surface-2 p-4 w-full max-w-md">
            <span className="text-small text-text-muted block mb-1">رقم الطلب</span>
            <span className="text-h2 font-bold font-mono text-brand">
              <Ltr>#{orderId}</Ltr>
            </span>
          </div>
        )}

        <div className="rounded-chip border border-border bg-surface-tint p-4 text-small text-text-muted max-w-md">
          سنتواصل معك هاتفيًا أو عبر الواتساب لتأكيد موعد التوصيل والدفع عند الاستلام.
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto pt-4">
          <Link
            to="/account/orders"
            className="inline-flex h-12 items-center justify-center rounded-pill bg-brand px-8 text-body font-semibold text-brand-contrast transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-focus shadow-pill"
          >
            عرض تفاصيل طلباتي
          </Link>
          <Link
            to="/category/all"
            className="inline-flex h-12 items-center justify-center rounded-pill border border-border bg-surface-2 px-8 text-body font-semibold text-text hover:border-brand focus:outline-none focus:ring-2 focus:ring-focus"
          >
            {t.nav.browse}
          </Link>
        </div>
      </Card>
    </div>
  )
}

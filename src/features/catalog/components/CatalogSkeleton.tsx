import { Skeleton } from '@/components/ui/Skeleton'
import { useLanguage } from '@/i18n/LanguageProvider'

export function CatalogSkeleton({ count = 8, categories = false }) {
  const { t } = useLanguage()
  return (
    <div role="status" aria-label={t.ui.loading}>
      <span className="sr-only">{t.ui.loading}</span>
      <div
        className={`grid grid-cols-2 gap-4 sm:gap-6 ${categories ? 'md:grid-cols-4' : 'sm:grid-cols-3 lg:grid-cols-4'}`}
      >
        {Array.from({ length: count }, (_, index) => (
          <div
            key={index}
            aria-hidden="true"
            className="space-y-3 rounded-card border border-border bg-surface p-3"
          >
            <Skeleton className="aspect-square h-auto! w-full rounded-image" />
            <Skeleton className="h-5 w-3/4" />
            {!categories && (
              <>
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="mt-4 h-11 w-full rounded-pill" />
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

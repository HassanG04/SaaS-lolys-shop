import { Link } from 'react-router-dom'
import { RibbonBow } from '../components/ui/ornaments'
import { useLanguage } from '../i18n/LanguageProvider'
import { useSeo } from '../features/seo'

export default function NotFoundPage() {
  const { lang } = useLanguage()
  const isEn = lang === 'en'

  useSeo({
    title: isEn ? 'Page Not Found' : 'الصفحة غير موجودة',
    description: isEn
      ? 'The requested page could not be found'
      : 'عذرًا، الصفحة التي تبحث عنها غير موجودة أو تم نقلها',
    noindex: true,
  })

  return (
    <div className="mx-auto max-w-lg text-center space-y-6 py-12">
      <div className="rounded-card border border-border bg-surface p-8 sm:p-12 space-y-6 shadow-card">
        <div className="flex justify-center text-brand">
          <RibbonBow className="size-16" />
        </div>
        <h1 className="text-display font-bold font-accent text-brand">404</h1>
        <h2 className="text-h2 font-semibold text-text">
          {isEn ? 'Page Not Found' : 'الصفحة غير موجودة'}
        </h2>
        <p className="text-body text-text-muted">
          {isEn
            ? 'Sorry, the page you are looking for does not exist or has been moved.'
            : 'عذرًا، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.'}
        </p>
        <div className="pt-2">
          <Link
            to="/"
            className="inline-flex h-11 items-center justify-center rounded-pill bg-brand px-6 text-small font-semibold text-brand-contrast transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-focus"
          >
            {isEn ? 'Return to Home' : 'العودة إلى الصفحة الرئيسية'}
          </Link>
        </div>
      </div>
    </div>
  )
}

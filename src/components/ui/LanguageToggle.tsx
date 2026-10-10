import { useLanguage } from '../../i18n/LanguageProvider'

export function LanguageToggle() {
  const { lang, setLang } = useLanguage()

  return (
    <button
      type="button"
      onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
      className="inline-flex h-11 items-center justify-center rounded-pill border border-border-input bg-surface px-4 text-sm font-semibold hover:-translate-y-[2px] hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 motion-reduce:transition-none"
    >
      {lang === 'ar' ? 'English' : 'العربية'}
    </button>
  )
}

import { useLanguage } from '../../i18n/LanguageProvider'

export function LanguageToggle() {
  const { lang, setLang, t } = useLanguage()
  const isAr = lang === 'ar'

  return (
    <button
      type="button"
      data-variant="secondary"
      className="ui-control ui-button h-11 items-center rounded-pill font-bold px-3 text-small border border-border bg-surface-2 hover:border-brand focus:ring-2"
      onClick={() => setLang(isAr ? 'en' : 'ar')}
      lang={isAr ? 'en' : 'ar'}
      dir={isAr ? 'ltr' : 'rtl'}
      aria-label={t.ui.switchLanguage}
    >
      {isAr ? 'EN' : 'AR'}
    </button>
  )
}

export default LanguageToggle

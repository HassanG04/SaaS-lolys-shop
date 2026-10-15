import { useLanguage } from '../../i18n/LanguageProvider'

export function LanguageToggle() {
  const { lang, setLang, t } = useLanguage()
  const isAr = lang === 'ar'

  return (
    <button
      type="button"
      data-variant="secondary"
      className="ui-control ui-button inline-flex items-center justify-center rounded-pill font-semibold px-3 py-2 sm:px-6"
      onClick={() => setLang(isAr ? 'en' : 'ar')}
      lang={isAr ? 'en' : 'ar'}
      dir={isAr ? 'ltr' : 'rtl'}
    >
      {t.ui.switchLanguage}
    </button>
  )
}

import { useLanguage } from '../../i18n/LanguageProvider'
import { Button } from './Button'

export function LanguageToggle() {
  const { lang, setLang, t } = useLanguage()

  return (
    <Button
      variant="secondary"
      onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
      lang={lang === 'ar' ? 'en' : 'ar'}
      dir={lang === 'ar' ? 'ltr' : 'rtl'}
    >
      {t.ui.switchLanguage}
    </Button>
  )
}

import { useLanguage } from '../i18n/LanguageProvider'
import { kit as arKit } from '../i18n/ar.json'
import { kit as enKit } from '../i18n/en.json'

export function useKitCopy() {
  const { lang, t } = useLanguage()
  return { ...t, kit: lang === 'ar' ? arKit : enKit }
}

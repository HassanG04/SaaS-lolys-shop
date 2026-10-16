import i18next, { type i18n as I18nInstance } from 'i18next'
import { translations } from './translations'

export const defaultLanguage = 'ar'
export const supportedLanguages = ['ar', 'en'] as const
export type SupportedLanguage = (typeof supportedLanguages)[number]

export const i18n: I18nInstance = i18next.createInstance()

// React consumers subscribe through LanguageProvider; a second provider and
// plugin are unnecessary and add an unused integration to the initial download.
void i18n.init({
  lng: defaultLanguage,
  fallbackLng: defaultLanguage,
  supportedLngs: [...supportedLanguages],
  resources: {
    ar: { translation: translations.ar },
    en: { translation: translations.en },
  },
  interpolation: {
    escapeValue: false, // React already escapes
  },
  returnNull: false,
})

export default i18n

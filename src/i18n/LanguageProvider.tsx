import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { I18nextProvider } from 'react-i18next'
import { i18n, type SupportedLanguage } from './i18n'
import { translations } from './translations'

export type Language = SupportedLanguage
export type TranslationDictionary = (typeof translations)['ar']

export type TFunctionWithDict = {
  (key: string, options?: Record<string, unknown>): string
} & TranslationDictionary

export interface LanguageContextValue {
  lang: Language
  setLang: (lang: Language) => void
  t: TFunctionWithDict
  i18n: typeof i18n
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({
  children,
  initialLanguage,
}: {
  children: ReactNode
  initialLanguage?: Language
}) {
  const [lang, setLang] = useState<Language>(() => {
    if (initialLanguage) {
      if (i18n.language !== initialLanguage) {
        void i18n.changeLanguage(initialLanguage)
      }
      return initialLanguage
    }
    let initialLang: Language = 'ar'
    try {
      const saved = localStorage.getItem('app-lang')
      if (saved === 'ar' || saved === 'en') {
        initialLang = saved
      } else if (typeof navigator !== 'undefined' && !/^ar(?:-|$)/i.test(navigator.language)) {
        initialLang = 'en'
      }
    } catch {
      if (typeof navigator !== 'undefined' && !/^ar(?:-|$)/i.test(navigator.language)) {
        initialLang = 'en'
      }
    }

    if (i18n.language !== initialLang) {
      void i18n.changeLanguage(initialLang)
    }
    return initialLang
  })

  useEffect(() => {
    try {
      localStorage.setItem('app-lang', lang)
    } catch {
      // Keep the in-memory choice usable when persistence is unavailable.
    }
  }, [lang])

  useLayoutEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    if (i18n.language !== lang) {
      void i18n.changeLanguage(lang)
    }
  }, [lang])

  const tValue = useMemo(() => {
    const dict = translations[lang]
    const fn = (key: string, options?: Record<string, unknown>) => i18n.t(key, options)
    return Object.assign(fn, dict) as TFunctionWithDict
  }, [lang])

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: tValue, i18n }}>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

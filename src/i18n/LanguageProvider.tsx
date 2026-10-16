import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
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
      if (i18n.language !== initialLanguage) void i18n.changeLanguage(initialLanguage)
      return initialLanguage
    }
    let l: Language = 'ar'
    try {
      const s = localStorage.getItem('app-lang')
      if (s === 'ar' || s === 'en') l = s
      else if (typeof navigator !== 'undefined' && !/^ar(?:-|$)/i.test(navigator.language)) l = 'en'
    } catch {
      if (typeof navigator !== 'undefined' && !/^ar(?:-|$)/i.test(navigator.language)) l = 'en'
    }
    if (i18n.language !== l) void i18n.changeLanguage(l)
    return l
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
      {children}
    </LanguageContext.Provider>
  )
}

export function useOptionalLanguage() {
  return useContext(LanguageContext)
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

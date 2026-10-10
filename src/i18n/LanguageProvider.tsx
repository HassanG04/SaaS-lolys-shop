import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from 'react'
import { translations } from './translations'

type Language = 'ar' | 'en'

interface LanguageContextValue {
  lang: Language
  setLang: (lang: Language) => void
  t: (typeof translations)['ar']
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('app-lang')
      if (saved === 'ar' || saved === 'en') return saved
    } catch {
      // Storage may be disabled; device selection still works.
    }

    if (typeof navigator !== 'undefined' && !/^ar(?:-|$)/i.test(navigator.language)) {
      return 'en'
    }
    return 'ar'
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
  }, [lang])

  const t = translations[lang]

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

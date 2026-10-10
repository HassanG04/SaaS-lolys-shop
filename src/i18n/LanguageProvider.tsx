import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import ar from './ar.json'
import en from './en.json'

type Language = 'ar' | 'en'

interface LanguageContextValue {
  lang: Language
  setLang: (lang: Language) => void
  t: typeof ar
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('app-lang') as Language | null
      if (saved === 'ar' || saved === 'en') return saved
    } catch {
      // ignore
    }

    // Check device language
    if (typeof navigator !== 'undefined' && !navigator.language.startsWith('ar')) {
      return 'en'
    }
    return 'ar' // Default to Arabic if Arabic or undefined
  })

  useEffect(() => {
    try {
      localStorage.setItem('app-lang', lang)
    } catch {
      // ignore
    }
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }, [lang])

  const t = lang === 'ar' ? ar : en

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

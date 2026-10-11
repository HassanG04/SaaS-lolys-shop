import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from 'react'

type Theme = 'dark' | 'light' | 'system'

type ThemeState = {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
}

const mediaQuery = '(prefers-color-scheme: dark)'
const ThemeContext = createContext<ThemeState | undefined>(undefined)
const parseTheme = (value: unknown): Theme =>
  value === 'light' || value === 'dark' ? value : 'system'

function readTheme(): Theme {
  try {
    return parseTheme(localStorage.getItem('theme'))
  } catch {
    return 'system'
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, updateTheme] = useState(readTheme)
  const [systemDark, setSystemDark] = useState(() => window.matchMedia(mediaQuery).matches)
  const resolvedTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme

  useEffect(() => {
    const media = window.matchMedia(mediaQuery)
    const onSystemChange = (event: MediaQueryListEvent) => setSystemDark(event.matches)
    const onStorageChange = (event: StorageEvent) => {
      if (event.key === 'theme' || event.key === null) updateTheme(readTheme())
    }
    media.addEventListener('change', onSystemChange)
    window.addEventListener('storage', onStorageChange)
    return () => {
      media.removeEventListener('change', onSystemChange)
      window.removeEventListener('storage', onStorageChange)
    }
  }, [])

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme
  }, [resolvedTheme])

  const value: ThemeState = {
    theme,
    resolvedTheme,
    setTheme: (nextTheme) => {
      try {
        if (nextTheme === 'system') localStorage.removeItem('theme')
        else localStorage.setItem('theme', nextTheme)
      } catch {
        // A blocked or full storage area must not prevent changing the theme.
      }
      updateTheme(nextTheme)
    },
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) throw new Error('useTheme must be used within a ThemeProvider')
  return context
}

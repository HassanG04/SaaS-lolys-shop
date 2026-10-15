import { useTheme } from './ThemeProvider'
import { useLanguage } from '../../i18n/LanguageProvider'

export function ThemeToggle() {
  const { t } = useLanguage()
  const theme = t.theme
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-pressed={isDark}
      aria-label={theme.dark}
      title={isDark ? theme.switchToLight : theme.switchToDark}
      className="theme-toggle inline-flex items-center justify-center rounded-pill border border-border-input bg-surface p-2 text-brand hover:border-brand transition-colors"
    >
      <span key={resolvedTheme} className="theme-icon inline-flex" aria-hidden="true">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
        >
          <path
            d={
              isDark
                ? 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41'
                : 'M20.5 13.1A8.5 8.5 0 0 1 10.9 3.5a8.5 8.5 0 1 0 9.6 9.6Z'
            }
          />
        </svg>
      </span>
    </button>
  )
}

export default ThemeToggle

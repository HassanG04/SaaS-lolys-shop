import { useTheme } from './ThemeProvider'
import ar from '../../i18n/ar.json'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-pressed={isDark}
      className="theme-toggle rounded-pill border border-border-input bg-surface px-4 py-2 text-body text-brand"
    >
      {ar.theme.dark}
    </button>
  )
}

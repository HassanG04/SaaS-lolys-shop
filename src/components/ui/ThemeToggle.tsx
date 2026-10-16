import { useTheme } from './ThemeProvider'
import { useLanguage } from '../../i18n/LanguageProvider'
const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v)).toFixed(1) + 'px'
const reset = (e: React.SyntheticEvent<HTMLElement>) => {
  const s = e.currentTarget.style
  s.removeProperty('--magnetic-x')
  s.removeProperty('--magnetic-y')
}

export function ThemeToggle() {
  const { t } = useLanguage()
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse' || matchMedia('(prefers-reduced-motion: reduce)').matches)
          return
        const r = e.currentTarget.getBoundingClientRect()
        if (!r.width) return
        const s = e.currentTarget.style
        s.setProperty('--magnetic-x', clamp(((e.clientX - r.left) / r.width - 0.5) * 10, 5))
        s.setProperty('--magnetic-y', clamp(((e.clientY - r.top) / r.height - 0.5) * 6, 3))
      }}
      onPointerLeave={reset}
      onPointerCancel={reset}
      aria-pressed={isDark}
      aria-label={t.theme.dark}
      title={isDark ? t.theme.switchToLight : t.theme.switchToDark}
      className="theme-toggle magnetic-control ui-control inline-flex items-center justify-center rounded-pill border border-border-input bg-surface p-2 text-brand hover:border-brand transition-colors"
    >
      <span
        key={resolvedTheme}
        className="theme-icon theme-icon-spin inline-flex"
        aria-hidden="true"
      >
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
                ? 'M12 3v2m0 14v2M3 12h2m14 0h2m-3.5-6.5-1.4 1.4M6.9 17.1l-1.4 1.4m0-11.4 1.4 1.4m10.2 10.2 1.4 1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8'
                : 'M20.5 13.1A8.5 8.5 0 0 1 10.9 3.5a8.5 8.5 0 1 0 9.6 9.6Z'
            }
          />
        </svg>
      </span>
    </button>
  )
}

export default ThemeToggle

import { useLanguage } from '@/i18n/LanguageProvider'
import { useMotionSetting, type MotionSetting } from '@/lib/motion'

interface MotionSelectProps {
  id?: string
  className?: string
  variant?: 'inline' | 'compact' | 'footer'
}

const copy = {
  ar: {
    label: 'تفضيل الحركة',
    full: 'حركة كاملة',
    reduced: 'حركة مخففة',
    system: 'حسب الجهاز',
    fullDesc: 'تفعيل جميع الحركات والتحريك',
    reducedDesc: 'تقليل الحركة مع الحفاظ على المحتوى',
    systemDesc: 'اتباع إعدادات نظام التشغيل',
  },
  en: {
    label: 'Motion preference',
    full: 'Full animations',
    reduced: 'Reduced animations',
    system: 'Follow device',
    fullDesc: 'Enable all decorative motion and transitions',
    reducedDesc: 'Reduce motion while preserving content',
    systemDesc: 'Follow operating system settings',
  },
} as const

export function MotionSelect({
  id = 'motion-preference',
  className = '',
  variant = 'compact',
}: MotionSelectProps) {
  const { lang } = useLanguage()
  const isAr = lang === 'ar'
  const c = isAr ? copy.ar : copy.en
  const { setting, setSetting } = useMotionSetting()

  if (variant === 'footer') {
    return (
      <div className={`inline-flex items-center gap-2 text-small ${className}`}>
        <label htmlFor={id} className="text-brand-contrast/90 font-medium">
          {c.label}:
        </label>
        <select
          id={id}
          value={setting}
          onChange={(e) => setSetting(e.target.value as MotionSetting)}
          className="rounded-chip border border-brand-contrast/30 bg-brand text-brand-contrast px-2 py-1 text-small focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus cursor-pointer"
          aria-label={c.label}
        >
          <option value="full" className="text-text bg-surface">
            {c.full}
          </option>
          <option value="reduced" className="text-text bg-surface">
            {c.reduced}
          </option>
          <option value="system" className="text-text bg-surface">
            {c.system}
          </option>
        </select>
      </div>
    )
  }

  return (
    <div
      className={`flex flex-col gap-1.5 p-2 rounded-card bg-surface-2/60 border border-border/50 ${className}`}
    >
      <span className="text-caption font-semibold text-text-muted">{c.label}</span>
      <div className="grid grid-cols-3 gap-1" role="radiogroup" aria-label={c.label}>
        {(['full', 'reduced', 'system'] as const).map((mode) => {
          const isActive = setting === mode
          return (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setSetting(mode)}
              className={`min-h-[36px] px-2 py-1 rounded-chip text-caption font-medium transition-colors cursor-pointer text-center ${
                isActive
                  ? 'bg-brand text-brand-contrast font-semibold'
                  : 'text-text hover:bg-surface text-text-muted hover:text-text'
              }`}
            >
              {c[mode]}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default MotionSelect

import { useState, useContext } from 'react'
import { Button } from '@/components/ui/Button'
import { ToastContext } from '@/components/ui/ToastProvider'
import { StepUpDialog } from '@/features/auth/StepUpDialog'
import { useStepUp } from '@/features/auth/useStepUp'
import { useLanguage } from '@/i18n/LanguageProvider'

export interface ExportCsvButtonProps {
  onExport: () => Promise<void> | void
  label?: string
  successMessage?: string
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  disabled?: boolean
  className?: string
  title?: string
}

export function ExportCsvButton({
  onExport,
  label,
  successMessage,
  variant = 'secondary',
  disabled = false,
  className = '',
  title,
}: ExportCsvButtonProps) {
  const { t, lang } = useLanguage()
  const isAr = lang === 'ar'
  const toastContext = useContext(ToastContext)
  const { withStepUp, dialogOpen, closeStepUp } = useStepUp()
  const [exporting, setExporting] = useState(false)

  const defaultSuccessMessage = isAr ? 'تم تصدير ملف CSV بنجاح' : 'CSV exported successfully'

  const handleClick = () => {
    void withStepUp(async () => {
      setExporting(true)
      try {
        await onExport()
        toastContext?.success(successMessage ?? defaultSuccessMessage)
      } finally {
        setExporting(false)
      }
    })
  }

  return (
    <>
      <Button
        variant={variant}
        onClick={handleClick}
        disabled={disabled || exporting}
        title={title}
        className={`flex items-center gap-2 ${className}`}
      >
        <svg
          className="size-4 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" x2="12" y1="15" y2="3" />
        </svg>
        <span>{label ?? t.admin.exportCsv}</span>
      </Button>

      <StepUpDialog open={dialogOpen} onClose={closeStepUp} />
    </>
  )
}

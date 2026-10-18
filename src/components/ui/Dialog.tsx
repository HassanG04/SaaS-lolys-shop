import { useEffect, useId, useRef, type ReactNode } from 'react'
import { IconButton } from './IconButton'

export type DialogProps = {
  open: boolean
  title: string
  description?: string
  children: ReactNode
  onClose: () => void
}

import { useLanguage } from '../../i18n/LanguageProvider'

export function Dialog({ open, title, description, children, onClose }: DialogProps) {
  const { t } = useLanguage()
  const ui = t.ui
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const id = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!open || !dialog) return
    const opener = document.activeElement
    // Native modality supplies focus containment and makes the background inert.
    dialog.showModal()
    closeRef.current?.focus()
    return () => {
      if (dialog.open) dialog.close()
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={`${id}-title`}
      aria-describedby={description ? `${id}-description` : undefined}
      className="ui-dialog dialog-arrive m-auto rounded-card border border-border bg-surface p-5 text-text"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClose={(event) => {
        // Ignore queued close events from cleanup after a newer opening.
        if (open && !event.currentTarget.open) onClose()
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id={`${id}-title`} className="text-h2">
          {title}
        </h2>
        <IconButton ref={closeRef} aria-label={ui.closeDialog} variant="ghost" onClick={onClose}>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            focusable="false"
          >
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </IconButton>
      </div>
      {description ? (
        <p id={`${id}-description`} className="py-3 text-text-muted">
          {description}
        </p>
      ) : null}
      <div className="space-y-4 py-3">{children}</div>
    </dialog>
  )
}

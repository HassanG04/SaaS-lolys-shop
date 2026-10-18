import { useState, useRef, type ChangeEvent } from 'react'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useUploadAvatar, useRemoveAvatar } from '../hooks'
import { accountAvatarCopy } from '../copy'
import { publicImageUrl } from '@/lib/images'
import { useToast } from '@/components/ui/ToastProvider'
import { PearlLoader } from '@/components/ui/PearlLoader'

interface ProfileAvatarProps {
  userId: string
  avatarUrl?: string | null
  fullName?: string | null
  email?: string | null
  onAvatarChange?: () => void | Promise<void>
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return parts[0].slice(0, 2).toUpperCase()
  }
  if (email?.trim()) {
    return email.trim().slice(0, 2).toUpperCase()
  }
  return 'LA'
}

export function ProfileAvatar({
  userId,
  avatarUrl,
  fullName,
  email,
  onAvatarChange,
}: ProfileAvatarProps) {
  const { lang } = useLanguage()
  const copy = accountAvatarCopy[lang]
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadMutation = useUploadAvatar()
  const removeMutation = useRemoveAvatar()

  const [isProcessing, setIsProcessing] = useState(false)
  const isPending = isProcessing || uploadMutation.isPending || removeMutation.isPending

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset input so re-selecting same file fires change
    e.target.value = ''

    setIsProcessing(true)
    try {
      await uploadMutation.mutateAsync({
        userId,
        file,
        oldAvatarPath: avatarUrl,
      })
      toast.success(copy.avatarUpdated)
      await onAvatarChange?.()
    } catch {
      toast.error(copy.avatarUploadFailed)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRemove = async () => {
    if (!avatarUrl) return

    setIsProcessing(true)
    try {
      await removeMutation.mutateAsync({
        userId,
        currentAvatarPath: avatarUrl,
      })
      toast.success(copy.avatarRemoved)
      await onAvatarChange?.()
    } catch {
      toast.error(copy.avatarRemoveFailed)
    } finally {
      setIsProcessing(false)
    }
  }

  const resolvedAvatarUrl = avatarUrl ? publicImageUrl(avatarUrl, 'avatars') : null

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      {/* Avatar Display Frame */}
      <div className="relative group shrink-0">
        <div className="size-20 sm:size-24 rounded-pill border-2 border-brand/20 bg-surface-2 flex items-center justify-center overflow-hidden text-brand font-bold text-h2 shadow-card select-none">
          {resolvedAvatarUrl ? (
            <img
              src={resolvedAvatarUrl}
              alt={fullName || copy.avatar}
              className="size-full object-cover"
            />
          ) : (
            <span className="font-accent tracking-wider">{getInitials(fullName, email)}</span>
          )}

          {/* Loading Overlay */}
          {isPending && (
            <div className="absolute inset-0 bg-text/40 backdrop-blur-xs flex items-center justify-center text-brand-contrast">
              <PearlLoader loading />
            </div>
          )}
        </div>

        {/* Change Photo Floating Badge */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isPending}
          className="absolute bottom-0 end-0 size-8 rounded-pill bg-brand text-brand-contrast flex items-center justify-center border-2 border-surface shadow-popover hover:bg-brand/90 focus:outline-none focus:ring-2 focus:ring-focus transition-all active:scale-95 disabled:opacity-60"
          aria-label={avatarUrl ? copy.changePhoto : copy.uploadPhoto}
          title={avatarUrl ? copy.changePhoto : copy.uploadPhoto}
        >
          <svg
            className="size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </button>
      </div>

      {/* Action Controls & Hint */}
      <div className="flex flex-col items-center sm:items-start gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isPending}
            className="inline-flex h-9 items-center rounded-pill border border-border bg-surface-2 px-3 text-caption font-semibold text-text hover:border-brand hover:text-brand focus:outline-none focus:ring-2 focus:ring-focus transition-colors disabled:opacity-50"
          >
            {isPending ? copy.uploading : avatarUrl ? copy.changePhoto : copy.uploadPhoto}
          </button>

          {avatarUrl && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={isPending}
              className="inline-flex h-9 items-center rounded-pill border border-danger/30 bg-surface-2 px-3 text-caption font-semibold text-danger hover:bg-danger/10 focus:outline-none focus:ring-2 focus:ring-focus transition-colors disabled:opacity-50"
            >
              {isPending ? copy.removing : copy.removePhoto}
            </button>
          )}
        </div>

        <p className="text-caption text-text-muted text-center sm:text-start">{copy.sizeHint}</p>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        onChange={handleFileChange}
        aria-hidden="true"
      />
    </div>
  )
}

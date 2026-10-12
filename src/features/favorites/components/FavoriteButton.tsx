import { useState, useContext, type MouseEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useOptionalAuth } from '@/features/auth/AuthProvider'
import { useLanguage } from '@/i18n/LanguageProvider'
import { ToastContext } from '@/components/ui/ToastProvider'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { BowHeartIcon } from './BowHeartIcon'
import { useFavoriteIds, useToggleFavorite } from '../hooks'
import type { Product } from '@/features/catalog/types'

export interface FavoriteButtonProps {
  product: Product
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export function FavoriteButton({
  product,
  className = '',
  size = 'md',
  showLabel = false,
}: FavoriteButtonProps) {
  const auth = useOptionalAuth()
  const user = auth?.user ?? null
  const { t } = useLanguage()
  const toast = useContext(ToastContext)
  const location = useLocation()
  const [loginDialogOpen, setLoginDialogOpen] = useState(false)

  const { data: favoriteIds = [] } = useFavoriteIds(user?.id)
  const toggleMutation = useToggleFavorite(user?.id)

  const isFavorite = favoriteIds.includes(product.id)

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (!user) {
      setLoginDialogOpen(true)
      return
    }

    toggleMutation.mutate(
      {
        productId: product.id,
        product,
        willFavorite: !isFavorite,
      },
      {
        onError: () => {
          toast?.error(t.favorites?.errorToggle || 'تعذر تحديث المفضلة')
        },
      },
    )
  }

  const iconSizes = {
    sm: 'size-4',
    md: 'size-5',
    lg: 'size-6',
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={isFavorite}
        aria-label={
          isFavorite
            ? `${t.favorites?.remove || 'إزالة من المفضلة'} - ${product.name_ar || product.name}`
            : `${t.favorites?.add || 'إضافة إلى المفضلة'} - ${product.name_ar || product.name}`
        }
        data-testid={`favorite-button-${product.id}`}
        data-favorited={isFavorite ? 'true' : 'false'}
        className={`group inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-pill transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
          isFavorite
            ? 'bg-surface-tint text-accent-text hover:bg-pink/20 shadow-pill'
            : 'bg-surface/90 text-text-muted hover:text-accent-text hover:bg-surface shadow-pill'
        } ${showLabel ? 'px-4 gap-2 border border-border' : 'p-2.5'} ${className}`}
      >
        <BowHeartIcon
          filled={isFavorite}
          className={`${iconSizes[size]} transition-transform duration-200 group-hover:scale-110 ${
            isFavorite ? 'text-accent-text' : 'text-current'
          }`}
        />
        {showLabel && (
          <span className="text-small font-semibold">
            {isFavorite ? t.favorites?.remove || 'في المفضلة' : t.favorites?.add || 'إضافة للمفضلة'}
          </span>
        )}
      </button>

      {/* Guest Login Prompt Dialog */}
      <Dialog
        open={loginDialogOpen}
        title={t.favorites?.loginTitle || 'تسجيل الدخول للمتابعة'}
        description={
          t.favorites?.loginPrompt ||
          'يرجى تسجيل الدخول لحفظ هذا المنتج في قائمة المفضلة الخاصة بك.'
        }
        onClose={() => setLoginDialogOpen(false)}
      >
        <div className="space-y-4 pt-2">
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <Button variant="ghost" onClick={() => setLoginDialogOpen(false)}>
              {t.favorites?.loginCancel || 'إلغاء'}
            </Button>
            <Link
              to="/login"
              state={{ from: location.pathname }}
              onClick={() => setLoginDialogOpen(false)}
              className="inline-flex h-11 items-center justify-center rounded-pill bg-brand px-6 text-small font-semibold text-brand-contrast transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              {t.favorites?.loginCta || 'تسجيل الدخول'}
            </Link>
          </div>
        </div>
      </Dialog>
    </>
  )
}

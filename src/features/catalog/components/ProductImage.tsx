import { useState, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import { publicImageUrl } from '@/lib/images'

export interface ProductImageProps extends Omit<ComponentPropsWithoutRef<'img'>, 'src'> {
  src?: string | null
  alt: string
  aspectRatio?: 'square' | '4/3' | '16/9'
  fallback?: ReactNode
  imageClassName?: string
}

export function ProductImage({
  src,
  alt,
  aspectRatio = 'square',
  fallback,
  className = '',
  imageClassName = '',
  loading = 'lazy',
  ...props
}: ProductImageProps) {
  const [prevSrc, setPrevSrc] = useState(src)
  const [hasError, setHasError] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  if (prevSrc !== src) {
    setPrevSrc(src)
    setIsLoaded(false)
    setHasError(false)
  }

  const resolvedUrl = publicImageUrl(src)
  const isAvailable = Boolean(resolvedUrl) && !hasError

  const ratioClass =
    aspectRatio === 'square'
      ? 'aspect-square'
      : aspectRatio === '4/3'
        ? 'aspect-4/3'
        : 'aspect-video'

  return (
    <div
      className={`relative w-full overflow-hidden rounded-image bg-surface-tint ${ratioClass} ${className}`}
    >
      {isAvailable ? (
        <>
          {/* Skeleton placeholder while loading to prevent layout shift */}
          {!isLoaded && (
            <div aria-hidden="true" className="absolute inset-0 ui-skeleton bg-surface-2" />
          )}
          <img
            {...props}
            src={resolvedUrl as string}
            alt={alt}
            loading={loading}
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            className={`size-full object-cover rounded-image transition-opacity duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            } ${imageClassName}`}
          />
        </>
      ) : (
        <div
          role="img"
          aria-label={alt}
          className="flex size-full items-center justify-center rounded-image bg-surface-tint text-text-muted p-4"
        >
          {fallback ? (
            fallback
          ) : (
            <svg
              aria-hidden="true"
              className="size-12 opacity-60 text-text-muted"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Elegant accessory / gift ornament placeholder */}
              <circle cx="12" cy="12" r="7" />
              <path d="M12 5V2" />
              <path d="M12 22v-3" />
              <path d="M5 12H2" />
              <path d="M22 12h-3" />
              <circle cx="12" cy="12" r="2" />
            </svg>
          )}
        </div>
      )}
    </div>
  )
}

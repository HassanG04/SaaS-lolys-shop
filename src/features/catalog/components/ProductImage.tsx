import { useState, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import { publicImageUrl } from '@/lib/images'
import { RibbonBow } from '@/components/ui/ornaments'

export interface ProductImageProps extends Omit<ComponentPropsWithoutRef<'img'>, 'src'> {
  src?: string | null
  alt: string
  aspectRatio?: 'square' | '4/3' | '16/9'
  fallback?: ReactNode
  imageClassName?: string
}

export function ProductImage(props: ProductImageProps) {
  // Changing the source must recover after a failure and restart its loading state.
  return <ImageContent key={props.src ?? ''} {...props} />
}

function ImageContent({
  src,
  alt,
  aspectRatio = 'square',
  fallback,
  className = '',
  imageClassName = '',
  loading = 'lazy',
  onLoad,
  onError,
  ...props
}: ProductImageProps) {
  const [hasError, setHasError] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const resolvedUrl = publicImageUrl(src)
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
      {resolvedUrl && !hasError ? (
        <>
          {!isLoaded && (
            <div aria-hidden="true" className="ui-skeleton absolute inset-0 bg-surface-2" />
          )}
          <img
            {...props}
            src={resolvedUrl}
            alt={alt}
            loading={loading}
            onLoad={(event) => {
              setIsLoaded(true)
              onLoad?.(event)
            }}
            onError={(event) => {
              setHasError(true)
              onError?.(event)
            }}
            className={`catalog-photo size-full object-cover rounded-image ${isLoaded ? 'opacity-100' : 'opacity-0'} ${imageClassName}`}
          />
        </>
      ) : (
        <div
          role={alt ? 'img' : undefined}
          aria-label={alt || undefined}
          aria-hidden={alt ? undefined : true}
          className="catalog-image-fallback flex size-full items-center justify-center rounded-image bg-surface-tint text-brand p-4"
        >
          {fallback ?? (
            <span className="catalog-placeholder-seal rounded-pill border border-border bg-surface p-5">
              <RibbonBow className="size-10" />
            </span>
          )}
        </div>
      )}
    </div>
  )
}

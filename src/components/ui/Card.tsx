import type { ComponentPropsWithRef } from 'react'

export function Card({ className = '', ...props }: ComponentPropsWithRef<'article'>) {
  return (
    <article
      {...props}
      className={`ui-card rounded-card border border-border bg-surface p-2 ${className}`}
    />
  )
}

type CardImageProps = ComponentPropsWithRef<'img'> & { alt: string }

export function CardImage({ className = '', alt, loading = 'lazy', ...props }: CardImageProps) {
  return (
    <img
      {...props}
      alt={alt}
      loading={loading}
      className={`aspect-square w-full rounded-image object-cover ${className}`}
    />
  )
}

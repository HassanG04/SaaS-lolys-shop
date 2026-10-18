export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`block min-h-4 min-w-8 rounded-chip ui-skeleton bg-surface-tint ${className}`}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="space-y-3 p-3 rounded-card border border-border bg-surface">
      <Skeleton className="aspect-square w-full rounded-image" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-9 w-full rounded-pill mt-2" />
    </div>
  )
}

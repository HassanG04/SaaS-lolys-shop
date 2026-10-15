export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`ui-skeleton block h-4 rounded-chip bg-surface-tint ${className}`}
    />
  )
}

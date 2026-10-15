export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`block h-4 rounded-chip bg-surface-tint animate-pulse motion-reduce:animate-none ${className}`}
    />
  )
}

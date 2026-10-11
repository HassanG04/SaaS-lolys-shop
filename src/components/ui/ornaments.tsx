import type { ComponentPropsWithRef, ReactNode } from 'react'

type OrnamentProps = { className?: string }

function Ornament({
  children,
  className = '',
  viewBox = '0 0 24 24',
}: OrnamentProps & { children: ReactNode; viewBox?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={viewBox}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

export function RibbonBow({ className = 'size-6' }: OrnamentProps) {
  return (
    <Ornament className={className}>
      <path d="M11 10C4 2 1 5 3 10s6 4 8 2m2-2c7-8 10-5 8 0s-6 4-8 2M10 13l-4 8 4-2 2 2 2-8m-1 0 5 8-1-5 4 1-6-5" />
      <rect x="10" y="9" width="4" height="5" rx="1" />
    </Ornament>
  )
}

export function RibbonDivider({ className = 'h-8 w-full text-pink-line' }: OrnamentProps) {
  return (
    <Ornament className={className} viewBox="0 0 240 24">
      <path d="M2 12Q55 22 105 12m30 0q50 10 103 0M118 10c-14-12-18-1-10 3l10-1m4-2c14-12 18-1 10 3l-10-1m-4 2-6 8 7-3 3 3 2-8" />
      <rect x="118" y="8" width="4" height="7" rx="1" />
    </Ornament>
  )
}

export function Sparkle({ className = 'size-4' }: OrnamentProps) {
  return (
    <Ornament className={`ui-sparkle ${className}`}>
      <path fill="currentColor" stroke="none" d="M12 2q1 9 10 10-9 1-10 10Q11 13 2 12q9-1 10-10Z" />
    </Ornament>
  )
}

export function ArchFrame({ className = '', ...props }: ComponentPropsWithRef<'div'>) {
  return (
    <div {...props} className={`overflow-hidden rounded-arch border border-current ${className}`} />
  )
}

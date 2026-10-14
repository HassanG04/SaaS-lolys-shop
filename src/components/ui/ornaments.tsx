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

export { RibbonDivider } from './RibbonDivider'

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

export function PearlOrnament({ className = 'text-sand' }: OrnamentProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 120 24"
      className={className}
      fill="currentColor"
    >
      <circle cx="12" cy="12" r="5" className="opacity-70" />
      <circle cx="28" cy="12" r="7" className="opacity-90" />
      <circle cx="48" cy="12" r="9" />
      <circle cx="72" cy="12" r="9" />
      <circle cx="92" cy="12" r="7" className="opacity-90" />
      <circle cx="108" cy="12" r="5" className="opacity-70" />
    </svg>
  )
}

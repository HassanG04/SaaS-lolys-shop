type OrnamentProps = { className?: string }

export function RibbonDivider({ className = 'h-8 w-full text-pink-line' }: OrnamentProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 240 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12Q55 22 105 12m30 0q50 10 103 0M118 10c-14-12-18-1-10 3l10-1m4-2c14-12 18-1 10 3l-10-1m-4 2-6 8 7-3 3 3 2-8" />
      <rect x="118" y="8" width="4" height="7" rx="1" />
    </svg>
  )
}

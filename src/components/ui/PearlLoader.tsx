import { ui } from '../../i18n/ar.json'

export function PearlLoader({ loading, label = ui.loading }: { loading: boolean; label?: string }) {
  if (!loading) return null
  return (
    <span role="status" aria-atomic="true" className="inline-flex items-center text-brand">
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 32 12"
        width="48"
        height="18"
        className="ui-pearls"
        fill="currentColor"
      >
        <circle cx="5" cy="7" r="3" />
        <circle cx="16" cy="7" r="3" />
        <circle cx="27" cy="7" r="3" />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  )
}

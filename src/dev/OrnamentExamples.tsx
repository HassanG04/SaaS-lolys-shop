import { useId, useState } from 'react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Pill, Chip } from '../components/ui/Label'
import { Skeleton } from '../components/ui/Skeleton'
import { PearlLoader } from '../components/ui/PearlLoader'
import { ArchFrame, RibbonBow, RibbonDivider, Sparkle } from '../components/ui/ornaments'
import placeholder from './card-placeholder.svg'

import { useLanguage } from '../i18n/LanguageProvider'

export function OrnamentExamples() {
  const { t: ar } = useLanguage()
  const [loading, setLoading] = useState(false)
  const id = useId()
  const copy = ar.kit.ornaments
  return (
    <section aria-labelledby={id} className="space-y-4">
      <h3 id={id} className="text-h3">
        {copy.title}
      </h3>
      <div className="flex flex-wrap items-center gap-3">
        <Pill>{copy.pill}</Pill>
        <Chip>{copy.chip}</Chip>
        <Badge label={copy.sale} />
        <Badge variant="sold-out" label={copy.soldOut} />
        <Badge
          variant="payment-state"
          label={copy.awaiting}
          icon={
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              focusable="false"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          }
        />
        <RibbonBow className="size-8 text-brand" />
        <Sparkle className="size-6 text-gold" />
      </div>
      <RibbonDivider />
      <ArchFrame className="max-w-48 text-pink-line">
        <img src={placeholder} alt={copy.image} width="192" height="192" loading="lazy" />
      </ArchFrame>
      <div className="space-y-2">
        <p>{copy.skeleton}</p>
        <Skeleton />
        <Skeleton className="w-2/3" />
      </div>
      <Button aria-pressed={loading} onClick={() => setLoading((value) => !value)}>
        {copy.loadingToggle}
      </Button>
      <PearlLoader loading={loading} />
    </section>
  )
}

import { useLanguage } from '../i18n/LanguageProvider'
import { LanguageToggle } from '../components/ui/LanguageToggle'
import { Button } from '../components/ui/Button'
import { IconButton } from '../components/ui/IconButton'
import { Card, CardImage } from '../components/ui/Card'
import placeholder from './card-placeholder.svg'
import { FeedbackExamples } from './FeedbackExamples'
import { FormExamples } from './FormExamples'
import { DialogExample } from './DialogExample'
import { OrnamentExamples } from './OrnamentExamples'

export default function KitPage() {
  const { t: ar } = useLanguage()
  return (
    <main className="space-y-8 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-h1">{ar.kit.title}</h1>
        <LanguageToggle />
      </div>
      {(['light', 'dark'] as const).flatMap((theme) =>
        (['rtl', 'ltr'] as const).map((direction) => (
          <section
            key={`${theme}-${direction}`}
            data-theme={theme}
            dir={direction}
            className="space-y-4 rounded-card bg-bg p-4 text-text"
          >
            <h2 className="text-h2">
              {ar.kit[theme]} — {ar.kit[direction]}
            </h2>
            <div className="flex flex-wrap gap-3">
              {(['primary', 'secondary', 'ghost', 'danger'] as const).map((variant) => (
                <Button key={variant} variant={variant}>
                  {ar.kit[variant]}
                </Button>
              ))}
              <Button disabled>{ar.kit.disabled}</Button>
              <IconButton aria-label={ar.kit.back} directional>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  focusable="false"
                >
                  <path d="m14 6-6 6 6 6" />
                </svg>
              </IconButton>
            </div>
            <Card className="max-w-64">
              <CardImage src={placeholder} alt={ar.kit.image} width="256" height="256" />
              <h3 className="p-3 text-h3">{ar.kit.card}</h3>
            </Card>
            <FormExamples />
            <FeedbackExamples />
            <DialogExample />
            <OrnamentExamples />
          </section>
        )),
      )}
    </main>
  )
}

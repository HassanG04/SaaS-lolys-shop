import { useId } from 'react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useKitCopy } from './useKitCopy'

export function AuthFormExamples() {
  const id = useId()
  const { kit } = useKitCopy()
  return (
    <div className="space-y-4">
      <h3 className="text-h3">{kit.auth.title}</h3>
      <p className="text-small text-text-muted">{kit.auth.previewNote}</p>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        {(['login', 'register'] as const).map((mode) => (
          <section
            key={mode}
            aria-labelledby={`${id}-${mode}`}
            className="ui-form-panel space-y-5 rounded-card border border-border bg-surface p-5 sm:p-6"
          >
            <h4 id={`${id}-${mode}`} className="text-h2 font-semibold">
              {kit.auth[mode]}
            </h4>
            <Input
              label={kit.auth.email}
              type="email"
              dir="ltr"
              autoComplete="off"
              readOnly
              placeholder={kit.auth.emailExample}
            />
            <Input
              label={kit.auth.password}
              type="password"
              dir="ltr"
              autoComplete="off"
              readOnly
              placeholder={kit.auth.passwordExample}
            />
            <Button className="w-full" disabled>
              {kit.auth[mode]}
            </Button>
          </section>
        ))}
      </div>
    </div>
  )
}

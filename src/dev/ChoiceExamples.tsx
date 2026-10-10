import { useId } from 'react'
import { Checkbox } from '../components/ui/Checkbox'
import { Radio } from '../components/ui/Radio'

import { useLanguage } from '../i18n/LanguageProvider'

export function ChoiceExamples() {
  const { t: ar } = useLanguage()
  const group = useId()
  return (
    <div className="grid gap-3">
      <Checkbox label={ar.kit.checkbox} />
      <Checkbox label={ar.kit.disabled} disabled defaultChecked />
      <fieldset className="space-y-2">
        <legend>{ar.kit.radio}</legend>
        <div className="flex flex-wrap gap-4">
          <Radio name={group} value="first" label={ar.kit.first} defaultChecked />
          <Radio name={group} value="second" label={ar.kit.second} />
          <Radio name={group} value="disabled" label={ar.kit.disabled} disabled />
        </div>
      </fieldset>
    </div>
  )
}

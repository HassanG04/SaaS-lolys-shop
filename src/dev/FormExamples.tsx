import { useState } from 'react'
import { Input } from '../components/ui/Input'
import { SearchInput } from '../components/ui/SearchInput'
import { Select } from '../components/ui/Select'
import { Textarea } from '../components/ui/Textarea'
import { ChoiceExamples } from './ChoiceExamples'

import { useLanguage } from '../i18n/LanguageProvider'

export function FormExamples() {
  const { t: ar } = useLanguage()
  const [query, setQuery] = useState('')
  return (
    <div className="grid gap-4">
      <h3 className="text-h3">{ar.kit.forms}</h3>
      <Input label={ar.field.name} hint={ar.kit.hint} autoComplete="name" />
      <Input label={ar.kit.disabled} disabled />
      <Input
        label={ar.kit.invalid}
        aria-invalid="true"
        hint={
          <span className="text-danger">
            <span aria-hidden="true">⚠︎ </span>
            {ar.kit.invalidMessage} {ar.kit.errorCode} <bdi dir="ltr">ADM-007</bdi>
          </span>
        }
      />
      <Select label={ar.field.governorate} defaultValue="first">
        <option value="first">{ar.kit.first}</option>
        <option value="second">{ar.kit.second}</option>
      </Select>
      <Textarea label={ar.field.notes} />
      <ChoiceExamples />
      <SearchInput label={ar.ui.search} placeholder={ar.search.placeholder} onSearch={setQuery} />
      {query && (
        <p role="status">
          {ar.kit.searchResult} {query}
        </p>
      )}
    </div>
  )
}

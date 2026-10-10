import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { Input } from './Input'
import { Select } from './Select'
import { Textarea } from './Textarea'
import { SearchInput } from './SearchInput'
import KitPage from '../../dev/KitPage'
import ar from '../../i18n/ar.json'

test('labelled native fields retain refs, names, selection and multiline values', async () => {
  const user = userEvent.setup()
  const ref = createRef<HTMLInputElement>()
  render(
    <form aria-label={ar.kit.forms}>
      <Input ref={ref} label={ar.field.name} name="name" hint={ar.kit.hint} />
      <Select label={ar.field.governorate} name="region">
        <option value="first">{ar.kit.first}</option>
        <option value="second">{ar.kit.second}</option>
      </Select>
      <Textarea label={ar.field.notes} name="notes" />
    </form>,
  )
  await user.click(screen.getByText(ar.field.name))
  expect(ref.current).toHaveFocus()
  expect(ref.current).toHaveAccessibleDescription(ar.kit.hint)
  await user.keyboard('ليلى')
  await user.selectOptions(screen.getByLabelText(ar.field.governorate), 'second')
  await user.type(screen.getByLabelText(ar.field.notes), '1{Enter}2')
  const values = new FormData(screen.getByRole('form') as HTMLFormElement)
  expect(Object.fromEntries(values)).toEqual({ name: 'ليلى', region: 'second', notes: '1\n2' })
})

test('preserves validation associations and controlled updates', async () => {
  const change = vi.fn()
  const { rerender } = render(
    <>
      <p id="error">{ar.kit.invalidMessage} ADM-007</p>
      <Input
        label={ar.field.name}
        value=""
        onChange={(e) => change(e.currentTarget.value)}
        aria-invalid="true"
        aria-describedby="error"
        hint={ar.kit.hint}
      />
    </>,
  )
  const input = screen.getByLabelText(ar.field.name)
  expect(input).toBeInvalid()
  expect(input).toHaveAccessibleDescription(`${ar.kit.invalidMessage} ADM-007 ${ar.kit.hint}`)
  await userEvent.setup().type(input, 'س')
  expect(change).toHaveBeenCalledWith('س')
  rerender(<Input label={ar.field.name} value="ليلى" readOnly />)
  expect(screen.getByLabelText(ar.field.name)).toHaveValue('ليلى')
})

test('search submits its actual value with a custom name by Enter or button', async () => {
  const user = userEvent.setup()
  const search = vi.fn()
  render(<SearchInput label={ar.ui.search} name="query" onSearch={search} required />)
  await user.click(screen.getByRole('button', { name: ar.ui.search }))
  expect(search).not.toHaveBeenCalled()
  await user.type(screen.getByRole('searchbox'), 'كوب{Enter}')
  await user.click(screen.getByRole('button', { name: ar.ui.search }))
  expect(search.mock.calls).toEqual([['كوب'], ['كوب']])
})

test('disabled form controls reject changes and search submission', async () => {
  const user = userEvent.setup()
  const search = vi.fn()
  render(
    <>
      <Input label={ar.field.name} disabled />
      <Textarea label={ar.field.notes} disabled />
      <Select label={ar.field.governorate} disabled>
        <option>{ar.kit.first}</option>
      </Select>
      <SearchInput label={ar.ui.search} onSearch={search} disabled />
    </>,
  )
  await user.type(screen.getByLabelText(ar.field.name), 'ليلى')
  await user.click(screen.getByRole('button', { name: ar.ui.search }))
  expect(screen.getByLabelText(ar.field.name)).toHaveValue('')
  expect(search).not.toHaveBeenCalled()
  for (const control of document.querySelectorAll('input,select,textarea,button'))
    expect(control).toBeDisabled()
})

test('repeated theme/direction previews have unique labels', () => {
  const { container } = render(<KitPage />)
  const ids = [...container.querySelectorAll('[id]')].map((node) => node.id)
  expect(new Set(ids).size).toBe(ids.length)
  expect(screen.getAllByLabelText(ar.field.name)).toHaveLength(4)
})

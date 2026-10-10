import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { Checkbox } from './Checkbox'
import { Radio } from './Radio'
import KitPage from '../../dev/KitPage'
import ar from '../../i18n/ar.json'

test.each(['rtl', 'ltr'])(
  'label/Space toggle and radio arrow navigation work in %s',
  async (dir) => {
    const user = userEvent.setup()
    const ref = createRef<HTMLInputElement>()
    render(
      <div dir={dir}>
        <Checkbox ref={ref} label={ar.kit.checkbox} />
        <Radio name="method" value="first" label={ar.kit.first} defaultChecked />
        <Radio name="method" value="second" label={ar.kit.second} />
      </div>,
    )
    await user.click(screen.getByText(ar.kit.checkbox))
    expect(ref.current).toHaveFocus()
    expect(ref.current).toBeChecked()
    await user.keyboard(' ')
    expect(ref.current).not.toBeChecked()
    await user.tab()
    expect(screen.getByRole('radio', { name: ar.kit.first })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: ar.kit.second })).toBeChecked()
    expect(screen.getByRole('radio', { name: ar.kit.first })).not.toBeChecked()
  },
)

test('disabled controls ignore label clicks and are skipped during keyboard navigation', async () => {
  const user = userEvent.setup()
  const change = vi.fn()
  render(
    <>
      <Checkbox label={ar.kit.checkbox} disabled onChange={change} />
      <Radio name="method" value="first" label={ar.kit.first} disabled onChange={change} />
      <Radio name="method" value="second" label={ar.kit.second} />
    </>,
  )
  await user.click(screen.getByText(ar.kit.checkbox))
  await user.click(screen.getByText(ar.kit.first))
  expect(change).not.toHaveBeenCalled()
  expect(screen.getByRole('checkbox')).not.toBeChecked()
  await user.tab()
  expect(screen.getByRole('radio', { name: ar.kit.second })).toHaveFocus()
})

test('controlled checked state, validation description and native form values are preserved', async () => {
  const change = vi.fn()
  const { rerender } = render(
    <>
      <p id="hint">{ar.kit.hint}</p>
      <Checkbox
        label={ar.kit.checkbox}
        checked={false}
        onChange={(e) => change(e.currentTarget.checked)}
        aria-invalid="true"
        aria-describedby="hint"
      />
    </>,
  )
  const input = screen.getByRole('checkbox')
  expect(input).toBeInvalid()
  expect(input).toHaveAccessibleDescription(ar.kit.hint)
  await userEvent.setup().click(input)
  expect(change).toHaveBeenCalledWith(true)
  expect(input).not.toBeChecked()
  rerender(
    <form aria-label={ar.kit.forms}>
      <Checkbox label={ar.kit.checkbox} name="selected" value="yes" defaultChecked />
      <Radio name="method" value="first" label={ar.kit.first} defaultChecked />
      <Radio name="method" value="second" label={ar.kit.second} />
      <button type="reset">{ar.kit.reset}</button>
    </form>,
  )
  const form = screen.getByRole('form') as HTMLFormElement
  expect(Object.fromEntries(new FormData(form))).toEqual({ selected: 'yes', method: 'first' })
  await userEvent.setup().click(screen.getByRole('radio', { name: ar.kit.second }))
  await userEvent.setup().click(screen.getByRole('button', { name: ar.kit.reset }))
  expect(screen.getByRole('radio', { name: ar.kit.first })).toBeChecked()
})

test('repeated previews keep IDs unique and radio selections isolated', async () => {
  const { container } = render(<KitPage />)
  const ids = [...container.querySelectorAll('[id]')].map((node) => node.id)
  expect(new Set(ids).size).toBe(ids.length)
  const first = screen.getAllByRole('radio', { name: ar.kit.first })
  await userEvent.setup().click(screen.getAllByRole('radio', { name: ar.kit.second })[0])
  expect(first[0]).not.toBeChecked()
  for (const radio of first.slice(1)) expect(radio).toBeChecked()
})

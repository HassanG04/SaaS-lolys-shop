import { createRef } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'
import { IconButton } from './IconButton'
import { Card, CardImage } from './Card'
import KitPage from '../../dev/KitPage'
import ar from '../../i18n/ar.json'
import placeholder from '../../dev/card-placeholder.svg'

describe('UI actions', () => {
  it('activates with Enter and Space without submitting the surrounding form', async () => {
    const user = userEvent.setup()
    const click = vi.fn()
    const submit = vi.fn((event) => event.preventDefault())
    const ref = createRef<HTMLButtonElement>()
    render(
      <form onSubmit={submit}>
        <Button ref={ref} onClick={click}>
          {ar.kit.primary}
        </Button>
      </form>,
    )
    await user.tab()
    expect(ref.current).toHaveFocus()
    await user.keyboard('{Enter} ')
    expect(click).toHaveBeenCalledTimes(2)
    expect(submit).not.toHaveBeenCalled()
  })

  it('supports explicit submission, disabled controls and forwarded attributes', () => {
    const submit = vi.fn((event) => event.preventDefault())
    const click = vi.fn()
    render(
      <form onSubmit={submit}>
        <Button type="submit" name="save">
          {ar.kit.primary}
        </Button>
        <Button disabled onClick={click}>
          {ar.kit.disabled}
        </Button>
      </form>,
    )
    fireEvent.click(screen.getByRole('button', { name: ar.kit.primary }))
    fireEvent.click(screen.getByRole('button', { name: ar.kit.disabled }))
    expect(submit).toHaveBeenCalledOnce()
    expect(click).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: ar.kit.primary })).toHaveAttribute('name', 'save')
  })

  it('names icon actions and mirrors only directional artwork', () => {
    const { rerender } = render(
      <IconButton aria-label={ar.kit.back} directional>
        <svg role="img" />
      </IconButton>,
    )
    const button = screen.getByRole('button', { name: ar.kit.back })
    expect(within(button).queryByRole('img')).not.toBeInTheDocument()
    expect(button.firstElementChild).toHaveClass('rtl:-scale-x-100')
    rerender(
      <IconButton aria-label={ar.kit.back}>
        <svg role="img" />
      </IconButton>,
    )
    expect(button.firstElementChild).not.toHaveClass('rtl:-scale-x-100')
  })

  it('keeps cards semantic, descriptive images and explicitly eager loading', () => {
    const ref = createRef<HTMLImageElement>()
    render(
      <Card aria-label={ar.kit.card}>
        <CardImage ref={ref} src={placeholder} alt={ar.kit.image} loading="eager" />
      </Card>,
    )
    expect(
      within(screen.getByRole('article', { name: ar.kit.card })).getByRole('img', {
        name: ar.kit.image,
      }),
    ).toBe(ref.current)
    expect(ref.current).toHaveAttribute('loading', 'eager')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('previews all four button variants in both themes and directions', () => {
    render(<KitPage />)
    for (const name of [
      ar.kit.primary,
      ar.kit.secondary,
      ar.kit.ghost,
      ar.kit.danger,
      ar.kit.back,
    ]) {
      expect(screen.getAllByRole('button', { name })).toHaveLength(4)
    }
    expect(screen.getAllByRole('img', { name: ar.kit.image })).toHaveLength(4)
  })
})

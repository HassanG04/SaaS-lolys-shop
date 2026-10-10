import { createRef } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import { Badge } from './Badge'
import { Pill, Chip } from './Label'
import { Skeleton } from './Skeleton'
import { PearlLoader } from './PearlLoader'
import { ArchFrame, RibbonBow, RibbonDivider, Sparkle } from './ornaments'
import KitPage from '../../dev/KitPage'
import ar from '../../i18n/ar.json'
import placeholder from '../../dev/card-placeholder.svg'

const copy = ar.kit.ornaments

test('labels preserve content, attributes and refs without adding keyboard stops', async () => {
  const pill = createRef<HTMLSpanElement>()
  const chip = createRef<HTMLSpanElement>()
  render(
    <>
      <Pill ref={pill} title={copy.pill}>
        {copy.pill}
      </Pill>
      <Chip ref={chip} lang="ar">
        {copy.chip}
      </Chip>
      <button>{ar.kit.primary}</button>
    </>,
  )
  expect(pill.current).toHaveTextContent(copy.pill)
  expect(pill.current).toHaveAttribute('title', copy.pill)
  expect(chip.current).toHaveTextContent(copy.chip)
  expect(chip.current).toHaveAttribute('lang', 'ar')
  await userEvent.setup().tab()
  expect(screen.getByRole('button')).toHaveFocus()
})

test('badges retain state text and hide redundant state artwork', () => {
  render(
    <>
      <Badge label={copy.sale} />
      <Badge variant="sold-out" label={copy.soldOut} />
      <Badge
        variant="payment-state"
        label={copy.awaiting}
        icon={<svg role="img" aria-label={ar.kit.image} />}
      />
    </>,
  )
  for (const text of [copy.sale, copy.soldOut, copy.awaiting])
    expect(screen.getByText(text)).toBeVisible()
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})

test('decorative SVGs and skeletons stay outside the accessibility tree', () => {
  const { container } = render(
    <>
      <RibbonBow />
      <RibbonDivider />
      <Sparkle />
      <Skeleton />
    </>,
  )
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
  for (const svg of container.querySelectorAll('svg')) {
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('focusable', 'false')
  }
  expect(container.lastElementChild).toHaveAttribute('aria-hidden', 'true')
})

test('arch frames preserve image descriptions and forward their container ref', () => {
  const frame = createRef<HTMLDivElement>()
  render(
    <ArchFrame ref={frame}>
      <img src={placeholder} alt={copy.image} />
    </ArchFrame>,
  )
  expect(frame.current).toContainElement(screen.getByRole('img', { name: copy.image }))
})

test('loading state appears with Arabic status text and disappears without moving focus', async () => {
  const user = userEvent.setup()
  const view = (loading: boolean) => (
    <>
      <button>{copy.loadingToggle}</button>
      <PearlLoader loading={loading} />
    </>
  )
  const { rerender } = render(view(false))
  await user.tab()
  const trigger = screen.getByRole('button')
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  rerender(view(true))
  expect(screen.getByRole('status')).toHaveTextContent(ar.ui.loading)
  expect(within(screen.getByRole('status')).queryByRole('img')).not.toBeInTheDocument()
  expect(trigger).toHaveFocus()
  rerender(view(false))
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  expect(trigger).toHaveFocus()
})

test('each theme/direction preview independently toggles its loading state', async () => {
  const user = userEvent.setup()
  render(<KitPage />)
  const regions = screen.getAllByRole('region', { name: copy.title })
  expect(regions).toHaveLength(4)
  for (const region of regions) {
    const controls = within(region)
    const toggle = controls.getByRole('button', { name: copy.loadingToggle })
    expect(controls.queryByRole('status')).not.toBeInTheDocument()
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(controls.getByRole('status')).toHaveTextContent(ar.ui.loading)
    await user.click(toggle)
    expect(controls.queryByRole('status')).not.toBeInTheDocument()
    expect(controls.getByRole('img', { name: copy.image })).toBeVisible()
  }
})

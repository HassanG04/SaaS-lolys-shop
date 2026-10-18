import { createRef } from 'react'
import { createEvent, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { Button } from './Button'
import { MagneticAnchor } from './MagneticAnchor'

let reducedMotion = false
let finePointer = true

beforeEach(() => {
  reducedMotion = false
  finePointer = true
  const original = window.matchMedia
  vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
    ...original(query),
    matches: query.includes('reduced-motion') ? reducedMotion : finePointer,
  }))
})
afterEach(() => {
  delete document.documentElement.dataset.motion
  vi.restoreAllMocks()
})

function move(element: HTMLElement, pointerType = 'mouse') {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 200, 48))
  const event = createEvent.pointerMove(element)
  Object.defineProperties(event, {
    pointerType: { value: pointerType },
    clientX: { value: 180 },
    clientY: { value: 40 },
  })
  fireEvent(element, event)
}

it('retains the caller ref, pointer handlers and click behavior while resetting magnetic offsets', () => {
  const ref = createRef<HTMLButtonElement>()
  const onMove = vi.fn(),
    onLeave = vi.fn(),
    onClick = vi.fn()
  render(
    <Button ref={ref} onPointerMove={onMove} onPointerLeave={onLeave} onClick={onClick}>
      Shop
    </Button>,
  )
  const button = screen.getByRole('button')
  expect(ref.current).toBe(button)
  move(button)
  expect(onMove).toHaveBeenCalledOnce()
  expect(button.style.getPropertyValue('--magnetic-x')).not.toBe('')
  fireEvent.pointerDown(button)
  expect(button.style.getPropertyValue('--magnetic-x')).toBe('')
  fireEvent.click(button)
  expect(onClick).toHaveBeenCalledOnce()
  move(button)
  fireEvent.pointerLeave(button)
  expect(onLeave).toHaveBeenCalledOnce()
  expect(button.style.getPropertyValue('--magnetic-y')).toBe('')
})

it.each(['touch', 'reduced', 'coarse', 'disabled', 'busy', 'prevented'])(
  'does not move controls for %s input/state',
  (mode) => {
    reducedMotion = mode === 'reduced'
    if (mode === 'reduced') {
      document.documentElement.dataset.motion = 'reduced'
    } else {
      delete document.documentElement.dataset.motion
    }
    finePointer = mode !== 'coarse'
    render(
      <Button
        disabled={mode === 'disabled'}
        aria-busy={mode === 'busy'}
        onPointerMove={(event) => {
          if (mode === 'prevented') event.preventDefault()
        }}
      >
        Shop
      </Button>,
    )
    const button = screen.getByRole('button')
    move(button, mode === 'touch' ? 'touch' : 'mouse')
    expect(button.style.getPropertyValue('--magnetic-x')).toBe('')
  },
)

it('moves controls for fine pointer under default full motion even when device reduced motion is active (T-3.11)', () => {
  reducedMotion = true
  document.documentElement.dataset.motion = 'full'
  finePointer = true
  render(<Button>Shop</Button>)
  const button = screen.getByRole('button')
  move(button)
  expect(button.style.getPropertyValue('--magnetic-x')).not.toBe('')
})

it('keeps anchor navigation and clears offsets when keyboard focus or pointer cancellation arrives', () => {
  const ref = createRef<HTMLAnchorElement>()
  render(
    <MagneticAnchor ref={ref} href="#browse">
      Browse
    </MagneticAnchor>,
  )
  const anchor = screen.getByRole('link')
  expect(ref.current).toBe(anchor)
  expect(anchor).toHaveAttribute('href', '#browse')
  move(anchor)
  fireEvent.focus(anchor)
  expect(anchor.style.getPropertyValue('--magnetic-x')).toBe('')
  move(anchor)
  fireEvent.pointerCancel(anchor)
  expect(anchor.style.getPropertyValue('--magnetic-x')).toBe('')
})

import type { DOMAttributes, SyntheticEvent } from 'react'

type MotionHandlers<T> = Pick<
  DOMAttributes<T>,
  'onPointerMove' | 'onPointerLeave' | 'onPointerCancel' | 'onPointerDown' | 'onFocus'
>

// Transient offsets stay on the element: pointer movement must not rerender forms.
export function magneticHandlers<T extends HTMLElement>(props: MotionHandlers<T>) {
  const reset = (event: SyntheticEvent<T>) => {
    event.currentTarget.style.removeProperty('--magnetic-x')
    event.currentTarget.style.removeProperty('--magnetic-y')
  }

  return {
    onPointerMove: (event) => {
      props.onPointerMove?.(event)
      const element = event.currentTarget
      if (
        event.defaultPrevented ||
        event.pointerType !== 'mouse' ||
        element.matches(':disabled, [aria-disabled="true"], [aria-busy="true"], :focus-visible') ||
        !window.matchMedia('(hover: hover) and (pointer: fine)').matches ||
        (typeof document !== 'undefined' && document.documentElement.dataset.motion === 'reduced')
      ) {
        reset(event)
        return
      }
      const bounds = element.getBoundingClientRect()
      if (!bounds.width || !bounds.height) return
      const clamp = (value: number) => Math.max(-1, Math.min(1, value))
      const x = clamp(((event.clientX - bounds.left) / bounds.width - 0.5) * 2) * 5
      const y = clamp(((event.clientY - bounds.top) / bounds.height - 0.5) * 2) * 3
      element.style.setProperty('--magnetic-x', `${x.toFixed(2)}px`)
      element.style.setProperty('--magnetic-y', `${y.toFixed(2)}px`)
    },
    onPointerLeave: (event) => {
      reset(event)
      props.onPointerLeave?.(event)
    },
    onPointerCancel: (event) => {
      reset(event)
      props.onPointerCancel?.(event)
    },
    onPointerDown: (event) => {
      reset(event)
      props.onPointerDown?.(event)
    },
    onFocus: (event) => {
      reset(event)
      props.onFocus?.(event)
    },
  } satisfies MotionHandlers<T>
}

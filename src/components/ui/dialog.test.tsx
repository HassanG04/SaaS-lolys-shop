import { StrictMode } from 'react'
import { fireEvent, render, screen } from '../../test-utils'
import { expect, test, vi } from 'vitest'
import { Dialog } from './Dialog'
import ar from '../../i18n/ar.json'

// jsdom has no showModal/close. These tests cover React markup/event contracts
// only; native modality, focus and real Escape remain a browser acceptance gate.
test('closed dialogs stay hidden and have unique title/description associations', () => {
  const { container, rerender } = render(
    <StrictMode>
      {['rtl', 'ltr'].map((dir) => (
        <div dir={dir} key={dir}>
          <Dialog
            open={false}
            title={ar.kit.dialog.title}
            description={ar.kit.dialog.description}
            onClose={() => {}}
          >
            <p>{ar.kit.hint}</p>
          </Dialog>
        </div>
      ))}
    </StrictMode>,
  )
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  for (const dialog of screen.getAllByRole('dialog', { hidden: true })) {
    expect(dialog).not.toBeVisible()
    expect(dialog).not.toHaveAttribute('open')
    expect(document.getElementById(dialog.getAttribute('aria-labelledby') ?? '')).toHaveTextContent(
      ar.kit.dialog.title,
    )
    expect(
      document.getElementById(dialog.getAttribute('aria-describedby') ?? ''),
    ).toHaveTextContent(ar.kit.dialog.description)
  }
  const ids = [...container.querySelectorAll('[id]')].map((node) => node.id)
  expect(new Set(ids).size).toBe(ids.length)
  rerender(
    <Dialog open={false} title={ar.kit.dialog.title} onClose={() => {}}>
      <p>{ar.kit.hint}</p>
    </Dialog>,
  )
  expect(screen.getByRole('dialog', { hidden: true })).not.toHaveAttribute('aria-describedby')
})

test('close controls and cancel events request controlled dismissal without submitting forms', () => {
  const close = vi.fn()
  const submit = vi.fn((event) => event.preventDefault())
  render(
    <form onSubmit={submit}>
      <Dialog open={false} title={ar.kit.dialog.title} onClose={close}>
        <p>{ar.kit.hint}</p>
      </Dialog>
    </form>,
  )
  const control = screen.getByLabelText(ar.ui.closeDialog)
  expect(control).toHaveAttribute('type', 'button')
  fireEvent.click(control)
  expect(close).toHaveBeenCalledOnce()
  expect(submit).not.toHaveBeenCalled()
  const cancel = new Event('cancel', { cancelable: true })
  const dialog = screen.getByRole('dialog', { hidden: true })
  fireEvent(dialog, cancel)
  expect(cancel.defaultPrevented).toBe(true)
  expect(close).toHaveBeenCalledTimes(2)
  fireEvent(dialog, new Event('close'))
  expect(close).toHaveBeenCalledTimes(2)
})

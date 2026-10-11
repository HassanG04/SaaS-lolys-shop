import { fireEvent, render, screen, within } from '../../test-utils'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { Tabs } from './Tabs'
import { Toast } from './Toast'
import ar from '../../i18n/ar.json'

const copy = ar.kit.feedback
const tabs = [
  { id: 'first', label: copy.firstTab, content: copy.firstPanel },
  { id: 'second', label: copy.secondTab, content: copy.secondPanel },
  { id: 'third', label: copy.thirdTab, content: copy.thirdPanel },
]

test.each(['ltr', 'rtl'])('tabs navigate, wrap and exit to the panel in %s', async (direction) => {
  const user = userEvent.setup()
  const submit = vi.fn((event) => event.preventDefault())
  render(
    <form dir={direction} onSubmit={submit}>
      <Tabs ariaLabel={copy.tabsLabel} tabs={tabs} />
    </form>,
  )
  const buttons = screen.getAllByRole('tab')
  const forward = direction === 'rtl' ? '{ArrowLeft}' : '{ArrowRight}'
  const backward = direction === 'rtl' ? '{ArrowRight}' : '{ArrowLeft}'
  await user.tab()
  expect(buttons[0]).toHaveFocus()
  await user.keyboard(forward)
  expect(buttons[1]).toHaveFocus()
  expect(buttons[1]).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByRole('tabpanel')).toHaveTextContent(copy.secondPanel)
  await user.keyboard('{End}')
  expect(buttons[2]).toHaveFocus()
  await user.keyboard(forward)
  expect(buttons[0]).toHaveFocus()
  await user.keyboard(backward)
  expect(buttons[2]).toHaveFocus()
  await user.keyboard('{Home}{Enter} ')
  expect(buttons[0]).toHaveFocus()
  expect(submit).not.toHaveBeenCalled()
  await user.tab()
  expect(screen.getByRole('tabpanel')).toHaveFocus()
})

test('tabs skip disabled choices and derive a valid selection after items change', async () => {
  const user = userEvent.setup()
  const available = tabs.map((tab) => ({ ...tab, disabled: tab.id === 'second' }))
  const { rerender } = render(
    <Tabs ariaLabel={copy.tabsLabel} tabs={available} defaultTabId="second" />,
  )
  await user.tab()
  await user.keyboard('{ArrowRight}')
  expect(screen.getByRole('tab', { name: copy.thirdTab })).toHaveFocus()
  await user.click(screen.getByRole('tab', { name: copy.secondTab }))
  expect(screen.getByRole('tabpanel')).toHaveTextContent(copy.thirdPanel)
  rerender(<Tabs ariaLabel={copy.tabsLabel} tabs={available.slice(0, 2)} />)
  expect(screen.getByRole('tab', { selected: true })).toHaveTextContent(copy.firstTab)
  rerender(
    <Tabs ariaLabel={copy.tabsLabel} tabs={available.map((tab) => ({ ...tab, disabled: true }))} />,
  )
  expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
  rerender(<Tabs ariaLabel={copy.tabsLabel} tabs={[]} />)
  expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
})

test('repeated tabs have unique linked panels and retain panel state when switched', async () => {
  const user = userEvent.setup()
  const items = tabs.map((tab) => ({ ...tab, content: <input aria-label={tab.label} /> }))
  const { container } = render(
    <>
      <Tabs ariaLabel={copy.tabsLabel} tabs={items} />
      <Tabs ariaLabel={copy.tabsLabel} tabs={tabs} />
    </>,
  )
  const ids = [...container.querySelectorAll('[id]')].map((node) => node.id)
  expect(new Set(ids).size).toBe(ids.length)
  for (const tab of screen.getAllByRole('tab')) {
    const panel = document.getElementById(tab.getAttribute('aria-controls') ?? '')
    expect(panel).toHaveAttribute('aria-labelledby', tab.id)
    expect(tab.tabIndex).toBe(tab.getAttribute('aria-selected') === 'true' ? 0 : -1)
  }
  await user.type(screen.getByRole('textbox', { name: copy.firstTab }), 'ليلى')
  const list = screen.getAllByRole('tablist')[0] as HTMLElement
  await user.click(within(list).getByRole('tab', { name: copy.secondTab }))
  expect(screen.queryByRole('textbox', { name: copy.firstTab })).not.toBeInTheDocument()
  await user.click(within(list).getByRole('tab', { name: copy.firstTab }))
  expect(screen.getByRole('textbox', { name: copy.firstTab })).toHaveValue('ليلى')
})

test.each(['success', 'info', 'warning', 'danger'] as const)(
  'toast %s announces without moving focus and supports dismissal',
  async (severity) => {
    const user = userEvent.setup()
    const dismiss = vi.fn()
    const { rerender } = render(<button>{copy.toggleNotification}</button>)
    await user.tab()
    const opener = screen.getByRole('button')
    rerender(
      <>
        <button>{copy.toggleNotification}</button>
        <Toast
          title={copy.toastTitle}
          message={copy.toastMessage}
          severity={severity}
          onDismiss={dismiss}
        />
      </>,
    )
    expect(opener).toHaveFocus()
    const announcement = screen.getByRole(severity === 'danger' ? 'alert' : 'status')
    expect(announcement).toHaveTextContent(copy.toastMessage)
    expect(announcement).toHaveAttribute('aria-atomic', 'true')
    expect(within(announcement).queryByRole('button')).not.toBeInTheDocument()
    await user.tab()
    expect(screen.getByRole('button', { name: ar.ui.dismissNotification })).toHaveFocus()
    await user.keyboard('{Enter} ')
    expect(dismiss).toHaveBeenCalledTimes(2)
    fireEvent.click(screen.getByRole('button', { name: ar.ui.dismissNotification }))
    expect(dismiss).toHaveBeenCalledTimes(3)
  },
)

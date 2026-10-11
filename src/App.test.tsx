import { render, screen } from './test-utils'
import { expect, test } from 'vitest'
import App from '@/App'
import { kit } from './i18n/ar.json'

test('provides a main landmark without prototype shop behavior', () => {
  render(<App />)
  expect(screen.getByRole('main')).toContainElement(
    screen.getByRole('button', { name: 'المظهر الداكن' }),
  )
})

test('opens the development kit at its route', async () => {
  window.history.replaceState(null, '', '/__kit')
  try {
    render(<App />)
    expect(await screen.findByRole('heading', { name: kit.title })).toBeInTheDocument()
  } finally {
    window.history.replaceState(null, '', '/')
  }
})

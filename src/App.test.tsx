import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import App from '@/App'

test('provides a main landmark without prototype shop behavior', () => {
  render(<App />)
  expect(screen.getByRole('main')).toContainElement(
    screen.getByRole('button', { name: 'المظهر الداكن' }),
  )
})

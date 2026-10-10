import { render, screen } from '../test-utils'
import { expect, test } from 'vitest'
import { AuthFormExamples } from './AuthFormExamples'
import ar from '../i18n/ar.json'

test('keeps login and registration panels compact while inputs remain full width inside them', () => {
  const { container } = render(<AuthFormExamples />)
  expect(screen.getByRole('heading', { name: ar.kit.auth.title })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: ar.kit.auth.login })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: ar.kit.auth.register })).toBeInTheDocument()
  const panels = container.querySelectorAll('.ui-form-panel')
  expect(panels).toHaveLength(2)
  for (const panel of panels) {
    expect(panel).toHaveClass('ui-form-panel')
    expect(panel.querySelectorAll('input')).toHaveLength(2)
  }
})

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

test('shows a clear development error screen when booting without env values', () => {
  render(
    <App
      envValidation={{
        success: false,
        data: null,
        errors: [
          'VITE_SUPABASE_URL: VITE_SUPABASE_URL is required',
          'VITE_SUPABASE_ANON_KEY: VITE_SUPABASE_ANON_KEY is required',
          'VITE_TURNSTILE_SITE_KEY: VITE_TURNSTILE_SITE_KEY is required',
        ],
        formattedMessage: 'Missing or invalid environment configuration',
      }}
    />,
  )

  const alert = screen.getByRole('alert')
  expect(alert).toBeInTheDocument()
  expect(
    screen.getByRole('heading', {
      name: /خطأ في إعدادات البيئة|Environment Configuration/,
    }),
  ).toBeInTheDocument()
  expect(screen.getByText(/VITE_SUPABASE_URL: VITE_SUPABASE_URL is required/)).toBeInTheDocument()
  expect(
    screen.getByText(/VITE_SUPABASE_ANON_KEY: VITE_SUPABASE_ANON_KEY is required/),
  ).toBeInTheDocument()
  expect(
    screen.getByText(/VITE_TURNSTILE_SITE_KEY: VITE_TURNSTILE_SITE_KEY is required/),
  ).toBeInTheDocument()
  expect(screen.getByText(/npx supabase status/)).toBeInTheDocument()
})

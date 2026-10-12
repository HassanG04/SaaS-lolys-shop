import { render, screen } from './test-utils'
import { expect, test } from 'vitest'
import App from '@/App'
import { kit } from './i18n/ar.json'

test('renders Layout with skip link, main landmark, navbar and footer', async () => {
  render(<App initialEntries={['/']} />)

  // Skip link
  expect(
    screen.getByRole('link', { name: /تخطي إلى المحتوى الرئيسي|Skip to main content/ }),
  ).toBeInTheDocument()

  // Main landmark
  expect(screen.getByRole('main')).toBeInTheDocument()

  // Navbar header with theme toggle
  expect(screen.getByRole('banner')).toContainElement(
    screen.getByRole('button', { name: 'المظهر الداكن' }),
  )

  // Footer landmark
  expect(screen.getByRole('contentinfo')).toBeInTheDocument()

  // Home heading
  expect(
    await screen.findByRole('heading', { name: /إكسسوارات|خصم يصل إلى|متجر لوليز/ }),
  ).toBeInTheDocument()
})

test('navigates to routes and renders placeholders', async () => {
  // Category route
  const { unmount: unmount1 } = render(<App initialEntries={['/category/all']} />)
  expect(await screen.findByRole('heading', { name: 'جميع المنتجات' })).toBeInTheDocument()
  unmount1()

  // Product route
  const { unmount: unmount2 } = render(<App initialEntries={['/product/invalid']} />)
  expect(await screen.findByRole('heading', { name: '404' })).toBeInTheDocument()
  unmount2()

  // Cart route
  const { unmount: unmount3 } = render(<App initialEntries={['/cart']} />)
  expect(await screen.findByRole('heading', { name: 'سلة التسوق' })).toBeInTheDocument()
  unmount3()

  // Terms route
  const { unmount: unmount4 } = render(<App initialEntries={['/terms']} />)
  expect(await screen.findByRole('heading', { name: 'الشروط والأحكام' })).toBeInTheDocument()
  unmount4()

  // 404 route
  const { unmount: unmount5 } = render(<App initialEntries={['/non-existent-route']} />)
  expect(await screen.findByRole('heading', { name: '404' })).toBeInTheDocument()
  unmount5()
})

test('opens the development kit at its route', async () => {
  render(<App initialEntries={['/__kit']} />)
  expect(await screen.findByRole('heading', { name: kit.title })).toBeInTheDocument()
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

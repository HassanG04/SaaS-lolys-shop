import { RouterProvider, createBrowserRouter, createMemoryRouter } from 'react-router-dom'
import { ThemeProvider } from './components/ui/ThemeProvider'
import { LanguageProvider } from './i18n/LanguageProvider'
import { validateEnv, type EnvValidationResult } from './lib/env'
import { EnvErrorScreen } from './components/EnvErrorScreen'
import { routes } from './routes'

export interface AppProps {
  envValidation?: EnvValidationResult
  router?: ReturnType<typeof createBrowserRouter> | ReturnType<typeof createMemoryRouter>
  initialEntries?: string[]
}

export default function App({
  envValidation,
  router: customRouter,
  initialEntries,
}: AppProps = {}) {
  const validation = envValidation ?? validateEnv()

  if (!validation.success) {
    if (import.meta.env.DEV) {
      return (
        <ThemeProvider>
          <EnvErrorScreen
            errors={validation.errors}
            formattedMessage={validation.formattedMessage}
          />
        </ThemeProvider>
      )
    }

    return (
      <main className="p-4 text-center text-(--color-danger)" role="alert">
        <h1>Configuration Error</h1>
      </main>
    )
  }

  // Use memory router in test environments or when initialEntries are provided for isolation
  const isTest = import.meta.env.MODE === 'test'
  const router =
    customRouter ??
    (initialEntries || isTest
      ? createMemoryRouter(routes, {
          initialEntries: initialEntries ?? [
            typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/',
          ],
        })
      : createBrowserRouter(routes))

  return (
    <LanguageProvider>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </LanguageProvider>
  )
}

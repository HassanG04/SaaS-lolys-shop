import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createBrowserRouter, createMemoryRouter } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ThemeProvider } from './components/ui/ThemeProvider'
import { ToastProvider } from './components/ui/ToastProvider'
import { AuthProvider } from './features/auth/AuthProvider'
import { LanguageProvider } from './i18n/LanguageProvider'
import { validateEnv, type EnvValidationResult } from './lib/env'
import { queryClient as defaultQueryClient } from './lib/queryClient'
import { EnvErrorScreen } from './components/EnvErrorScreen'
import { routes } from './routes'

export interface AppProps {
  envValidation?: EnvValidationResult
  router?: ReturnType<typeof createBrowserRouter> | ReturnType<typeof createMemoryRouter>
  initialEntries?: string[]
  queryClient?: QueryClient
}

export default function App({
  envValidation,
  router: customRouter,
  initialEntries,
  queryClient: customQueryClient,
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

  const activeQueryClient = customQueryClient ?? defaultQueryClient

  return (
    <LanguageProvider>
      <ThemeProvider>
        <QueryClientProvider client={activeQueryClient}>
          <AuthProvider>
            <ToastProvider>
              <ErrorBoundary>
                <RouterProvider router={router} />
              </ErrorBoundary>
            </ToastProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </LanguageProvider>
  )
}

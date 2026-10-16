import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createBrowserRouter, type createMemoryRouter } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ThemeProvider } from './components/ui/ThemeProvider'
import { ToastProvider } from './components/ui/ToastProvider'
import { AuthProvider } from './features/auth/AuthProvider'
import { CartProvider } from './features/cart'
import { LanguageProvider } from './i18n/LanguageProvider'
import { validateEnv, type EnvValidationResult } from './lib/env'
import { queryClient as defaultQueryClient } from './lib/queryClient'
const createTestRouter =
  import.meta.env.MODE === 'test' ? (await import('react-router-dom')).createMemoryRouter : null
let DevEnvErrorScreen: React.ComponentType<{
  errors: string[]
  formattedMessage?: string | null
}> | null = null

if (import.meta.env.DEV) {
  const mod = await import('./components/EnvErrorScreen')
  DevEnvErrorScreen = mod.EnvErrorScreen
}
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
    if (import.meta.env.DEV && DevEnvErrorScreen) {
      const ErrorScreen = DevEnvErrorScreen
      return (
        <ThemeProvider>
          <ErrorScreen errors={validation.errors} formattedMessage={validation.formattedMessage} />
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
  const router =
    customRouter ??
    (createTestRouter
      ? createTestRouter(routes, {
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
              <CartProvider>
                <ErrorBoundary>
                  <RouterProvider router={router} />
                </ErrorBoundary>
              </CartProvider>
            </ToastProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </LanguageProvider>
  )
}

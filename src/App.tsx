import { lazy, Suspense } from 'react'
import { ThemeProvider } from './components/ui/ThemeProvider'
import { ThemeToggle } from './components/ui/ThemeToggle'
import { LanguageToggle } from './components/ui/LanguageToggle'
import { LanguageProvider } from './i18n/LanguageProvider'
import { validateEnv, type EnvValidationResult } from './lib/env'
import { EnvErrorScreen } from './components/EnvErrorScreen'

const KitPage = import.meta.env.DEV ? lazy(() => import('./dev/KitPage')) : null

export interface AppProps {
  envValidation?: EnvValidationResult
}

export default function App({ envValidation }: AppProps = {}) {
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

  return (
    <LanguageProvider>
      <ThemeProvider>
        {KitPage && window.location.pathname === '/__kit' ? (
          <Suspense fallback={null}>
            <KitPage />
          </Suspense>
        ) : (
          <main className="flex gap-4 p-4">
            <ThemeToggle />
            <LanguageToggle />
          </main>
        )}
      </ThemeProvider>
    </LanguageProvider>
  )
}

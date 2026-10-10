import { lazy, Suspense } from 'react'
import { ThemeProvider } from './components/ui/ThemeProvider'
import { ThemeToggle } from './components/ui/ThemeToggle'
import { LanguageToggle } from './components/ui/LanguageToggle'
import { LanguageProvider } from './i18n/LanguageProvider'

const KitPage = import.meta.env.DEV ? lazy(() => import('./dev/KitPage')) : null

export default function App() {
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

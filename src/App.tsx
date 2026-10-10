import { lazy, Suspense } from 'react'
import { ThemeProvider } from './components/ui/ThemeProvider'
import { ThemeToggle } from './components/ui/ThemeToggle'

const KitPage = import.meta.env.DEV ? lazy(() => import('./dev/KitPage')) : null

export default function App() {
  return (
    <ThemeProvider>
      {KitPage && window.location.pathname === '/__kit' ? (
        <Suspense fallback={null}>
          <KitPage />
        </Suspense>
      ) : (
        <main className="p-4">
          <ThemeToggle />
        </main>
      )}
    </ThemeProvider>
  )
}

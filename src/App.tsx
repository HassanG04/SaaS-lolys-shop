import { ThemeProvider } from './components/ui/ThemeProvider'
import { ThemeToggle } from './components/ui/ThemeToggle'

export default function App() {
  return (
    <ThemeProvider>
      <main className="p-4">
        <ThemeToggle />
      </main>
    </ThemeProvider>
  )
}

import { useEffect, useRef, useState, type ReactNode } from 'react'

export interface SectionRevealProps {
  children: ReactNode
  className?: string
  replayKey?: string | number
}

function shouldSkipMotion() {
  return (
    typeof window === 'undefined' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    !('IntersectionObserver' in window)
  )
}

export function SectionReveal({ children, className = '', replayKey }: SectionRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(() => shouldSkipMotion())
  const [prevKey, setPrevKey] = useState(replayKey)

  if (prevKey !== replayKey) {
    setPrevKey(replayKey)
    if (!shouldSkipMotion()) {
      setIsVisible(false)
    }
  }

  useEffect(() => {
    if (shouldSkipMotion()) return

    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [replayKey])

  return (
    <div
      ref={ref}
      key={replayKey}
      className={`${className} ${isVisible ? 'section-reveal-enter' : ''}`}
    >
      {children}
    </div>
  )
}

export default SectionReveal

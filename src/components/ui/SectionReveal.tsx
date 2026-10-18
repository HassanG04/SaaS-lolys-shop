import { useEffect, useRef, useState, type ReactNode } from 'react'
import { isMotionReduced } from '../../lib/motion'

export interface SectionRevealProps {
  children: ReactNode
  className?: string
  replayKey?: string | number
}

function shouldSkipMotion() {
  return typeof window === 'undefined' || isMotionReduced() || !('IntersectionObserver' in window)
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

    const handleMotion = () => {
      if (shouldSkipMotion()) {
        setIsVisible(true)
      }
    }
    window.addEventListener('motionchange', handleMotion)

    const el = ref.current
    if (!el) {
      window.removeEventListener('motionchange', handleMotion)
      return
    }

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
    return () => {
      observer.disconnect()
      window.removeEventListener('motionchange', handleMotion)
    }
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

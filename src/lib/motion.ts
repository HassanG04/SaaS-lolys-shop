import { useEffect, useState } from 'react'

export type MotionSetting = 'full' | 'reduced' | 'system'
export type EffectiveMotion = 'full' | 'reduced'

export const MOTION_STORAGE_KEY = 'motion'

function resolveEffectiveMotion(setting: MotionSetting): EffectiveMotion {
  if (setting === 'reduced') return 'reduced'
  if (setting === 'system') {
    return typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      ? 'reduced'
      : 'full'
  }
  return 'full'
}

export function getMotionSetting(): MotionSetting {
  if (typeof document !== 'undefined') {
    const attr = document.documentElement.dataset.motionSetting
    if (attr === 'full' || attr === 'reduced' || attr === 'system') {
      return attr
    }
  }
  try {
    const stored = localStorage.getItem(MOTION_STORAGE_KEY)
    if (stored === 'full' || stored === 'reduced' || stored === 'system') {
      return stored
    }
  } catch {
    /* Storage disabled or inaccessible */
  }
  return 'full'
}

export function isMotionReduced(): boolean {
  if (typeof document === 'undefined') return false
  const motion = document.documentElement.dataset.motion
  if (motion === 'reduced') return true
  if (motion === 'full') return false
  return resolveEffectiveMotion(getMotionSetting()) === 'reduced'
}

export function setMotionSetting(setting: MotionSetting): void {
  try {
    localStorage.setItem(MOTION_STORAGE_KEY, setting)
  } catch {
    /* Storage disabled or inaccessible */
  }

  if (typeof document !== 'undefined') {
    const effective = resolveEffectiveMotion(setting)
    document.documentElement.dataset.motionSetting = setting
    document.documentElement.dataset.motion = effective
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('motionchange', {
          detail: { setting, effective },
        }),
      )
    }
  }
}

export function initMotion(): () => void {
  if (typeof window === 'undefined') return () => {}

  const sync = () => {
    const setting = getMotionSetting()
    const effective = resolveEffectiveMotion(setting)
    document.documentElement.dataset.motionSetting = setting
    document.documentElement.dataset.motion = effective
    window.dispatchEvent(
      new CustomEvent('motionchange', {
        detail: { setting, effective },
      }),
    )
  }

  // Ensure initial attributes match
  sync()

  const media = window.matchMedia?.('(prefers-reduced-motion: reduce)')
  const handleMediaChange = () => {
    if (getMotionSetting() === 'system') {
      sync()
    }
  }

  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === MOTION_STORAGE_KEY || e.key === null) {
      sync()
    }
  }

  media?.addEventListener?.('change', handleMediaChange)
  window.addEventListener('storage', handleStorageChange)

  return () => {
    media?.removeEventListener?.('change', handleMediaChange)
    window.removeEventListener('storage', handleStorageChange)
  }
}

export function useMotionSetting() {
  const [setting, setSettingState] = useState<MotionSetting>(getMotionSetting)
  const [isReduced, setIsReduced] = useState<boolean>(isMotionReduced)

  useEffect(() => {
    const handleUpdate = () => {
      setSettingState(getMotionSetting())
      setIsReduced(isMotionReduced())
    }
    window.addEventListener('motionchange', handleUpdate)
    window.addEventListener('storage', handleUpdate)
    return () => {
      window.removeEventListener('motionchange', handleUpdate)
      window.removeEventListener('storage', handleUpdate)
    }
  }, [])

  const updateSetting = (next: MotionSetting) => {
    setMotionSetting(next)
    setSettingState(next)
    setIsReduced(isMotionReduced())
  }

  return {
    setting,
    setSetting: updateSetting,
    isReduced,
  }
}

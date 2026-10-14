import { useCallback, useEffect, useState } from 'react'
import * as authApi from './api'
import { useAuth } from './AuthProvider'
import type { AuthActionResult, AuthErrorCode } from './types'

// In-memory timestamp and callback storage only (NEVER written to localStorage, sessionStorage, or cookies)
let inMemoryStepUpTimestamp: number | null = null
let inMemoryPendingAction: (() => void) | null = null

export const STEP_UP_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

export function isStepUpActive(): boolean {
  if (inMemoryStepUpTimestamp === null) return false
  return Date.now() - inMemoryStepUpTimestamp < STEP_UP_TIMEOUT_MS
}

export function setStepUpConfirmedMemory(): void {
  inMemoryStepUpTimestamp = Date.now()
}

export function clearStepUpMemory(): void {
  inMemoryStepUpTimestamp = null
  inMemoryPendingAction = null
}

export function useStepUp() {
  const { factors, refreshFactors } = useAuth()
  const [isConfirmed, setIsConfirmed] = useState<boolean>(() => isStepUpActive())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [errorCode, setErrorCode] = useState<AuthErrorCode | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)

  // Sync state with memory validity periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setIsConfirmed(isStepUpActive())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const openStepUp = useCallback((onSuccess?: () => void) => {
    setErrorCode('ADM-003')
    if (onSuccess) {
      inMemoryPendingAction = onSuccess
      setPendingAction(() => onSuccess)
    }
    setDialogOpen(true)
  }, [])

  const closeStepUp = useCallback(() => {
    setDialogOpen(false)
    setPendingAction(null)
    inMemoryPendingAction = null
    setErrorCode(null)
  }, [])

  const confirmStepUp = useCallback(
    async (code: string): Promise<AuthActionResult> => {
      if (code.trim().length !== 6) {
        setErrorCode('AUTH-006')
        return { success: false, code: 'AUTH-006' }
      }

      setSubmitting(true)
      setErrorCode(null)

      try {
        let currentFactors = factors
        if (currentFactors.length === 0) {
          currentFactors = await refreshFactors()
        }

        const targetFactor =
          currentFactors.find((f) => f.status === 'verified') || currentFactors[0]
        if (!targetFactor) {
          setErrorCode('AUTH-005')
          return { success: false, code: 'AUTH-005' }
        }

        const result = await authApi.challengeAndVerifyApi(targetFactor.id, code.trim())
        if (result.success) {
          setStepUpConfirmedMemory()
          setIsConfirmed(true)
          setDialogOpen(false)

          if (inMemoryPendingAction) {
            const cb = inMemoryPendingAction
            inMemoryPendingAction = null
            cb()
          } else if (pendingAction) {
            const cb = pendingAction
            setPendingAction(null)
            cb()
          }

          return { success: true }
        } else {
          setErrorCode(result.code || 'AUTH-006')
          return result
        }
      } catch {
        setErrorCode('AUTH-006')
        return { success: false, code: 'AUTH-006' }
      } finally {
        setSubmitting(false)
      }
    },
    [factors, pendingAction, refreshFactors],
  )

  const withStepUp = useCallback(
    <T>(action: () => T | Promise<T>): Promise<T | null> => {
      if (isStepUpActive()) {
        setIsConfirmed(true)
        return Promise.resolve(action())
      }

      return new Promise<T | null>((resolve) => {
        openStepUp(async () => {
          try {
            const result = await action()
            resolve(result)
          } catch {
            resolve(null)
          }
        })
      })
    },
    [openStepUp],
  )

  return {
    isConfirmed,
    dialogOpen,
    errorCode,
    submitting,
    openStepUp,
    closeStepUp,
    confirmStepUp,
    withStepUp,
    resetStepUp: clearStepUpMemory,
  }
}

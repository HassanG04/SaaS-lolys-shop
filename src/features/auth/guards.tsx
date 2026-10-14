import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { PearlLoader } from '../../components/ui/PearlLoader'
import { AuthAlert } from './authErrors'
import { useAuth } from './AuthProvider'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div
        role="status"
        aria-label="Loading authentication"
        className="flex h-64 w-full items-center justify-center text-(--color-brand)"
      >
        <PearlLoader loading />
      </div>
    )
  }

  if (!user) {
    const redirectTarget = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?redirect=${redirectTarget}`} replace />
  }

  return <>{children}</>
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, role, aal, factors, loading, loadingFactors } = useAuth()
  const location = useLocation()

  if (loading || loadingFactors) {
    return (
      <div
        role="status"
        aria-label="Loading admin authorization"
        className="flex h-64 w-full items-center justify-center text-brand"
      >
        <PearlLoader loading />
      </div>
    )
  }

  if (!user) {
    const redirectTarget = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?redirect=${redirectTarget}`} replace />
  }

  if (role !== 'admin') {
    return (
      <div className="mx-auto max-w-lg p-6 space-y-4 text-center">
        <AuthAlert code="AUTH-011" />
      </div>
    )
  }

  const currentPath = location.pathname
  const isEnrollPath = currentPath.includes('/admin/mfa/enroll')
  const isChallengePath = currentPath.includes('/admin/mfa/challenge')

  // Ladder step 1: If no TOTP factors are enrolled, must enroll first
  if (factors.length === 0) {
    if (!isEnrollPath) {
      return <Navigate to="/admin/mfa/enroll" replace />
    }
    return <>{children}</>
  }

  // Ladder step 2: If enrolled but current session is aal1, must challenge
  if (aal !== 'aal2') {
    if (!isChallengePath) {
      return <Navigate to="/admin/mfa/challenge" replace />
    }
    return <>{children}</>
  }

  // Ladder step 3: If already aal2, leave mfa pages
  if (isEnrollPath || isChallengePath) {
    return <Navigate to="/admin" replace />
  }

  return <>{children}</>
}

export function RequireGuest({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div
        role="status"
        aria-label="Loading guest state"
        className="flex h-64 w-full items-center justify-center text-(--color-brand)"
      >
        <PearlLoader loading />
      </div>
    )
  }

  if (user) {
    const params = new URLSearchParams(location.search)
    const redirectTo = params.get('redirect') || '/'
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}

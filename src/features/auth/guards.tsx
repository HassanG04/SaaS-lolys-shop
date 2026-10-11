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
  const { user, role, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div
        role="status"
        aria-label="Loading admin authorization"
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

  if (role !== 'admin') {
    return (
      <div className="mx-auto max-w-lg p-6 space-y-4 text-center">
        <AuthAlert code="AUTH-011" />
      </div>
    )
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

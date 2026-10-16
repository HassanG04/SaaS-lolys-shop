import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { queryClient } from '../../lib/queryClient'
import { supabase } from '../../lib/supabase'
import { fetchProfileApi, fetchAalApi, fetchFactorsApi, signOutApi } from './session.api'

const loadAuthApi = () => import('./api')
import type {
  AalLevel,
  AuthActionResult,
  AuthContextValue,
  AuthErrorCode,
  MfaEnrollResult,
  MfaFactor,
  ResendConfirmationCredentials,
  ResetPasswordCredentials,
  SignInCredentials,
  SignUpCredentials,
  UserProfile,
  UserRole,
} from './types'

export const ADMIN_IDLE_TIMEOUT_MS = 20 * 60 * 1000

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [role, setRole] = useState<UserRole>('customer')
  const [aal, setAal] = useState<AalLevel>('aal1')
  const [factors, setFactors] = useState<MfaFactor[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingFactors, setLoadingFactors] = useState(true)

  const loadUserData = useCallback(async (activeUser: User | null) => {
    if (!activeUser) {
      setProfile(null)
      setRole('customer')
      setAal('aal1')
      setFactors([])
      setLoadingFactors(false)
      return
    }

    setLoadingFactors(true)
    const [userProfile, currentAal, currentFactors] = await Promise.all([
      fetchProfileApi(activeUser.id),
      fetchAalApi(),
      fetchFactorsApi(),
    ])

    setProfile(userProfile)
    setRole(userProfile?.role || 'customer')
    setAal(currentAal)
    setFactors(currentFactors)
    setLoadingFactors(false)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) {
      await loadUserData(user)
    }
  }, [user, loadUserData])

  const refreshAal = useCallback(async (): Promise<AalLevel> => {
    const currentAal = await fetchAalApi()
    setAal(currentAal)
    return currentAal
  }, [])

  const refreshFactors = useCallback(async (): Promise<MfaFactor[]> => {
    const list = await fetchFactorsApi()
    setFactors(list)
    return list
  }, [])

  useEffect(() => {
    let isMounted = true
    let authRefreshTimer: ReturnType<typeof setTimeout> | undefined

    // Initial session retrieval
    void supabase.auth
      .getSession()
      .then(async ({ data: { session: initialSession } }) => {
        if (!isMounted) return
        setSession(initialSession)
        setUser(initialSession?.user ?? null)
        if (initialSession?.user) {
          await loadUserData(initialSession.user)
        } else {
          setLoadingFactors(false)
        }
      })
      .catch(() => {
        if (isMounted) setLoadingFactors(false)
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    // Subscribe to ongoing auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!isMounted) return
      setSession(newSession)
      setUser(newSession?.user ?? null)
      // Auth notifications run inside the SDK lock. Fetching Auth data here and
      // awaiting it deadlocks MFA verification; refresh after the callback returns.
      clearTimeout(authRefreshTimer)
      authRefreshTimer = setTimeout(() => {
        if (!isMounted) return
        void loadUserData(newSession?.user ?? null).finally(() => {
          if (isMounted) setLoading(false)
        })
      }, 0)
    })

    return () => {
      isMounted = false
      clearTimeout(authRefreshTimer)
      subscription.unsubscribe()
    }
  }, [loadUserData])

  const signIn = useCallback(
    async (credentials: SignInCredentials): Promise<AuthActionResult> => {
      const { signInApi } = await loadAuthApi()
      const result = await signInApi(credentials)
      if (result.success) {
        const {
          data: { session: newSession },
        } = await supabase.auth.getSession()
        setSession(newSession)
        setUser(newSession?.user ?? null)
        if (newSession?.user) {
          await loadUserData(newSession.user)
        }
      }
      return result
    },
    [loadUserData],
  )

  const signUp = useCallback(
    async (c: SignUpCredentials): Promise<AuthActionResult> => (await loadAuthApi()).signUpApi(c),
    [],
  )

  const resetPassword = useCallback(
    async (c: ResetPasswordCredentials): Promise<AuthActionResult> =>
      (await loadAuthApi()).resetPasswordApi(c),
    [],
  )

  const resendConfirmation = useCallback(
    async (c: ResendConfirmationCredentials): Promise<AuthActionResult> =>
      (await loadAuthApi()).resendConfirmationApi(c),
    [],
  )

  const signOut = useCallback(
    async (options?: { scope?: 'global' | 'local' | 'others' }): Promise<void> => {
      await signOutApi(options)
      setSession(null)
      setUser(null)
      setProfile(null)
      setRole('customer')
      setAal('aal1')
      setFactors([])
    },
    [],
  )

  const updatePassword = useCallback(
    async (p: string): Promise<AuthActionResult> => (await loadAuthApi()).updatePasswordApi(p),
    [],
  )

  const updateEmail = useCallback(
    async (e: string): Promise<AuthActionResult> => (await loadAuthApi()).updateEmailApi(e),
    [],
  )

  // Admin sessions time out after 20 idle minutes: sign out and clear caches
  useEffect(() => {
    if (role !== 'admin') return

    let timeoutId: ReturnType<typeof setTimeout>

    const resetTimer = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        queryClient.clear()
        void signOut()
      }, ADMIN_IDLE_TIMEOUT_MS)
    }

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    events.forEach((event) => window.addEventListener(event, resetTimer, { passive: true }))
    resetTimer()

    return () => {
      clearTimeout(timeoutId)
      events.forEach((event) => window.removeEventListener(event, resetTimer))
    }
  }, [role, signOut])

  const enrollTotp = useCallback(
    async (friendlyName?: string): Promise<{ data?: MfaEnrollResult; error?: AuthErrorCode }> => {
      const res = await (await loadAuthApi()).enrollTotpApi(friendlyName)
      if (res.data) await refreshFactors()
      return res
    },
    [refreshFactors],
  )

  const challengeAndVerify = useCallback(
    async (factorId: string, code: string): Promise<AuthActionResult> => {
      const res = await (await loadAuthApi()).challengeAndVerifyApi(factorId, code)
      if (res.success) {
        await refreshAal()
        await refreshFactors()
      }
      return res
    },
    [refreshAal, refreshFactors],
  )

  const unenrollFactor = useCallback(
    async (factorId: string): Promise<AuthActionResult> => {
      const res = await (await loadAuthApi()).unenrollFactorApi(factorId)
      if (res.success) {
        await refreshFactors()
        await refreshAal()
      }
      return res
    },
    [refreshFactors, refreshAal],
  )

  const value: AuthContextValue = {
    user,
    session,
    profile,
    role,
    aal,
    factors,
    loading,
    loadingFactors,
    signIn,
    signUp,
    resetPassword,
    resendConfirmation,
    signOut,
    refreshProfile,
    refreshAal,
    refreshFactors,
    enrollTotp,
    challengeAndVerify,
    unenrollFactor,
    updatePassword,
    updateEmail,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useOptionalAuth(): AuthContextValue | null {
  return useContext(AuthContext)
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function useAal() {
  const { aal, factors, loadingFactors, refreshAal, refreshFactors } = useAuth()
  return {
    aal,
    isAal2: aal === 'aal2',
    factors,
    loadingFactors,
    hasEnrolledFactors: factors.length > 0,
    refreshAal,
    refreshFactors,
  }
}

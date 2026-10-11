import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import * as authApi from './api'
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
      authApi.fetchProfileApi(activeUser.id),
      authApi.fetchAalApi(),
      authApi.fetchFactorsApi(),
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
    const currentAal = await authApi.fetchAalApi()
    setAal(currentAal)
    return currentAal
  }, [])

  const refreshFactors = useCallback(async (): Promise<MfaFactor[]> => {
    const list = await authApi.fetchFactorsApi()
    setFactors(list)
    return list
  }, [])

  useEffect(() => {
    let isMounted = true

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
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) return
      setSession(newSession)
      setUser(newSession?.user ?? null)
      if (newSession?.user) {
        await loadUserData(newSession.user)
      } else {
        setProfile(null)
        setRole('customer')
        setAal('aal1')
        setFactors([])
        setLoadingFactors(false)
      }
      setLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [loadUserData])

  const signIn = useCallback(
    async (credentials: SignInCredentials): Promise<AuthActionResult> => {
      const result = await authApi.signInApi(credentials)
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

  const signUp = useCallback(async (credentials: SignUpCredentials): Promise<AuthActionResult> => {
    return authApi.signUpApi(credentials)
  }, [])

  const resetPassword = useCallback(
    async (credentials: ResetPasswordCredentials): Promise<AuthActionResult> => {
      return authApi.resetPasswordApi(credentials)
    },
    [],
  )

  const resendConfirmation = useCallback(
    async (credentials: ResendConfirmationCredentials): Promise<AuthActionResult> => {
      return authApi.resendConfirmationApi(credentials)
    },
    [],
  )

  const signOut = useCallback(async (): Promise<void> => {
    await authApi.signOutApi()
    setSession(null)
    setUser(null)
    setProfile(null)
    setRole('customer')
    setAal('aal1')
    setFactors([])
  }, [])

  const enrollTotp = useCallback(
    async (friendlyName?: string): Promise<{ data?: MfaEnrollResult; error?: AuthErrorCode }> => {
      const result = await authApi.enrollTotpApi(friendlyName)
      if (result.data) {
        await refreshFactors()
      }
      return result
    },
    [refreshFactors],
  )

  const challengeAndVerify = useCallback(
    async (factorId: string, code: string): Promise<AuthActionResult> => {
      const result = await authApi.challengeAndVerifyApi(factorId, code)
      if (result.success) {
        await refreshAal()
        await refreshFactors()
      }
      return result
    },
    [refreshAal, refreshFactors],
  )

  const unenrollFactor = useCallback(
    async (factorId: string): Promise<AuthActionResult> => {
      const result = await authApi.unenrollFactorApi(factorId)
      if (result.success) {
        await refreshFactors()
        await refreshAal()
      }
      return result
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
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
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

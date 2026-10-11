import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import * as authApi from './api'
import type {
  AalLevel,
  AuthActionResult,
  AuthContextValue,
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
  const [loading, setLoading] = useState(true)

  const loadUserData = useCallback(async (activeUser: User | null) => {
    if (!activeUser) {
      setProfile(null)
      setRole('customer')
      setAal('aal1')
      return
    }

    const [userProfile, currentAal] = await Promise.all([
      authApi.fetchProfileApi(activeUser.id),
      authApi.fetchAalApi(),
    ])

    setProfile(userProfile)
    setRole(userProfile?.role || 'customer')
    setAal(currentAal)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) {
      await loadUserData(user)
    }
  }, [user, loadUserData])

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
        }
      })
      .catch(() => {
        // network or initialization error handled gracefully
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
  }, [])

  const value: AuthContextValue = {
    user,
    session,
    profile,
    role,
    aal,
    loading,
    signIn,
    signUp,
    resetPassword,
    resendConfirmation,
    signOut,
    refreshProfile,
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

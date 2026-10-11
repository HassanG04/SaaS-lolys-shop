import { supabase } from '../../lib/supabase'
import { getAuthMessage, mapAuthError } from './authErrors'
import type {
  AalLevel,
  AuthActionResult,
  ResendConfirmationCredentials,
  ResetPasswordCredentials,
  SignInCredentials,
  SignUpCredentials,
  UserProfile,
} from './types'

/**
 * Signs in a user using email and password with generic, bot-resistant error masking.
 */
export async function signInApi(credentials: SignInCredentials): Promise<AuthActionResult> {
  const { email, password, captchaToken } = credentials

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined,
    })

    if (error) {
      const code = mapAuthError(error)
      return { success: false, code, message: getAuthMessage(code) }
    }

    return { success: true }
  } catch (err) {
    const code = mapAuthError(err)
    return { success: false, code, message: getAuthMessage(code) }
  }
}

/**
 * Registers a new account. Always returns neutral AUTH-010 unless Turnstile or password validation fails.
 */
export async function signUpApi(credentials: SignUpCredentials): Promise<AuthActionResult> {
  const { email, password, fullName, captchaToken } = credentials

  if (password.length < 10) {
    return { success: false, code: 'AUTH-008', message: getAuthMessage('AUTH-008') }
  }

  try {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        captchaToken,
        data: fullName ? { full_name: fullName } : undefined,
      },
    })

    if (error) {
      const mapped = mapAuthError(error)
      if (mapped === 'AUTH-003') {
        return { success: false, code: 'AUTH-003', message: getAuthMessage('AUTH-003') }
      }
      // Neutral response on existing email or standard sign-up outcome
      return { success: true, code: 'AUTH-010', message: getAuthMessage('AUTH-010') }
    }

    return { success: true, code: 'AUTH-010', message: getAuthMessage('AUTH-010') }
  } catch (err) {
    const mapped = mapAuthError(err)
    if (mapped === 'AUTH-003') {
      return { success: false, code: 'AUTH-003', message: getAuthMessage('AUTH-003') }
    }
    return { success: true, code: 'AUTH-010', message: getAuthMessage('AUTH-010') }
  }
}

/**
 * Sends a password reset email. Always returns neutral AUTH-010 for enumeration protection.
 */
export async function resetPasswordApi(
  credentials: ResetPasswordCredentials,
): Promise<AuthActionResult> {
  const { email, captchaToken } = credentials

  try {
    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/reset-password`
        : 'http://localhost:5173/reset-password'

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      captchaToken,
      redirectTo,
    })

    if (error) {
      const mapped = mapAuthError(error)
      if (mapped === 'AUTH-003') {
        return { success: false, code: 'AUTH-003', message: getAuthMessage('AUTH-003') }
      }
    }

    return { success: true, code: 'AUTH-010', message: getAuthMessage('AUTH-010') }
  } catch (err) {
    const mapped = mapAuthError(err)
    if (mapped === 'AUTH-003') {
      return { success: false, code: 'AUTH-003', message: getAuthMessage('AUTH-003') }
    }
    return { success: true, code: 'AUTH-010', message: getAuthMessage('AUTH-010') }
  }
}

/**
 * Resends the account email confirmation. Always returns neutral AUTH-010.
 */
export async function resendConfirmationApi(
  credentials: ResendConfirmationCredentials,
): Promise<AuthActionResult> {
  const { email, captchaToken } = credentials

  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: captchaToken ? { captchaToken } : undefined,
    })

    if (error) {
      const mapped = mapAuthError(error)
      if (mapped === 'AUTH-003') {
        return { success: false, code: 'AUTH-003', message: getAuthMessage('AUTH-003') }
      }
    }

    return { success: true, code: 'AUTH-010', message: getAuthMessage('AUTH-010') }
  } catch (err) {
    const mapped = mapAuthError(err)
    if (mapped === 'AUTH-003') {
      return { success: false, code: 'AUTH-003', message: getAuthMessage('AUTH-003') }
    }
    return { success: true, code: 'AUTH-010', message: getAuthMessage('AUTH-010') }
  }
}

/**
 * Signs out the current session.
 */
export async function signOutApi(): Promise<void> {
  await supabase.auth.signOut()
}

/**
 * Fetches the user profile from public.profiles.
 */
export async function fetchProfileApi(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, role, full_name, phone, governorate_id, city, address')
      .eq('id', userId)
      .maybeSingle()

    if (error || !data) return null
    return {
      id: data.id,
      role: (data.role as 'admin' | 'customer') || 'customer',
      full_name: data.full_name,
      phone: data.phone,
      governorate_id: data.governorate_id,
      city: data.city,
      address: data.address,
    }
  } catch {
    return null
  }
}

/**
 * Reads the current session Authenticator Assurance Level (aal1 or aal2).
 */
export async function fetchAalApi(): Promise<AalLevel> {
  try {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (error || !data) return 'aal1'
    return data.currentLevel === 'aal2' ? 'aal2' : 'aal1'
  } catch {
    return 'aal1'
  }
}

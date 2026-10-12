import { supabase } from '../../lib/supabase'
import { getAuthMessage, mapAuthError } from './authErrors'
import type {
  AalLevel,
  AuthActionResult,
  AuthErrorCode,
  MfaEnrollResult,
  MfaFactor,
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
 * Signs out the session, supporting global revocation across all devices.
 */
export async function signOutApi(options?: {
  scope?: 'global' | 'local' | 'others'
}): Promise<void> {
  await supabase.auth.signOut(options)
}

/**
 * Fetches the user profile from public.profiles.
 */
export async function fetchProfileApi(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(
        'id, role, full_name, phone, alt_phone, governorate_id, city, district, address, floor, apartment, landmark',
      )
      .eq('id', userId)
      .maybeSingle()

    if (error || !data) return null
    return {
      ...data,
      role: (data.role as 'admin' | 'customer') || 'customer',
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

/**
 * Fetches all enrolled TOTP factors for the current user.
 */
export async function fetchFactorsApi(): Promise<MfaFactor[]> {
  try {
    const { data, error } = await supabase.auth.mfa.listFactors()
    if (error || !data) return []
    return (data.totp || []).map((f) => ({
      id: f.id,
      friendly_name: f.friendly_name,
      factor_type: 'totp',
      status: f.status as 'verified' | 'unverified',
      created_at: f.created_at,
      updated_at: f.updated_at,
    }))
  } catch {
    return []
  }
}

/**
 * Enrolls a new TOTP factor returning QR code, manual key secret, and URI.
 */
export async function enrollTotpApi(
  friendlyName?: string,
): Promise<{ data?: MfaEnrollResult; error?: AuthErrorCode }> {
  try {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      issuer: "Lolys' Accessories",
      friendlyName,
    })
    if (error || !data) {
      const code = mapAuthError(error)
      return { error: code }
    }
    return {
      data: {
        id: data.id,
        type: 'totp',
        totp: {
          qr_code: data.totp.qr_code,
          secret: data.totp.secret,
          uri: data.totp.uri,
        },
      },
    }
  } catch (err) {
    const code = mapAuthError(err)
    return { error: code }
  }
}

/**
 * Challenges and verifies a 6-digit TOTP code, upgrading session to aal2 upon success.
 */
export async function challengeAndVerifyApi(
  factorId: string,
  code: string,
): Promise<AuthActionResult> {
  try {
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    })
    if (error) {
      return { success: false, code: 'AUTH-006', message: getAuthMessage('AUTH-006') }
    }
    return { success: true }
  } catch {
    return { success: false, code: 'AUTH-006', message: getAuthMessage('AUTH-006') }
  }
}

/**
 * Unenrolls a TOTP factor (requires session to be at aal2).
 */
export async function unenrollFactorApi(factorId: string): Promise<AuthActionResult> {
  try {
    const { error } = await supabase.auth.mfa.unenroll({ factorId })
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
 * Updates the authenticated user's password.
 * Requires recent sign-in; returns AUTH-007 if stale, AUTH-008 if under 10 chars.
 */
export async function updatePasswordApi(password: string): Promise<AuthActionResult> {
  if (password.length < 10) {
    return { success: false, code: 'AUTH-008', message: getAuthMessage('AUTH-008') }
  }

  try {
    const { error } = await supabase.auth.updateUser({ password })
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
 * Initiates an email change for the authenticated user.
 * Keeps Supabase "Secure email change" active and returns neutral AUTH-010.
 */
export async function updateEmailApi(email: string): Promise<AuthActionResult> {
  try {
    const { error } = await supabase.auth.updateUser({ email })
    if (error) {
      const code = mapAuthError(error)
      if (code === 'AUTH-007' || code === 'AUTH-002') {
        return { success: false, code, message: getAuthMessage(code) }
      }
    }
    return { success: true, code: 'AUTH-010', message: getAuthMessage('AUTH-010') }
  } catch (err) {
    const code = mapAuthError(err)
    if (code === 'AUTH-007' || code === 'AUTH-002') {
      return { success: false, code, message: getAuthMessage(code) }
    }
    return { success: true, code: 'AUTH-010', message: getAuthMessage('AUTH-010') }
  }
}

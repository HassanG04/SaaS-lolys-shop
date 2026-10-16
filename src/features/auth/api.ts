import { supabase } from '../../lib/supabase'
import type {
  AuthActionResult,
  AuthErrorCode,
  MfaEnrollResult,
  ResendConfirmationCredentials,
  ResetPasswordCredentials,
  SignInCredentials,
  SignUpCredentials,
} from './types'

async function resolveAuthError(err: unknown): Promise<{ code: AuthErrorCode; message: string }> {
  const { mapAuthError, getAuthMessage } = await import('./authErrors')
  const code = mapAuthError(err)
  return { code, message: getAuthMessage(code) }
}

async function resolveAuthMessage(code: AuthErrorCode): Promise<string> {
  const { getAuthMessage } = await import('./authErrors')
  return getAuthMessage(code)
}

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
      const { code, message } = await resolveAuthError(error)
      return { success: false, code, message }
    }

    return { success: true }
  } catch (err) {
    const { code, message } = await resolveAuthError(err)
    return { success: false, code, message }
  }
}

/**
 * Registers a new account. Always returns neutral AUTH-010 unless Turnstile or password validation fails.
 */
export async function signUpApi(credentials: SignUpCredentials): Promise<AuthActionResult> {
  const { email, password, fullName, captchaToken } = credentials

  if (password.length < 10) {
    const message = await resolveAuthMessage('AUTH-008')
    return { success: false, code: 'AUTH-008', message }
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        captchaToken,
        data: fullName ? { full_name: fullName } : undefined,
      },
    })

    if (error) {
      const { mapAuthError, getAuthMessage } = await import('./authErrors')
      const mapped = mapAuthError(error)
      return { success: false, code: mapped, message: getAuthMessage(mapped) }
    }

    // In Supabase Auth, when email is already registered, it returns an empty identities array
    if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      const { getAuthMessage } = await import('./authErrors')
      return { success: false, code: 'AUTH-015', message: getAuthMessage('AUTH-015') }
    }

    const message = await resolveAuthMessage('AUTH-010')
    return { success: true, code: 'AUTH-010', message }
  } catch (err) {
    const { mapAuthError, getAuthMessage } = await import('./authErrors')
    const mapped = mapAuthError(err)
    return { success: false, code: mapped, message: getAuthMessage(mapped) }
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
      const { mapAuthError, getAuthMessage } = await import('./authErrors')
      const mapped = mapAuthError(error)
      if (mapped === 'AUTH-003') {
        return { success: false, code: 'AUTH-003', message: getAuthMessage('AUTH-003') }
      }
    }

    const message = await resolveAuthMessage('AUTH-010')
    return { success: true, code: 'AUTH-010', message }
  } catch (err) {
    const { mapAuthError, getAuthMessage } = await import('./authErrors')
    const mapped = mapAuthError(err)
    if (mapped === 'AUTH-003') {
      return { success: false, code: 'AUTH-003', message: getAuthMessage('AUTH-003') }
    }
    const message = await resolveAuthMessage('AUTH-010')
    return { success: true, code: 'AUTH-010', message }
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
      const { mapAuthError, getAuthMessage } = await import('./authErrors')
      const mapped = mapAuthError(error)
      if (mapped === 'AUTH-003') {
        return { success: false, code: 'AUTH-003', message: getAuthMessage('AUTH-003') }
      }
    }

    const message = await resolveAuthMessage('AUTH-010')
    return { success: true, code: 'AUTH-010', message }
  } catch (err) {
    const { mapAuthError, getAuthMessage } = await import('./authErrors')
    const mapped = mapAuthError(err)
    if (mapped === 'AUTH-003') {
      return { success: false, code: 'AUTH-003', message: getAuthMessage('AUTH-003') }
    }
    const message = await resolveAuthMessage('AUTH-010')
    return { success: true, code: 'AUTH-010', message }
  }
}

import * as self from './api'
import { setApiDelegate } from './session.api'

export { signOutApi, fetchProfileApi, fetchAalApi, fetchFactorsApi } from './session.api'

setApiDelegate(self)

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
      const { mapAuthError } = await import('./authErrors')
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
    const { mapAuthError } = await import('./authErrors')
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
      const message = await resolveAuthMessage('AUTH-006')
      return { success: false, code: 'AUTH-006', message }
    }
    return { success: true }
  } catch {
    const message = await resolveAuthMessage('AUTH-006')
    return { success: false, code: 'AUTH-006', message }
  }
}

/**
 * Unenrolls a TOTP factor (requires session to be at aal2).
 */
export async function unenrollFactorApi(factorId: string): Promise<AuthActionResult> {
  try {
    const { error } = await supabase.auth.mfa.unenroll({ factorId })
    if (error) {
      const { code, message } = await resolveAuthError(error)
      return { success: false, code, message }
    }
    return { success: true }
  } catch (err) {
    const { code, message } = await resolveAuthError(err)
    return { success: false, code, message }
  }
}

/**
 * Updates the authenticated user's password.
 * Requires recent sign-in; returns AUTH-007 if stale, AUTH-008 if under 10 chars.
 */
export async function updatePasswordApi(password: string): Promise<AuthActionResult> {
  if (password.length < 10) {
    const message = await resolveAuthMessage('AUTH-008')
    return { success: false, code: 'AUTH-008', message }
  }

  try {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      const { code, message } = await resolveAuthError(error)
      return { success: false, code, message }
    }
    return { success: true }
  } catch (err) {
    const { code, message } = await resolveAuthError(err)
    return { success: false, code, message }
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
      const errorResult = await resolveAuthError(error)
      if (errorResult.code === 'AUTH-007' || errorResult.code === 'AUTH-002') {
        return { success: false, code: errorResult.code, message: errorResult.message }
      }
    }
    const message = await resolveAuthMessage('AUTH-010')
    return { success: true, code: 'AUTH-010', message }
  } catch (err) {
    const errorResult = await resolveAuthError(err)
    if (errorResult.code === 'AUTH-007' || errorResult.code === 'AUTH-002') {
      return { success: false, code: errorResult.code, message: errorResult.message }
    }
    const message = await resolveAuthMessage('AUTH-010')
    return { success: true, code: 'AUTH-010', message }
  }
}

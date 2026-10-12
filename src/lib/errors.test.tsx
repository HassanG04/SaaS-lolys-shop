import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  AppError,
  toAppError,
  formatErrorMessage,
  generateErrorRef,
  ERROR_CATALOGUE,
  ErrorMessage,
  type ErrorCode,
} from './errors'
import { ErrorPanel } from '@/components/ui/ErrorPanel'
import { LanguageProvider } from '@/i18n/LanguageProvider'

describe('Error Framework (T-2.08)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('generateErrorRef', () => {
    it('generates an 8-character string', () => {
      const ref = generateErrorRef()
      expect(ref).toHaveLength(8)
      expect(/^[0-9a-z]{8}$/i.test(ref)).toBe(true)
    })
  })

  describe('Table-driven Catalogue Coverage', () => {
    const codes = Object.keys(ERROR_CATALOGUE) as ErrorCode[]

    it('catalogue contains all documented error codes', () => {
      expect(codes.length).toBeGreaterThanOrEqual(45)
    })

    it.each(codes)('code %s has a valid Arabic message without English text', (code) => {
      const message = ERROR_CATALOGUE[code]
      expect(message).toBeDefined()
      expect(message.trim().length).toBeGreaterThan(0)
      // Assert Arabic letters are present
      expect(/[\u0600-\u06FF]/.test(message)).toBe(true)
    })

    it('interpolates placeholders properly', () => {
      const msgLeft = formatErrorMessage('ORD-007', { name: 'عقد لؤلؤ', left: 2 })
      expect(msgLeft).toContain('عقد لؤلؤ')
      expect(msgLeft).toContain('2')

      const msgSys = formatErrorMessage('SYS-001', undefined, 'ab12cd34')
      expect(msgSys).toContain('ab12cd34')
    })
  })

  describe('toAppError Mapping', () => {
    it('returns the same AppError if already an AppError instance', () => {
      const original = new AppError('AUTH-001')
      const result = toAppError(original)
      expect(result).toBe(original)
    })

    it('maps string catalogue codes', () => {
      const err = toAppError('ORD-001')
      expect(err.code).toBe('ORD-001')
      expect(err.message).toBe(ERROR_CATALOGUE['ORD-001'])
    })

    it('maps database hint codes and extracts detail parameters', () => {
      const dbErr = {
        hint: 'ORD-007',
        detail: 'left=3',
        message: 'Insufficient stock in database',
      }
      const err = toAppError(dbErr)
      expect(err.code).toBe('ORD-007')
      expect(err.params?.left).toBe(3)
      expect(err.message).toContain('3')
    })

    it('maps database hint codes for abuse controls and admin', () => {
      expect(toAppError({ hint: 'SYS-003' }).code).toBe('SYS-003')
      expect(toAppError({ hint: 'ADM-001' }).code).toBe('ADM-001')
      expect(toAppError({ hint: 'ORD-010' }).code).toBe('ORD-010')
    })

    it('maps Supabase Auth error codes to catalogue codes', () => {
      expect(toAppError({ code: 'invalid_credentials' }).code).toBe('AUTH-001')
      expect(toAppError({ code: 'user_not_found' }).code).toBe('AUTH-001')
      expect(toAppError({ code: 'email_not_confirmed' }).code).toBe('AUTH-001')
      expect(toAppError({ code: 'over_request_rate_limit' }).code).toBe('AUTH-002')
      expect(toAppError({ code: 'captcha_failed' }).code).toBe('AUTH-003')
      expect(toAppError({ code: 'session_expired' }).code).toBe('AUTH-004')
      expect(toAppError({ code: 'insufficient_aal' }).code).toBe('AUTH-005')
      expect(toAppError({ code: 'mfa_verification_failed' }).code).toBe('AUTH-006')
      expect(toAppError({ code: 'reauthentication_needed' }).code).toBe('AUTH-007')
      expect(toAppError({ code: 'weak_password' }).code).toBe('AUTH-008')
      expect(toAppError({ code: 'otp_expired' }).code).toBe('AUTH-009')
      expect(toAppError({ code: 'user_already_exists' }).code).toBe('AUTH-010')
      expect(toAppError({ code: 'email_exists' }).code).toBe('AUTH-010')
      expect(toAppError({ code: 'over_email_send_rate_limit' }).code).toBe('AUTH-012')
      expect(toAppError({ code: '42501' }).code).toBe('AUTH-011')
    })

    it('maps HTTP statuses', () => {
      expect(toAppError({ status: 401 }).code).toBe('AUTH-004')
      expect(toAppError({ status: 403 }).code).toBe('AUTH-011')
      expect(toAppError({ status: 429 }).code).toBe('SYS-003')
      expect(toAppError({ status: 500 }).code).toBe('SYS-001')
      expect(toAppError({ status: 503 }).code).toBe('SYS-001')
    })

    it('maps network failures to SYS-002', () => {
      expect(toAppError(new TypeError('Failed to fetch')).code).toBe('SYS-002')
      expect(toAppError(new Error('NetworkError when attempting to fetch resource.')).code).toBe(
        'SYS-002',
      )
    })

    it('maps unmapped or unknown errors to SYS-001 with random ref', () => {
      const err = toAppError(new Error('SyntaxError: unexpected token < in JSON'))
      expect(err.code).toBe('SYS-001')
      expect(err.ref).toHaveLength(8)
      expect(err.message).toContain(err.ref)
    })

    it('logs details to console.error in development', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const err = new Error('Test dev log')
      toAppError(err)
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('[AppError SYS-001]'), err)
    })
  })

  describe('ErrorMessage Component and Raw Message Protection', () => {
    it('renders Arabic message, code, and ref for SYS-001', () => {
      const appErr = new AppError('SYS-001', { ref: 'deadbeef' })
      render(<ErrorMessage error={appErr} />)

      expect(screen.getByText(/حاول مرة أخرى أو تواصل معنا/)).toBeInTheDocument()
      expect(screen.getByText(/رمز الخطأ:\s*SYS-001/)).toBeInTheDocument()
      expect(screen.getAllByText(/رقم المرجع:\s*deadbeef/).length).toBeGreaterThanOrEqual(1)
    })

    it('renders Arabic message and code without ref for non-SYS-001 codes', () => {
      const appErr = new AppError('AUTH-001', { ref: 'ab12cd34' })
      render(<ErrorMessage error={appErr} />)

      expect(screen.getByText(ERROR_CATALOGUE['AUTH-001'])).toBeInTheDocument()
      expect(screen.getByText(/رمز الخطأ:\s*AUTH-001/)).toBeInTheDocument()
      expect(screen.queryByText(/رقم المرجع/)).not.toBeInTheDocument()
    })

    it('proves raw English error messages NEVER reach the DOM', () => {
      const sensitiveLeak = 'PG_EXCEPTION: relation "secret_users" does not exist'
      const rawError = new Error(sensitiveLeak)

      const { container } = render(
        <LanguageProvider>
          <ErrorPanel error={rawError} />
        </LanguageProvider>,
      )

      // Raw English message must NEVER exist in the document
      expect(container.textContent).not.toContain(sensitiveLeak)
      expect(container.textContent).not.toContain('secret_users')
      expect(container.textContent).not.toContain('PG_EXCEPTION')

      // Instead, generic Arabic message and SYS-001 code appear
      expect(screen.getAllByText(/حدث خطأ غير متوقع/).length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText(/رمز الخطأ:\s*SYS-001/)).toBeInTheDocument()
    })
  })
})

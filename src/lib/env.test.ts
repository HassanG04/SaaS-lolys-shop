import { describe, expect, it, beforeEach } from 'vitest'
import { envSchema, formatEnvError, getEnv, resetEnvCacheForTesting, validateEnv } from './env'

describe('env validation', () => {
  beforeEach(() => {
    resetEnvCacheForTesting()
  })

  const validEnv = {
    VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
    VITE_SUPABASE_ANON_KEY: 'test-anon-key-12345',
    VITE_TURNSTILE_SITE_KEY: '1x00000000000000000000AA',
  }

  it('validates a complete and correct environment config', () => {
    const result = validateEnv(validEnv)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.VITE_SUPABASE_URL).toBe('http://127.0.0.1:54321')
      expect(result.data.VITE_SUPABASE_ANON_KEY).toBe('test-anon-key-12345')
      expect(result.data.VITE_TURNSTILE_SITE_KEY).toBe('1x00000000000000000000AA')
      expect(result.errors).toBeNull()
      expect(result.formattedMessage).toBeNull()
    }
  })

  it('returns readable failure messages when all variables are missing', () => {
    const result = validateEnv({})
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors).toHaveLength(3)
      expect(result.errors.some((e) => e.includes('VITE_SUPABASE_URL'))).toBe(true)
      expect(result.errors.some((e) => e.includes('VITE_SUPABASE_ANON_KEY'))).toBe(true)
      expect(result.errors.some((e) => e.includes('VITE_TURNSTILE_SITE_KEY'))).toBe(true)
      expect(result.formattedMessage).toContain('.env.example')
      expect(result.formattedMessage).toContain('npx supabase status')
    }
  })

  it('rejects an invalid URL for VITE_SUPABASE_URL', () => {
    const result = validateEnv({
      ...validEnv,
      VITE_SUPABASE_URL: 'not-a-valid-url',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.some((e) => e.includes('must be a valid URL'))).toBe(true)
    }
  })

  it('rejects an empty string for VITE_SUPABASE_ANON_KEY', () => {
    const result = validateEnv({
      ...validEnv,
      VITE_SUPABASE_ANON_KEY: '',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.some((e) => e.includes('VITE_SUPABASE_ANON_KEY'))).toBe(true)
    }
  })

  it('rejects an empty string for VITE_TURNSTILE_SITE_KEY', () => {
    const result = validateEnv({
      ...validEnv,
      VITE_TURNSTILE_SITE_KEY: '',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.some((e) => e.includes('VITE_TURNSTILE_SITE_KEY'))).toBe(true)
    }
  })

  it('formatEnvError formats issues into actionable guidance', () => {
    const formatted = formatEnvError(['test error 1', 'test error 2'])
    expect(formatted).toContain('Missing or invalid environment configuration:')
    expect(formatted).toContain('- test error 1')
    expect(formatted).toContain('- test error 2')
    expect(formatted).toContain('.env.example')
  })

  it('getEnv returns cached data on repeated calls', () => {
    const env1 = getEnv(validEnv)
    const env2 = getEnv()
    expect(env1).toEqual(validEnv)
    expect(env2).toEqual(validEnv)
  })

  it('getEnv throws a readable error when env is invalid', () => {
    expect(() => getEnv({})).toThrow(/Missing or invalid environment configuration/)
  })

  it('envSchema directly parses valid object', () => {
    const parsed = envSchema.parse(validEnv)
    expect(parsed).toEqual(validEnv)
  })
})

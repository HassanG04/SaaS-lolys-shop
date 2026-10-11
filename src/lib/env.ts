import { z } from 'zod'

export const envSchema = z.object({
  VITE_SUPABASE_URL: z
    .string({ error: 'VITE_SUPABASE_URL is required' })
    .min(1, 'VITE_SUPABASE_URL cannot be empty')
    .url('VITE_SUPABASE_URL must be a valid URL (e.g. http://127.0.0.1:54321)'),
  VITE_SUPABASE_ANON_KEY: z
    .string({ error: 'VITE_SUPABASE_ANON_KEY is required' })
    .min(1, 'VITE_SUPABASE_ANON_KEY cannot be empty'),
  VITE_TURNSTILE_SITE_KEY: z
    .string({ error: 'VITE_TURNSTILE_SITE_KEY is required' })
    .min(1, 'VITE_TURNSTILE_SITE_KEY cannot be empty'),
})

export type Env = z.infer<typeof envSchema>

export interface EnvValidationSuccess {
  success: true
  data: Env
  errors: null
  formattedMessage: null
}

export interface EnvValidationFailure {
  success: false
  data: null
  errors: string[]
  formattedMessage: string
}

export type EnvValidationResult = EnvValidationSuccess | EnvValidationFailure

export function formatEnvError(errors: string[]): string {
  return [
    'Missing or invalid environment configuration:',
    ...errors.map((err) => `  - ${err}`),
    '',
    'Please copy .env.example to .env and configure all required variables.',
    'For local development, run "npx supabase status" to find your local Supabase URL and anon key.',
  ].join('\n')
}

export function validateEnv(raw?: Record<string, unknown>): EnvValidationResult {
  const envToValidate = raw ?? (import.meta.env as unknown as Record<string, unknown>)
  const result = envSchema.safeParse(envToValidate)

  if (result.success) {
    return {
      success: true,
      data: result.data,
      errors: null,
      formattedMessage: null,
    }
  }

  const errors = result.error.issues.map((issue) => {
    const field = issue.path.join('.')
    return `${field}: ${issue.message}`
  })

  return {
    success: false,
    data: null,
    errors,
    formattedMessage: formatEnvError(errors),
  }
}

let cachedEnv: Env | null = null

export function getEnv(raw?: Record<string, unknown>): Env {
  if (!raw && cachedEnv) {
    return cachedEnv
  }

  const result = validateEnv(raw)
  if (!result.success) {
    throw new Error(result.formattedMessage)
  }

  cachedEnv = result.data
  return cachedEnv
}

export function resetEnvCacheForTesting(): void {
  cachedEnv = null
}

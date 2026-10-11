export interface Env {
  VITE_SUPABASE_URL: string
  VITE_SUPABASE_ANON_KEY: string
  VITE_TURNSTILE_SITE_KEY: string
}

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

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function validateEnv(raw?: Record<string, unknown>): EnvValidationResult {
  const envToValidate = raw ?? (import.meta.env as unknown as Record<string, unknown>)
  const errors: string[] = []

  const url = envToValidate.VITE_SUPABASE_URL
  if (url === undefined || url === null) {
    errors.push('VITE_SUPABASE_URL: VITE_SUPABASE_URL is required')
  } else if (typeof url !== 'string' || url.length === 0) {
    errors.push('VITE_SUPABASE_URL: VITE_SUPABASE_URL cannot be empty')
  } else if (!isValidUrl(url)) {
    errors.push(
      'VITE_SUPABASE_URL: VITE_SUPABASE_URL must be a valid URL (e.g. http://127.0.0.1:54321)',
    )
  }

  const anonKey = envToValidate.VITE_SUPABASE_ANON_KEY
  if (anonKey === undefined || anonKey === null) {
    errors.push('VITE_SUPABASE_ANON_KEY: VITE_SUPABASE_ANON_KEY is required')
  } else if (typeof anonKey !== 'string' || anonKey.length === 0) {
    errors.push('VITE_SUPABASE_ANON_KEY: VITE_SUPABASE_ANON_KEY cannot be empty')
  }

  const turnstileKey = envToValidate.VITE_TURNSTILE_SITE_KEY
  if (turnstileKey === undefined || turnstileKey === null) {
    errors.push('VITE_TURNSTILE_SITE_KEY: VITE_TURNSTILE_SITE_KEY is required')
  } else if (typeof turnstileKey !== 'string' || turnstileKey.length === 0) {
    errors.push('VITE_TURNSTILE_SITE_KEY: VITE_TURNSTILE_SITE_KEY cannot be empty')
  }

  if (errors.length === 0) {
    return {
      success: true,
      data: {
        VITE_SUPABASE_URL: url as string,
        VITE_SUPABASE_ANON_KEY: anonKey as string,
        VITE_TURNSTILE_SITE_KEY: turnstileKey as string,
      },
      errors: null,
      formattedMessage: null,
    }
  }

  return {
    success: false,
    data: null,
    errors,
    formattedMessage: formatEnvError(errors),
  }
}

export const envSchema = {
  parse(raw: unknown): Env {
    const res = validateEnv(raw as Record<string, unknown>)
    if (!res.success) {
      throw new Error(res.formattedMessage)
    }
    return res.data
  },
  safeParse(raw: unknown) {
    const res = validateEnv(raw as Record<string, unknown>)
    if (res.success) {
      return { success: true as const, data: res.data }
    }
    return {
      success: false as const,
      error: {
        issues: res.errors.map((issue) => {
          const [field, ...rest] = issue.split(': ')
          return { path: [field], message: rest.join(': ') }
        }),
      },
    }
  },
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

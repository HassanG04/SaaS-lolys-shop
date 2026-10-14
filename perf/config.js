/**
 * k6 Load Test Configuration & Staging Guard
 * Task: T-8.08 (Load and resilience test)
 */

// Production domains and identifiers that must NEVER be targeted by load tests
const FORBIDDEN_PRODUCTION_PATTERNS = [
  'lolys.pages.dev',
  'lolys.com',
  'production',
  'prod.',
  '-prod',
]

/**
 * Validates that the target URL is strictly non-production (staging or local only).
 * Throws a fatal exception if the URL resembles production.
 */
export function validateTargetUrl(url) {
  if (!url || typeof url !== 'string') {
    throw new Error('TARGET_URL must be a non-empty string pointing to staging or local stack')
  }

  const lower = url.toLowerCase()
  for (const pattern of FORBIDDEN_PRODUCTION_PATTERNS) {
    if (lower.includes(pattern)) {
      throw new Error(
        `STAGING GUARD VIOLATION: Target URL "${url}" appears to be production (matched "${pattern}"). ` +
          'Load testing is strictly prohibited against production. Use staging or local development only.',
      )
    }
  }

  return url.replace(/\/+$/, '')
}

// Safe environment accessor for both k6 runtime (__ENV) and Node.js (process.env)
const env =
  (typeof __ENV !== 'undefined' ? __ENV : typeof process !== 'undefined' ? process.env : {}) || {}

// Target URL resolution: Defaults to local Supabase stack
export const TARGET_URL = validateTargetUrl(
  env.TARGET_URL || env.STAGING_URL || 'http://127.0.0.1:54321',
)

// Public anonymous key for API requests
export const ANON_KEY =
  env.ANON_KEY ||
  env.STAGING_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODMyOTI4MDB9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

// Optional customer JWT token for authenticated operations
export const USER_TOKEN = env.USER_TOKEN || env.STAGING_USER_TOKEN || ''

/**
 * Common HTTP headers for Supabase REST API requests.
 */
export function getHeaders(token = USER_TOKEN) {
  const headers = {
    apikey: ANON_KEY,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  } else {
    headers.Authorization = `Bearer ${ANON_KEY}`
  }

  return headers
}

/**
 * Standard ramp profile simulating realistic traffic growth and stress.
 */
export const rampStages = [
  { duration: '30s', target: 10 }, // Ramp-up to 10 concurrent VUs
  { duration: '1m', target: 25 }, // Sustained realistic shopping traffic (25 VUs)
  { duration: '30s', target: 50 }, // Stress peak simulating promotional burst (50 VUs)
  { duration: '30s', target: 0 }, // Graceful ramp-down to 0 VUs
]

/**
 * Standard performance thresholds per T-8.08:
 * - p95 read latency under 800 ms
 * - Error rate under 1%
 */
export const thresholds = {
  http_req_duration: ['p(95)<800'],
  'http_req_duration{type:read}': ['p(95)<800'],
  http_req_failed: ['rate<0.01'],
}

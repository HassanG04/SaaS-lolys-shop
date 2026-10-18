import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const headersPath = path.join(projectRoot, 'public', '_headers')
const indexPath = path.join(projectRoot, 'index.html')

test('public/_headers contains required security headers', () => {
  assert.ok(fs.existsSync(headersPath), 'public/_headers must exist')
  const headersContent = fs.readFileSync(headersPath, 'utf8')

  assert.match(headersContent, /X-Frame-Options:\s*DENY/i, 'X-Frame-Options must be DENY')
  assert.match(
    headersContent,
    /X-Content-Type-Options:\s*nosniff/i,
    'X-Content-Type-Options must be nosniff',
  )
  assert.match(
    headersContent,
    /Referrer-Policy:\s*strict-origin-when-cross-origin/i,
    'Referrer-Policy must be strict-origin-when-cross-origin',
  )
  assert.match(
    headersContent,
    /Strict-Transport-Security:\s*max-age=\d+;\s*includeSubDomains;\s*preload/i,
    'Strict-Transport-Security must enforce HSTS with preload',
  )
  assert.match(
    headersContent,
    /Permissions-Policy:\s*camera=\(\),\s*microphone=\(\),\s*geolocation=\(\)/i,
    'Permissions-Policy must restrict sensitive features',
  )
})

test('public/_headers Content-Security-Policy hashes match every inline startup script', () => {
  assert.ok(fs.existsSync(headersPath), 'public/_headers must exist')
  assert.ok(fs.existsSync(indexPath), 'index.html must exist')

  const headersContent = fs.readFileSync(headersPath, 'utf8')
  const indexContent = fs.readFileSync(indexPath, 'utf8')

  // Check CSP directive
  const cspMatch = headersContent.match(/Content-Security-Policy:\s*(.+)$/m)
  assert.ok(cspMatch, 'public/_headers must contain Content-Security-Policy')
  const csp = cspMatch[1]

  assert.ok(csp.includes("frame-ancestors 'none'"), "CSP must include frame-ancestors 'none'")
  assert.ok(csp.includes("default-src 'self'"), "CSP must include default-src 'self'")
  assert.ok(
    csp.includes('https://challenges.cloudflare.com'),
    'CSP must allow Cloudflare Turnstile',
  )
  assert.ok(csp.includes('https://*.supabase.co'), 'CSP must allow Supabase domain')
  const scriptPolicy = csp.match(/(?:^|;)\s*script-src\s+([^;]+)/)?.[1]
  assert.ok(scriptPolicy, 'CSP must define script-src')
  assert.ok(!scriptPolicy.includes("'unsafe-inline'"), 'Scripts require exact hashes')
  const scripts = [...indexContent.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].filter(
    ([, attributes]) => !/\bsrc\s*=/.test(attributes),
  )
  assert.ok(scripts.length >= 2, 'Theme and motion startup scripts must be present')
  for (const [, attributes, body] of scripts) {
    // HTML parsing normalizes CRLF before CSP hashes are calculated.
    const hash = crypto.createHash('sha256').update(body.replace(/\r\n?/g, '\n')).digest('base64')
    assert.ok(scriptPolicy.includes(`'sha256-${hash}'`), `Missing hash for ${attributes}`)
  }
})

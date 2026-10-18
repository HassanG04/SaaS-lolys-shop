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

test('public/_headers Content-Security-Policy hash matches index.html theme script', () => {
  assert.ok(fs.existsSync(headersPath), 'public/_headers must exist')
  assert.ok(fs.existsSync(indexPath), 'index.html must exist')

  const headersContent = fs.readFileSync(headersPath, 'utf8')
  const indexContent = fs.readFileSync(indexPath, 'utf8')

  // Extract inline theme initialization script
  const startTag = '<script id="theme-init">'
  const endTag = '</script>'
  const startIndex = indexContent.indexOf(startTag)
  assert.ok(startIndex !== -1, 'index.html must contain <script id="theme-init">')
  const scriptStart = startIndex + startTag.length
  const endIndex = indexContent.indexOf(endTag, scriptStart)
  assert.ok(endIndex !== -1, 'index.html must contain closing </script> for theme-init')
  const scriptContent = indexContent.substring(scriptStart, endIndex)

  // Compute sha256 hash
  const computedHash =
    'sha256-' + crypto.createHash('sha256').update(scriptContent, 'utf8').digest('base64')

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
  assert.ok(
    csp.includes(`'${computedHash}'`),
    `CSP script-src must contain exact hash '${computedHash}' matching index.html theme-init script`,
  )

  // Extract inline motion initialization script
  const motionStartTag = '<script id="motion-init">'
  const motionStartIndex = indexContent.indexOf(motionStartTag)
  if (motionStartIndex !== -1) {
    const motionScriptStart = motionStartIndex + motionStartTag.length
    const motionEndIndex = indexContent.indexOf(endTag, motionScriptStart)
    assert.ok(motionEndIndex !== -1, 'index.html must contain closing </script> for motion-init')
    const motionScriptContent = indexContent.substring(motionScriptStart, motionEndIndex)
    const computedMotionHash =
      'sha256-' + crypto.createHash('sha256').update(motionScriptContent, 'utf8').digest('base64')
    assert.ok(
      csp.includes(`'${computedMotionHash}'`),
      `CSP script-src must contain exact hash '${computedMotionHash}' matching index.html motion-init script`,
    )
  }
})

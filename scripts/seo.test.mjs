import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { test, describe } from 'node:test'
import path from 'node:path'

const BRAND_NAME = "Lolys' Accessories & Home"
const root = process.cwd()

describe('Static SEO Assets (T-3.08)', () => {
  test('robots.txt exists and disallows sensitive paths', () => {
    const robotsPath = path.join(root, 'public/robots.txt')
    assert.equal(existsSync(robotsPath), true)
    const content = readFileSync(robotsPath, 'utf8')
    assert.match(content, /User-agent:\s*\*/i)
    assert.match(content, /Allow:\s*\//i)
    assert.match(content, /Disallow:\s*\/admin/i)
    assert.match(content, /Disallow:\s*\/account/i)
    assert.match(content, /Disallow:\s*\/pay/i)
  })

  test('site.webmanifest exists with valid JSON and branding', () => {
    const manifestPath = path.join(root, 'public/site.webmanifest')
    assert.equal(existsSync(manifestPath), true)
    const parsed = JSON.parse(readFileSync(manifestPath, 'utf8'))
    assert.equal(parsed.name, BRAND_NAME)
    assert.equal(parsed.short_name, "Lolys'")
    assert.equal(parsed.start_url, '/')
    assert.equal(parsed.display, 'standalone')
    assert.equal(parsed.dir, 'rtl')
    assert.equal(parsed.lang, 'ar')
    assert.equal(Array.isArray(parsed.icons), true)
    assert.ok(parsed.icons.length > 0)
  })

  test('favicon.svg exists and renders SVG bow', () => {
    const faviconPath = path.join(root, 'public/favicon.svg')
    assert.equal(existsSync(faviconPath), true)
    const svg = readFileSync(faviconPath, 'utf8')
    assert.ok(svg.includes('<svg'))
    assert.ok(svg.includes('viewBox'))
    assert.ok(svg.includes('#5A3322'))
  })

  test('index.html includes favicon, manifest, and Open Graph tags', () => {
    const htmlPath = path.join(root, 'index.html')
    const html = readFileSync(htmlPath, 'utf8')
    assert.ok(html.includes('rel="icon"'))
    assert.ok(html.includes('href="/favicon.svg"'))
    assert.ok(html.includes('rel="manifest"'))
    assert.ok(html.includes('href="/site.webmanifest"'))
    assert.ok(html.includes('rel="apple-touch-icon"'))
    assert.ok(html.includes('property="og:title"'))
    assert.ok(html.includes('property="og:description"'))
    assert.ok(html.includes('property="og:image"'))
    assert.ok(html.includes('name="twitter:card"'))
  })
})

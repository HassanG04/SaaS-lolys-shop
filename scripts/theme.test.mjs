import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'

const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8')
function tokens(selector) {
  const block = css.slice(css.indexOf(selector)).split('{')[1].split('}')[0]
  return Object.fromEntries(
    [...block.matchAll(/--color-([\w-]+)-val:\s*(#[a-f\d]{6})/gi)].map((m) => [m[1], m[2]]),
  )
}
const light = tokens(':root,')
const dark = tokens("[data-theme='dark'] {")
function luminance(hex) {
  assert.match(hex, /^#[a-f\d]{6}$/i)
  return hex
    .slice(1)
    .match(/../g)
    .map((channel) => {
      const value = Number.parseInt(channel, 16) / 255
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    })
    .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0)
}
// Every pair and published rounded ratio from design-system.md section 2.
const pairs = [
  ['text', 'bg', 13.3],
  ['text', 'surface', 14.3],
  ['text', 'surface-tint', 12.7],
  ['brand', 'bg', 9.8],
  ['text-muted', 'bg', 5.9],
  ['text-muted', 'surface', 6.3],
  ['brand-contrast', 'brand', 9.8],
  ['text', 'pink', 9.8],
  ['accent-text', 'bg', 4.6],
  ['accent-text', 'surface', 4.9],
  ['success', 'bg', 5.1],
  ['danger', 'bg', 5.9],
  ['warning', 'bg', 5.3],
  ['border-input', 'bg', 3.1, 3],
  ['border-input', 'surface', 3.4, 3],
  ['caramel', 'bg', 4.0, 3],
  ['gold', 'bg', 1.9, 0],
]
  .map((row) => ['light', light, ...row])
  .concat(
    [
      ['text', 'bg', 15.0],
      ['text', 'surface', 13.7],
      ['text', 'surface-2', 12.3],
      ['text-muted', 'bg', 8.7],
      ['text-muted', 'surface', 7.9],
      ['pink', 'bg', 9.4],
      ['pink', 'surface', 8.6],
      ['brand-contrast', 'brand', 7.8],
      ['gold', 'bg', 10.1],
      ['danger', 'bg', 7.8],
      ['success', 'bg', 9.9],
      ['warning', 'bg', 11.0],
      ['border-input', 'bg', 3.7, 3],
      ['border-input', 'surface', 3.4, 3],
    ].map((row) => ['dark', dark, ...row]),
  )
for (const [theme, values, foreground, background, rounded, minimum = 4.5] of pairs) {
  test(`${theme}: ${foreground} on ${background} meets the documented contrast`, () => {
    const a = luminance(values[foreground]),
      b = luminance(values[background])
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
    assert.equal(Number(ratio.toFixed(1)), rounded)
    assert.ok(ratio >= minimum)
  })
}

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const bootstrap = html.match(/<script id="theme-init">([\s\S]*?)<\/script>/)?.[1]
for (const [saved, systemDark, expected] of [
  [null, true, 'dark'],
  [null, false, 'light'],
  ['light', true, 'light'],
  ['dark', false, 'dark'],
  ['system', true, 'dark'],
  ['invalid', true, 'dark'],
  ['denied', true, 'dark'],
]) {
  test(`before React: stored ${saved}, system dark ${systemDark} gives ${expected}`, () => {
    assert.ok(bootstrap)
    let result
    runInNewContext(bootstrap, {
      localStorage: {
        getItem() {
          if (saved === 'denied') throw new Error()
          return saved
        },
      },
      window: { matchMedia: () => ({ matches: systemDark }) },
      document: {
        documentElement: {
          setAttribute: (name, value) => {
            assert.equal(name, 'data-theme')
            result = value
          },
        },
      },
    })
    assert.equal(result, expected)
    assert.ok(html.indexOf('id="theme-init"') < html.indexOf('<body>'))
  })
}

test('fonts and scripts are self-hosted, and font assets have valid WOFF2 signatures', () => {
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//i)
  for (const file of readdirSync(new URL('../public/fonts/', import.meta.url))) {
    const bytes = readFileSync(new URL(`../public/fonts/${file}`, import.meta.url))
    if (file.endsWith('.woff2')) assert.equal(bytes.subarray(0, 4).toString(), 'wOF2')
    if (file.endsWith('.css')) {
      assert.doesNotMatch(bytes.toString(), /(?:https?:)?\/\//)
      for (const [, asset] of bytes.toString().matchAll(/url\(['"]\/fonts\/([^'"]+)['"]\)/g)) {
        assert.equal(
          readFileSync(new URL(`../public/fonts/${asset}`, import.meta.url))
            .subarray(0, 4)
            .toString(),
          'wOF2',
        )
      }
    }
  }
})

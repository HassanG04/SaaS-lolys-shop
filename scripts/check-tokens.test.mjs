import { test } from 'node:test'
import assert from 'node:assert'
import { BAD_REGEX } from './check-tokens.mjs'

test('detects hardcoded colors', () => {
  const content = '<div className="bg-[#123456] text-white">Hello</div>'
  const matches = content.match(BAD_REGEX)
  assert.ok(matches)
  assert.equal(matches.length, 2)
})

test('detects hardcoded radii and shadows', () => {
  const content = '<div className="rounded-md shadow-lg">Hello</div>'
  const matches = content.match(BAD_REGEX)
  assert.ok(matches)
  assert.equal(matches.length, 2)
})

test('ignores valid tokens', () => {
  const content =
    '<div className="bg-brand text-text-muted rounded-pill shadow-soft border-border-input focus-ring">Hello</div>'
  const matches = content.match(BAD_REGEX)
  assert.equal(matches, null)
})

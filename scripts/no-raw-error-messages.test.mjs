import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

// Patterns that attempt to render raw error.message directly in JSX/DOM
const RAW_ERROR_RENDER_REGEX =
  /(?:\{[^{}]*\b(?:error|err)\??\.message[^{}]*\}|(?:\bmessage|\bdescription|\btitle)\s*=\s*\{[^{}]*\b(?:error|err)\??\.message[^{}]*\})/

export function inspectSourceForRawErrorRender(content) {
  const violations = []
  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (RAW_ERROR_RENDER_REGEX.test(line)) {
      violations.push({ line: i + 1, content: line.trim() })
    }
  }
  return violations
}

export function scanDirectoryForRawErrorRender(dir) {
  const files = []
  function walk(current) {
    const entries = readdirSync(current)
    for (const entry of entries) {
      const fullPath = path.join(current, entry)
      const st = statSync(fullPath)
      if (st.isDirectory()) {
        walk(fullPath)
      } else if (entry.endsWith('.tsx') && !entry.endsWith('.test.tsx')) {
        files.push(fullPath)
      }
    }
  }
  walk(dir)

  const allViolations = []
  for (const file of files) {
    const content = readFileSync(file, 'utf8')
    const violations = inspectSourceForRawErrorRender(content)
    for (const v of violations) {
      allViolations.push({
        file: path.relative(process.cwd(), file).replace(/\\/g, '/'),
        line: v.line,
        content: v.content,
      })
    }
  }
  return allViolations
}

test('Guard detects raw error.message rendered directly in JSX children or attributes', () => {
  const badFixture1 = `
    export function BadComp({ error }: { error: Error }) {
      return <div>{error.message}</div>
    }
  `
  const v1 = inspectSourceForRawErrorRender(badFixture1)
  assert.equal(v1.length, 1)

  const badFixture2 = `
    export function BadComp({ error }: { error?: Error }) {
      return <div>{error?.message}</div>
    }
  `
  const v2 = inspectSourceForRawErrorRender(badFixture2)
  assert.equal(v2.length, 1)

  const badFixture3 = `
    export function BadComp({ err }: { err: unknown }) {
      return <ErrorPanel message={err.message} />
    }
  `
  const v3 = inspectSourceForRawErrorRender(badFixture3)
  assert.equal(v3.length, 1)
})

test('Guard passes when ErrorMessage or ErrorPanel receives error object', () => {
  const safeFixture1 = `
    export function SafeComp({ error }: { error: unknown }) {
      return <ErrorMessage error={error} />
    }
  `
  assert.equal(inspectSourceForRawErrorRender(safeFixture1).length, 0)

  const safeFixture2 = `
    export function SafeComp({ error }: { error: unknown }) {
      return <ErrorPanel error={error} />
    }
  `
  assert.equal(inspectSourceForRawErrorRender(safeFixture2).length, 0)
})

test('No source file in src/ renders raw error.message in the DOM', () => {
  const violations = scanDirectoryForRawErrorRender(path.resolve(process.cwd(), 'src'))
  assert.deepEqual(
    violations,
    [],
    `Found raw error.message rendered in DOM: ${JSON.stringify(violations, null, 2)}`,
  )
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

/**
 * Validates that Supabase client instances or @supabase/supabase-js are never imported
 * directly into UI components, pages, routes or utilities outside of:
 * 1. api.ts files (the documented data boundary)
 * 2. src/lib/ (low-level client and error infrastructure)
 * 3. AuthProvider.tsx (auth session lifecycle subscriber)
 * 4. *.test.ts and *.test.tsx files
 */

const SUPABASE_IMPORT_REGEX =
  /import\s+(?:(?:\*\s+as\s+\w+|[\w\s{},]+)\s+from\s+)?['"][^'"]*(?:@supabase\/supabase-js|lib\/supabase)['"]/

export function inspectSourceForSupabaseImport(content) {
  const violations = []
  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // Ignore type-only imports like: import type { User, Session } from '@supabase/supabase-js'
    if (line.includes('import type')) {
      continue
    }
    if (SUPABASE_IMPORT_REGEX.test(line)) {
      violations.push({ line: i + 1, content: line.trim() })
    }
  }
  return violations
}

export function scanDirectoryForSupabaseBoundary(dir) {
  const files = []
  function walk(current) {
    const entries = readdirSync(current)
    for (const entry of entries) {
      const fullPath = path.join(current, entry)
      const st = statSync(fullPath)
      if (st.isDirectory()) {
        walk(fullPath)
      } else if (
        (entry.endsWith('.tsx') || entry.endsWith('.ts')) &&
        !entry.endsWith('.test.tsx') &&
        !entry.endsWith('.test.ts') &&
        !entry.endsWith('api.ts') &&
        !entry.endsWith('AuthProvider.tsx')
      ) {
        // Exclude src/lib/
        const relativeToSrc = path
          .relative(path.resolve(process.cwd(), 'src'), fullPath)
          .replace(/\\/g, '/')
        if (!relativeToSrc.startsWith('lib/')) {
          files.push(fullPath)
        }
      }
    }
  }
  walk(dir)

  const allViolations = []
  for (const file of files) {
    const content = readFileSync(file, 'utf8')
    const violations = inspectSourceForSupabaseImport(content)
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

test('Guard detects illegal Supabase imports in UI files', () => {
  const badFixture = `
    import { supabase } from '@/lib/supabase'
    export function BadComp() { return <div>Bad</div> }
  `
  const v = inspectSourceForSupabaseImport(badFixture)
  assert.equal(v.length, 1)

  const safeFixture = `
    import { useProducts } from '@/features/catalog'
    export function SafeComp() { return <div>Safe</div> }
  `
  assert.equal(inspectSourceForSupabaseImport(safeFixture).length, 0)
})

test('No component, page, or hook outside api.ts and src/lib imports Supabase client', () => {
  const violations = scanDirectoryForSupabaseBoundary(path.resolve(process.cwd(), 'src'))
  assert.deepEqual(
    violations,
    [],
    `Found Supabase imports outside api.ts and src/lib: ${JSON.stringify(violations, null, 2)}`,
  )
})

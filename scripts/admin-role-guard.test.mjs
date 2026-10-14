import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { describe, test } from 'node:test'
import path from 'node:path'

const root = process.cwd()
const srcDir = path.join(root, 'src')

function getAllSourceFiles(dir) {
  const files = []
  const entries = readdirSync(dir)

  for (const entry of entries) {
    const fullPath = path.join(dir, entry)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      files.push(...getAllSourceFiles(fullPath))
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry)) {
      files.push(fullPath)
    }
  }

  return files
}

describe('Admin role modification guard (T-5.06)', () => {
  const sourceFiles = getAllSourceFiles(srcDir)

  test('no file in src/ calls or invokes admin_set_role', () => {
    const violations = []

    for (const file of sourceFiles) {
      // Exclude the generated database type definitions
      if (file.endsWith('database.types.ts')) continue

      const content = readFileSync(file, 'utf8')
      if (
        content.includes("rpc('admin_set_role'") ||
        content.includes('rpc("admin_set_role"') ||
        content.includes('admin_set_role(')
      ) {
        violations.push(path.relative(root, file))
      }
    }

    assert.equal(
      violations.length,
      0,
      `Forbidden call to admin_set_role found in: ${violations.join(', ')}`,
    )
  })

  test('no file in src/ writes to profiles.role', () => {
    const violations = []

    for (const file of sourceFiles) {
      if (file.endsWith('database.types.ts')) continue

      const content = readFileSync(file, 'utf8')
      // Look for mutations to profiles specifying role
      const updatesProfileRole =
        content.includes("from('profiles')") &&
        (content.includes('.update(') ||
          content.includes('.insert(') ||
          content.includes('.upsert(')) &&
        content.includes('role')

      if (updatesProfileRole) {
        violations.push(path.relative(root, file))
      }
    }

    assert.equal(
      violations.length,
      0,
      `Forbidden write to profiles.role found in: ${violations.join(', ')}`,
    )
  })
})

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

describe('Audit log immutability guard (T-5.10)', () => {
  const sourceFiles = getAllSourceFiles(srcDir)

  test('no file in src/ mutates (insert, update, upsert, delete) public.audit_log', () => {
    const violations = []

    for (const file of sourceFiles) {
      // Exclude generated database types
      if (file.endsWith('database.types.ts')) continue

      const content = readFileSync(file, 'utf8')

      // Check for any mutation operation on audit_log
      const mentionsAuditLog =
        content.includes("from('audit_log')") || content.includes('from("audit_log")')

      if (mentionsAuditLog) {
        const hasMutation =
          content.includes('.insert(') ||
          content.includes('.update(') ||
          content.includes('.upsert(') ||
          content.includes('.delete(')

        if (hasMutation) {
          // If the file mentions audit_log, inspect if the mutation is called on audit_log
          const auditLogMutationRegex =
            /from\(\s*['"]audit_log['"]\s*\)[\s\S]{0,100}\.(insert|update|upsert|delete)\s*\(/
          if (auditLogMutationRegex.test(content)) {
            violations.push(path.relative(root, file))
          }
        }
      }
    }

    assert.equal(
      violations.length,
      0,
      `Forbidden write to audit_log found in: ${violations.join(', ')}`,
    )
  })

  test('guard detects simulated mutation to audit_log', () => {
    const badCode = `supabase.from('audit_log').insert({ entity: 'hack' })`
    const regex = /from\(\s*['"]audit_log['"]\s*\)[\s\S]{0,100}\.(insert|update|upsert|delete)\s*\(/
    assert.equal(regex.test(badCode), true)
  })
})

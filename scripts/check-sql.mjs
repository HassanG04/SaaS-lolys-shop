import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export const ALLOW_LISTED_ANON_TABLES = new Set([
  'categories',
  'products',
  'governorates',
  'delivery_fees',
  'shop_settings',
])

export function removeCommentsPreservingLines(sql) {
  let result = ''
  let i = 0
  const n = sql.length
  let inSingleQuote = false

  while (i < n) {
    if (!inSingleQuote) {
      // Line comment
      if (sql[i] === '-' && sql[i + 1] === '-') {
        while (i < n && sql[i] !== '\n' && sql[i] !== '\r') {
          result += ' '
          i++
        }
        continue
      }
      // Block comment
      if (sql[i] === '/' && sql[i + 1] === '*') {
        result += '  '
        i += 2
        while (i < n && !(sql[i] === '*' && sql[i + 1] === '/')) {
          result += sql[i] === '\n' ? '\n' : ' '
          i++
        }
        if (i < n) {
          result += '  '
          i += 2
        }
        continue
      }
      // Single quote string start
      if (sql[i] === "'") {
        inSingleQuote = true
        result += "'"
        i++
        continue
      }
      result += sql[i]
      i++
    } else {
      // Inside single quote
      if (sql[i] === "'") {
        if (sql[i + 1] === "'") {
          result += "''"
          i += 2
          continue
        }
        inSingleQuote = false
        result += "'"
        i++
        continue
      }
      result += sql[i]
      i++
    }
  }
  return result
}

export function getLineNumber(text, index) {
  return text.slice(0, index).split('\n').length
}

export function unquote(identifier) {
  return identifier.trim().replace(/^"|"$/g, '').toLowerCase()
}

// Split into top-level statements respecting $$ dollar-quotes and '' strings
export function splitStatements(sql) {
  const statements = []
  let i = 0
  const n = sql.length
  let stmtStart = 0
  let inSingleQuote = false
  let inDollarQuote = null

  while (i < n) {
    if (!inSingleQuote && inDollarQuote === null) {
      if (sql[i] === "'") {
        inSingleQuote = true
        i++
        continue
      }
      if (sql[i] === '$') {
        const match = sql.slice(i).match(/^\$([a-zA-Z0-9_]*)\$/)
        if (match) {
          inDollarQuote = match[1]
          i += match[0].length
          continue
        }
      }
      if (sql[i] === ';') {
        const text = sql.slice(stmtStart, i + 1)
        if (text.trim().length > 0) {
          statements.push({
            text,
            startIndex: stmtStart,
            endIndex: i + 1,
          })
        }
        stmtStart = i + 1
        i++
        continue
      }
      i++
    } else if (inSingleQuote) {
      if (sql[i] === "'") {
        if (sql[i + 1] === "'") {
          i += 2
          continue
        }
        inSingleQuote = false
        i++
        continue
      }
      i++
    } else if (inDollarQuote !== null) {
      const closeTag = `$${inDollarQuote}$`
      if (sql.startsWith(closeTag, i)) {
        i += closeTag.length
        inDollarQuote = null
        continue
      }
      i++
    }
  }

  const remaining = sql.slice(stmtStart)
  if (remaining.trim().length > 0) {
    statements.push({
      text: remaining,
      startIndex: stmtStart,
      endIndex: n,
    })
  }

  return statements
}

// Rule 1: Fails if dynamic EXECUTE uses string concatenation ('||') instead of format('%I'), %L or USING
export function checkDynamicExecute(cleanedSql, filename) {
  const violations = []
  const regex = /\bexecute\b/gi
  let match
  while ((match = regex.exec(cleanedSql)) !== null) {
    const execIndex = match.index

    // Check what precedes EXECUTE
    const prefix = cleanedSql.slice(Math.max(0, execIndex - 30), execIndex).trim()
    if (/\b(?:grant|revoke)\s*$/i.test(prefix)) continue
    if (/\bfor\s+each\s+row\s*$/i.test(prefix)) continue
    if (/\brow\s*$/i.test(prefix)) continue

    // Check what follows EXECUTE
    const after = cleanedSql.slice(execIndex + match[0].length)
    if (/^\s*(?:function|procedure)\b/i.test(after)) continue

    // It's dynamic SQL execution! Find next semicolon or end
    const semiOffset = after.indexOf(';')
    const stmt = semiOffset !== -1 ? after.slice(0, semiOffset) : after.slice(0, 200)

    // Check if it uses || (string concatenation)
    if (stmt.includes('||')) {
      const line = getLineNumber(cleanedSql, execIndex)
      violations.push({
        rule: 'EXECUTE_STRING_CONCAT',
        file: filename,
        line,
        message: `Dynamic SQL uses string concatenation ('||') in EXECUTE statement; use format('%I'), %L or USING instead.`,
      })
    }
  }
  return violations
}

// Rule 2: Fails if a SECURITY DEFINER function has no set search_path
export function checkSecurityDefiner(statements, cleanedSql, filename) {
  const violations = []
  for (const stmt of statements) {
    const text = stmt.text
    if (/\bcreate\s+(?:or\s+replace\s+)?(?:function|procedure)\b/i.test(text)) {
      if (/\bsecurity\s+definer\b/i.test(text)) {
        if (!/\bset\s+search_path\b/i.test(text)) {
          const fnMatch = text.match(
            /\bcreate\s+(?:or\s+replace\s+)?(?:function|procedure)\s+([a-zA-Z0-9_."]+)/i,
          )
          const fnName = fnMatch ? fnMatch[1] : 'unknown'
          const line = getLineNumber(cleanedSql, stmt.startIndex)
          violations.push({
            rule: 'SECURITY_DEFINER_NO_SEARCH_PATH',
            file: filename,
            line,
            message: `Function '${fnName}' is declared SECURITY DEFINER without 'set search_path'.`,
          })
        }
      }
    }
  }
  return violations
}

// Rule 4: Fails if a table outside the allow-list is granted to anon
export function checkAnonGrants(statements, cleanedSql, filename) {
  const violations = []
  for (const stmt of statements) {
    const text = stmt.text
    if (!/^\s*grant\b/i.test(text.trim())) continue

    // Extract grantee roles after TO
    const toMatch = text.match(/\bto\s+([^;]+?)(?:\s+with\s+grant\s+option)?\s*;?$/i)
    if (!toMatch) continue

    const roles = toMatch[1].split(',').map((r) => unquote(r))
    if (!roles.includes('anon') && !roles.includes('public')) continue

    const line = getLineNumber(cleanedSql, stmt.startIndex)

    // Check if granting all tables in schema
    if (/\bon\s+all\s+tables\s+in\s+schema\b/i.test(text)) {
      violations.push({
        rule: 'ANON_TABLE_GRANT_FORBIDDEN',
        file: filename,
        line,
        message: `Granting all tables in schema to 'anon' is forbidden.`,
      })
      continue
    }

    // Ignore grants on SCHEMA, FUNCTION, PROCEDURE, ROUTINE, SEQUENCE, TYPE, DOMAIN
    if (/\bon\s+(?:schema|function|procedure|routine|sequence|type|domain)\b/i.test(text)) {
      continue
    }

    // Must be a table grant
    const onMatch = text.match(/\bon\s+(?:table\s+)?(.+?)\s+\bto\b/i)
    if (!onMatch) continue

    const targets = onMatch[1].split(',')
    for (const target of targets) {
      const cleanTarget = target.replace(/\([^)]*\)/g, '').trim()
      const parts = cleanTarget.split('.')
      const tableName = unquote(parts[parts.length - 1])
      if (!tableName) continue

      if (!ALLOW_LISTED_ANON_TABLES.has(tableName)) {
        violations.push({
          rule: 'ANON_TABLE_GRANT_FORBIDDEN',
          file: filename,
          line,
          message: `Table 'public.${tableName}' is granted to 'anon', but is not in the allow-list (${[...ALLOW_LISTED_ANON_TABLES].join(', ')}).`,
        })
      }
    }
  }
  return violations
}

// Rule 3 extractors
export function extractTableCreationsAndRls(statements, cleanedSql, filename, migrationIndex = 0) {
  const createdTables = []
  const rlsEnabledTables = []

  for (const stmt of statements) {
    const text = stmt.text

    // Check CREATE TABLE
    const createMatch = text.match(
      /\bcreate\s+table\s+(?:if\s+not\s+exists\s+)?(?:([a-zA-Z0-9_"]+)\.)?([a-zA-Z0-9_"]+)/i,
    )
    if (createMatch) {
      const schema = createMatch[1] ? unquote(createMatch[1]) : 'public'
      if (schema === 'public') {
        const tableName = unquote(createMatch[2])
        const line = getLineNumber(cleanedSql, stmt.startIndex)
        createdTables.push({
          tableName,
          file: filename,
          line,
          migrationIndex,
        })
      }
    }

    // Check ALTER TABLE ... ENABLE ROW LEVEL SECURITY
    const rlsMatch = text.match(
      /\balter\s+table\s+(?:only\s+)?(?:([a-zA-Z0-9_"]+)\.)?([a-zA-Z0-9_"]+)\s+enable\s+row\s+level\s+security\b/i,
    )
    if (rlsMatch) {
      const schema = rlsMatch[1] ? unquote(rlsMatch[1]) : 'public'
      if (schema === 'public') {
        const tableName = unquote(rlsMatch[2])
        const line = getLineNumber(cleanedSql, stmt.startIndex)
        rlsEnabledTables.push({
          tableName,
          file: filename,
          line,
          migrationIndex,
        })
      }
    }
  }

  return { createdTables, rlsEnabledTables }
}

export function checkSql(sql, filename = 'inline.sql') {
  const cleanedSql = removeCommentsPreservingLines(sql)
  const statements = splitStatements(cleanedSql)

  const violations = [
    ...checkDynamicExecute(cleanedSql, filename),
    ...checkSecurityDefiner(statements, cleanedSql, filename),
    ...checkAnonGrants(statements, cleanedSql, filename),
  ]

  const { createdTables, rlsEnabledTables } = extractTableCreationsAndRls(
    statements,
    cleanedSql,
    filename,
    0,
  )

  for (const created of createdTables) {
    const hasRls = rlsEnabledTables.some(
      (r) => r.tableName === created.tableName && r.migrationIndex >= created.migrationIndex,
    )
    if (!hasRls) {
      violations.push({
        rule: 'PUBLIC_TABLE_NO_RLS',
        file: created.file,
        line: created.line,
        message: `Table 'public.${created.tableName}' does not have Row Level Security (RLS) enabled in this or a later migration.`,
      })
    }
  }

  return violations
}

export function checkMigrations(migrationsDir = 'supabase/migrations') {
  const resolvedDir = path.resolve(process.cwd(), migrationsDir)
  const files = readdirSync(resolvedDir)
    .filter((file) => file.endsWith('.sql'))
    .sort()

  const allViolations = []
  const allCreatedTables = []
  const allRlsEnabledTables = []

  files.forEach((file, migrationIndex) => {
    const filePath = path.join(resolvedDir, file)
    const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/')
    const content = readFileSync(filePath, 'utf8')
    const cleanedSql = removeCommentsPreservingLines(content)
    const statements = splitStatements(cleanedSql)

    allViolations.push(...checkDynamicExecute(cleanedSql, relativePath))
    allViolations.push(...checkSecurityDefiner(statements, cleanedSql, relativePath))
    allViolations.push(...checkAnonGrants(statements, cleanedSql, relativePath))

    const { createdTables, rlsEnabledTables } = extractTableCreationsAndRls(
      statements,
      cleanedSql,
      relativePath,
      migrationIndex,
    )
    allCreatedTables.push(...createdTables)
    allRlsEnabledTables.push(...rlsEnabledTables)
  })

  // Rule 3: Check all public tables have RLS in same or later migration
  for (const created of allCreatedTables) {
    const hasRls = allRlsEnabledTables.some(
      (r) => r.tableName === created.tableName && r.migrationIndex >= created.migrationIndex,
    )
    if (!hasRls) {
      allViolations.push({
        rule: 'PUBLIC_TABLE_NO_RLS',
        file: created.file,
        line: created.line,
        message: `Table 'public.${created.tableName}' does not have Row Level Security (RLS) enabled in this or a later migration.`,
      })
    }
  }

  return allViolations
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const targetDir = process.argv[2] ?? 'supabase/migrations'
    const violations = checkMigrations(targetDir)
    for (const v of violations) {
      process.stderr.write(`[SQL] ${v.file}:${v.line} [${v.rule}]: ${v.message}\n`)
    }
    process.exitCode = violations.length ? 1 : 0
    if (!violations.length) {
      process.stdout.write('[SQL] All migrations passed SQL guard rules.\n')
    }
  } catch (error) {
    process.stderr.write(`[SQL] Could not check migrations: ${error.message}\n`)
    process.exitCode = 1
  }
}

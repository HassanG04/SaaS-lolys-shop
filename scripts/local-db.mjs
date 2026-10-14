import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const projectId = 'lolys-db-integration'
export const container = `supabase_db_${projectId}`
export const root = fileURLToPath(new URL('../', import.meta.url))

export function validateLocalTarget(config, endpoint) {
  if (!new RegExp(`^project_id = "${projectId}"$`, 'm').test(config)) {
    throw new Error('Refusing a database project other than the isolated integration stack.')
  }
  if (!endpoint.startsWith('unix:///') && !endpoint.startsWith('npipe:////./pipe/')) {
    throw new Error('Refusing a non-local Docker endpoint.')
  }
}

export function assertLocalTarget() {
  // Docker contexts can point at a remote server; never assume Docker means local.
  const docker = spawnSync(
    'docker',
    ['context', 'inspect', '--format', '{{.Endpoints.docker.Host}}'],
    {
      encoding: 'utf8',
      timeout: 10_000,
    },
  )
  if (docker.status !== 0) throw new Error('Local Docker context is unavailable.')
  validateLocalTarget(
    readFileSync(resolve(root, 'supabase/config.toml'), 'utf8'),
    process.env.DOCKER_HOST || docker.stdout.trim(),
  )
}

export function query(sql) {
  const result = spawnSync(
    'docker',
    [
      'exec',
      '-i',
      container,
      'psql',
      '-X',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '-v',
      'ON_ERROR_STOP=1',
      '-Atq',
    ],
    {
      input: sql,
      encoding: 'utf8',
      timeout: 30_000,
    },
  )
  if (result.status !== 0) throw new Error(`Local database query failed (exit ${result.status}).`)
  return result.stdout.trim()
}

export function normalizeTypes(text) {
  if (
    !text.trimStart().startsWith('export type Json =') ||
    !text.includes('export type Database =')
  ) {
    throw new Error('CLI did not return database types; the existing file was preserved.')
  }
  return text.replaceAll('\r\n', '\n').replace(/[ \t]+$/gm, '')
}

export function checkTypes(expected, generated) {
  if (normalizeTypes(expected) !== normalizeTypes(generated)) {
    throw new Error('Database types differ. Run npm run db:types and commit the generated file.')
  }
}

function main(action) {
  const args = {
    start: ['start'],
    stop: ['stop'],
    reset: ['db', 'reset', '--local'],
    test: ['test', 'db'],
    types: ['gen', 'types', 'typescript', '--local'],
    'check-types': ['gen', 'types', 'typescript', '--local'],
  }[action]
  if (!args || process.argv.length !== 3) throw new Error('Expected one local database action.')
  assertLocalTarget()
  const result = spawnSync(
    process.execPath,
    [resolve(root, 'node_modules/supabase/dist/supabase.js'), ...args, '--workdir', root],
    {
      cwd: root,
      encoding: 'utf8',
      timeout: 600_000,
      maxBuffer: 16 * 1024 * 1024,
      env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: 'true' },
    },
  )
  // Supabase start/status can print local credentials. Never forward their output.
  if (action === 'test') process.stdout.write(result.stdout ?? '')
  if (result.status !== 0) {
    if (action === 'test') process.stderr.write(result.stderr ?? '')
    throw new Error(
      `Local database ${action} failed (exit ${result.status}); CLI credential output withheld.`,
    )
  }
  const types = resolve(root, 'src/types/database.types.ts')
  if (action === 'types') writeFileSync(types, normalizeTypes(result.stdout))
  if (action === 'check-types') checkTypes(readFileSync(types, 'utf8'), result.stdout)
  console.log(`Local database ${action} passed (${projectId}).`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv[2])
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}

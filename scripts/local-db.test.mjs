import assert from 'node:assert/strict'
import test from 'node:test'
import { checkTypes, normalizeTypes, validateLocalTarget } from './local-db.mjs'

test('database runner refuses another stack or remote Docker endpoint', () => {
  const config = 'project_id = "lolys-db-integration"\n'
  validateLocalTarget(config, 'unix:///var/run/docker.sock')
  validateLocalTarget(config, 'npipe:////./pipe/dockerDesktopLinuxEngine')
  assert.throws(() => validateLocalTarget('project_id = "supabase"', 'unix:///var/run/docker.sock'))
  for (const endpoint of ['ssh://host', 'tcp://remote:2375', 'https://remote', '']) {
    assert.throws(() => validateLocalTarget(config, endpoint))
  }
})

test('generated type comparison rejects schema drift and CLI errors', () => {
  const types = 'export type Json = string\nexport type Database = {}\n'
  checkTypes(types, types.replaceAll('\n', '\r\n'))
  checkTypes(types, types.replaceAll('\n', '  \n'))
  assert.throws(() => checkTypes(types, types.replace('{}', '{ public: {} }')), /differ/)
  assert.throws(() => normalizeTypes('CLI failed'), /preserved/)
})

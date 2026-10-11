import { beforeEach, describe, expect, it } from 'vitest'
import { createSupabaseClient, getSupabase, resetSupabaseForTesting, supabase } from './supabase'
import { resetEnvCacheForTesting } from './env'

describe('supabase client', () => {
  beforeEach(() => {
    resetSupabaseForTesting()
    resetEnvCacheForTesting()
  })

  it('creates a typed Supabase client with custom URL and key', () => {
    const client = createSupabaseClient('http://127.0.0.1:54321', 'test-key', {
      persistSession: false,
    })
    expect(client).toBeDefined()
    expect(typeof client.from).toBe('function')
    expect(typeof client.auth.getSession).toBe('function')
  })

  it('getSupabase initializes a singleton client using validated environment', () => {
    const client1 = getSupabase()
    const client2 = getSupabase()
    expect(client1).toBe(client2)
    expect(typeof client1.from).toBe('function')
  })

  it('supabase proxy delegates property and method accesses to the singleton client', () => {
    expect(typeof supabase.from).toBe('function')
    const query = supabase.from('products')
    expect(query).toBeDefined()
    expect(typeof query.select).toBe('function')
  })

  it('resetSupabaseForTesting allows reinitialization of the client', () => {
    const client1 = getSupabase()
    resetSupabaseForTesting()
    const client2 = getSupabase()
    expect(client1).not.toBe(client2)
  })
})

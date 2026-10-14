import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types'
import { getEnv } from './env'

export interface CreateSupabaseClientOptions {
  storageKey?: string
  persistSession?: boolean
  autoRefreshToken?: boolean
}

export function createSupabaseClient(
  url: string,
  anonKey: string,
  options?: CreateSupabaseClientOptions,
): SupabaseClient<Database> {
  const safeStorage = {
    getItem: (key: string): string | null => {
      try {
        return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null
      } catch {
        return null
      }
    },
    setItem: (key: string, value: string): void => {
      try {
        if (typeof localStorage !== 'undefined') localStorage.setItem(key, value)
      } catch {
        // storage disabled or blocked
      }
    },
    removeItem: (key: string): void => {
      try {
        if (typeof localStorage !== 'undefined') localStorage.removeItem(key)
      } catch {
        // storage disabled or blocked
      }
    },
  }

  return createClient<Database>(url, anonKey, {
    auth: {
      storage: safeStorage,
      persistSession: options?.persistSession ?? true,
      autoRefreshToken: options?.autoRefreshToken ?? true,
      ...(options?.storageKey ? { storageKey: options.storageKey } : {}),
    },
  })
}

let clientInstance: SupabaseClient<Database> | null = null

export function getSupabase(): SupabaseClient<Database> {
  if (!clientInstance) {
    const env = getEnv()
    clientInstance = createSupabaseClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
  }
  return clientInstance
}

export const supabase: SupabaseClient<Database> = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop, receiver) {
    const client = getSupabase()
    const value = Reflect.get(client, prop, receiver)
    return typeof value === 'function' ? value.bind(client) : value
  },
})

export function resetSupabaseForTesting(): void {
  clientInstance = null
}

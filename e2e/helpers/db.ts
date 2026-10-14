import { execSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

export interface SupabaseLocalStatus {
  API_URL: string
  ANON_KEY: string
  SERVICE_ROLE_KEY: string
  [key: string]: unknown
}

let cachedStatus: SupabaseLocalStatus | null = null

export function getSupabaseStatus(): SupabaseLocalStatus {
  if (cachedStatus) return cachedStatus

  try {
    const stdout = execSync('npx supabase status -o json', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const jsonStart = stdout.indexOf('{')
    const jsonEnd = stdout.lastIndexOf('}')
    if (jsonStart !== -1 && jsonEnd !== -1) {
      cachedStatus = JSON.parse(stdout.slice(jsonStart, jsonEnd + 1)) as SupabaseLocalStatus
      return cachedStatus
    }
  } catch (error) {
    console.error('Failed to query supabase status:', error)
  }

  // Fallback to local default stack configuration if already known
  cachedStatus = {
    API_URL: process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321',
    ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || '',
    SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  }
  return cachedStatus
}

export function queryDb<T = Record<string, unknown>>(sql: string): T[] {
  const stdout = execSync('npx supabase db query --local', {
    input: sql,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  const start = stdout.indexOf('{')
  const end = stdout.lastIndexOf('}')
  if (start !== -1 && end !== -1) {
    const parsed = JSON.parse(stdout.slice(start, end + 1))
    return (parsed.rows ?? []) as T[]
  }
  return []
}

export function resetDb(): void {
  execSync('npx supabase db reset', {
    stdio: 'inherit',
  })
  cachedStatus = null
}

export function ensureDeliveryFees(): void {
  queryDb(`
    INSERT INTO public.delivery_fees (governorate_id, method, fee)
    VALUES (1, 'representative', 35.00)
    ON CONFLICT (governorate_id, method) DO UPDATE SET fee = 35.00;
  `)
}

export async function createTestUser(params: {
  email: string
  password: string
  fullName: string
  phone: string
  isAdmin?: boolean
}): Promise<string> {
  const status = getSupabaseStatus()
  const adminClient = createClient(status.API_URL, status.SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  // Check if user already exists
  const { data: usersData } = await adminClient.auth.admin.listUsers()
  const existingUser = usersData?.users?.find((u) => u.email === params.email)

  let userId: string
  if (existingUser) {
    userId = existingUser.id
  } else {
    const { data, error } = await adminClient.auth.admin.createUser({
      email: params.email,
      password: params.password,
      email_confirm: true,
      user_metadata: {
        full_name: params.fullName,
        phone: params.phone,
      },
    })
    if (error || !data.user) {
      throw new Error(`Failed to create test user ${params.email}: ${error?.message}`)
    }
    userId = data.user.id
  }

  // Update profile attributes
  queryDb(`
    UPDATE public.profiles
       SET full_name = '${params.fullName.replace(/'/g, "''")}',
           phone = '${params.phone}',
           governorate_id = 1,
           city = 'القاهرة',
           address = 'شارع التحرير'
     WHERE id = '${userId}';
  `)

  // Promote to admin if requested
  if (params.isAdmin) {
    queryDb(`
      UPDATE public.profiles
         SET role = 'admin'
       WHERE id = '${userId}';
    `)
  }

  return userId
}

export function getProductStock(productId: number): number {
  const rows = queryDb<{ stock_quantity: number | string }>(`
    SELECT stock_quantity FROM public.products WHERE id = ${productId};
  `)
  if (!rows[0]) throw new Error(`Product ${productId} not found`)
  return Number(rows[0].stock_quantity)
}

export function setProductStock(productId: number, stock: number): void {
  queryDb(`
    UPDATE public.products
       SET stock_quantity = ${stock}
     WHERE id = ${productId};
  `)
}

export function expireOrderViaTestHook(orderId: number): void {
  queryDb(`
    UPDATE public.orders
       SET payment_deadline = now() - interval '1 minute',
           created_at = now() - interval '48 hours'
     WHERE id = ${orderId};
  `)
  queryDb(`SELECT public.expire_unpaid_orders();`)
}

export function getOrderRow(orderId: number): {
  id: number
  status: string
  payment_status: string
  payment_method: string
} {
  const rows = queryDb<{
    id: number | string
    status: string
    payment_status: string
    payment_method: string
  }>(`
    SELECT id, status, payment_status, payment_method
      FROM public.orders
     WHERE id = ${orderId};
  `)
  if (!rows[0]) throw new Error(`Order ${orderId} not found`)
  return {
    id: Number(rows[0].id),
    status: rows[0].status,
    payment_status: rows[0].payment_status,
    payment_method: rows[0].payment_method,
  }
}

export function getLatestAuditLog(entity?: string): {
  id: number
  action: string
  entity: string
  entity_id: string | null
  created_at: string
} | null {
  const filter = entity ? `WHERE entity = '${entity}'` : ''
  const rows = queryDb<{
    id: number | string
    action: string
    entity: string
    entity_id: string | null
    created_at: string
  }>(`
    SELECT id, action, entity, entity_id, created_at
      FROM public.audit_log
      ${filter}
     ORDER BY id DESC
     LIMIT 1;
  `)
  if (!rows[0]) return null
  return {
    id: Number(rows[0].id),
    action: rows[0].action,
    entity: rows[0].entity,
    entity_id: rows[0].entity_id,
    created_at: rows[0].created_at,
  }
}

export function getAdminTotpSecret(): string | null {
  const rows = queryDb<{ secret: string }>(`
    SELECT f.secret
      FROM auth.mfa_factors f
      JOIN auth.users u ON u.id = f.user_id
     WHERE u.email = 'admin@example.com'
       AND f.status = 'verified'
     LIMIT 1;
  `)
  return rows[0]?.secret ?? null
}

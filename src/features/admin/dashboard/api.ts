import type { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { dashboardDataSchema } from './schema'
import type { DashboardData } from './types'

/**
 * Handled error representing a schema validation failure for the dashboard RPC payload.
 */
export class DashboardParseError extends Error {
  readonly zodError: z.ZodError
  readonly rawData: unknown

  constructor(zodError: z.ZodError, rawData: unknown) {
    const details = zodError.issues
      .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
      .join('; ')
    super(`Malformed dashboard payload: ${details}`)
    this.name = 'DashboardParseError'
    this.zodError = zodError
    this.rawData = rawData
  }
}

/**
 * Calls public.admin_dashboard(p_from, p_to) RPC and strictly validates the returned JSON.
 * Throws DashboardParseError when response data is malformed.
 */
export async function getAdminDashboard(from?: string, to?: string): Promise<DashboardData> {
  const args: { p_from?: string; p_to?: string } = {}
  if (from) args.p_from = from
  if (to) args.p_to = to

  const { data, error } = await supabase.rpc('admin_dashboard', args)

  if (error) {
    throw new Error(`Failed to load admin dashboard: ${error.message}`)
  }

  const parsed = dashboardDataSchema.safeParse(data)
  if (!parsed.success) {
    throw new DashboardParseError(parsed.error, data)
  }

  return parsed.data
}

import { supabase } from '@/lib/supabase'
import { toAppError } from '@/lib/errors'
import type { AuditLogEntry, AuditLogFilter, AuditLogResponse } from './types'

/**
 * Fetches paginated audit logs from the append-only public.audit_log table.
 * Supports filtering by entity, action, date range, and text search on entity ID or actor role.
 */
export async function getAuditLogs(
  filter?: AuditLogFilter,
  page = 1,
  pageSize = 20,
): Promise<AuditLogResponse> {
  try {
    let query = supabase.from('audit_log').select('*', { count: 'exact' })

    if (filter?.entity && filter.entity !== 'all') {
      query = query.eq('entity', filter.entity)
    }

    if (filter?.action && filter.action !== 'all') {
      query = query.eq('action', filter.action)
    }

    if (filter?.from) {
      query = query.gte('at', filter.from)
    }

    if (filter?.to) {
      query = query.lte('at', `${filter.to}T23:59:59.999Z`)
    }

    const search = filter?.search?.trim()
    if (search) {
      const isNum = /^\d+$/.test(search)
      if (isNum) {
        query = query.or(`id.eq.${search},entity_id.ilike.%${search}%,actor_role.ilike.%${search}%`)
      } else {
        query = query.or(`entity_id.ilike.%${search}%,actor_role.ilike.%${search}%`)
      }
    }

    query = query.order('at', { ascending: false })

    const safePage = Math.max(1, page)
    const fromIdx = (safePage - 1) * pageSize
    const toIdx = fromIdx + pageSize - 1
    query = query.range(fromIdx, toIdx)

    const { data, count, error } = await query

    if (error) {
      throw toAppError(error)
    }

    const total = count ?? 0
    const totalPages = Math.ceil(total / pageSize) || 1

    return {
      entries: (data ?? []) as unknown as AuditLogEntry[],
      total,
      page: safePage,
      pageSize,
      totalPages,
    }
  } catch (err) {
    throw toAppError(err)
  }
}

/**
 * Retrieves the latest high-impact or sensitive changes from audit_log
 * (role updates, shop settings, delivery fee changes, and payment reviews).
 */
export async function getRecentSensitiveAudit(limit = 5): Promise<AuditLogEntry[]> {
  try {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .or('entity.in.(shop_settings,delivery_fees,profiles),action.eq.PAYMENT_REVIEW')
      .order('at', { ascending: false })
      .limit(limit)

    if (error) {
      throw toAppError(error)
    }

    return (data ?? []) as unknown as AuditLogEntry[]
  } catch (err) {
    throw toAppError(err)
  }
}

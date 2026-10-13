import { useQuery } from '@tanstack/react-query'
import { getAuditLogs, getRecentSensitiveAudit } from './api'
import type { AuditLogFilter, AuditLogResponse, AuditLogEntry } from './types'

export const AUDIT_LOGS_QUERY_KEY = ['admin', 'audit_log'] as const
export const SENSITIVE_AUDIT_QUERY_KEY = ['admin', 'audit_log', 'sensitive'] as const

export function useAuditLogs(filter?: AuditLogFilter, page = 1, pageSize = 20) {
  return useQuery<AuditLogResponse>({
    queryKey: [...AUDIT_LOGS_QUERY_KEY, filter, page, pageSize],
    queryFn: () => getAuditLogs(filter, page, pageSize),
    staleTime: 30 * 1000,
  })
}

export function useRecentSensitiveAudit(limit = 5) {
  return useQuery<AuditLogEntry[]>({
    queryKey: [...SENSITIVE_AUDIT_QUERY_KEY, limit],
    queryFn: () => getRecentSensitiveAudit(limit),
    staleTime: 30 * 1000,
  })
}

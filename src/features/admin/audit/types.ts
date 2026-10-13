export interface AuditLogEntry {
  id: number
  at: string
  actor: string | null
  actor_role: string
  action: string
  entity: string
  entity_id: string
  old: Record<string, unknown> | null
  new: Record<string, unknown> | null
}

export interface AuditLogFilter {
  entity?: string
  action?: string
  search?: string
  from?: string
  to?: string
}

export interface AuditLogResponse {
  entries: AuditLogEntry[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export const AUDIT_ENTITIES = [
  'all',
  'products',
  'categories',
  'orders',
  'delivery_fees',
  'shop_settings',
  'profiles',
] as const

export type AuditEntity = (typeof AUDIT_ENTITIES)[number]

export const AUDIT_ACTIONS = ['all', 'INSERT', 'UPDATE', 'DELETE', 'PAYMENT_REVIEW'] as const

export type AuditAction = (typeof AUDIT_ACTIONS)[number]

export const ENTITY_LABELS: Record<string, { ar: string; en: string }> = {
  products: { ar: 'المنتجات', en: 'Products' },
  categories: { ar: 'الأقسام', en: 'Categories' },
  orders: { ar: 'الطلبات', en: 'Orders' },
  delivery_fees: { ar: 'رسوم التوصيل', en: 'Delivery Fees' },
  shop_settings: { ar: 'إعدادات المتجر', en: 'Shop Settings' },
  profiles: { ar: 'الملفات الشخصية والأدوار', en: 'Profiles & Roles' },
}

export const ACTION_LABELS: Record<string, { ar: string; en: string }> = {
  INSERT: { ar: 'إضافة جديدة (INSERT)', en: 'Create (INSERT)' },
  UPDATE: { ar: 'تعديل بيانات (UPDATE)', en: 'Update (UPDATE)' },
  DELETE: { ar: 'حذف عنصر (DELETE)', en: 'Delete (DELETE)' },
  PAYMENT_REVIEW: { ar: 'مراجعة الدفع (PAYMENT_REVIEW)', en: 'Payment Review' },
}

export function isSensitiveAuditEntry(entry: AuditLogEntry): boolean {
  if (entry.entity === 'profiles') return true
  if (entry.entity === 'shop_settings') return true
  if (entry.entity === 'delivery_fees') return true
  if (entry.action === 'PAYMENT_REVIEW') return true
  return false
}

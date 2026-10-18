export interface ShopSettingsMap {
  shop_name_ar: string
  shop_name_en: string
  tagline_ar: string
  phone: string
  whatsapp: string
  instagram: string
  announcement_ar: string
  hero_title_ar: string
  hero_subtitle_ar: string
  sale_percent: number
  payment_methods_enabled: ('cod' | 'instapay_qr')[]
  instapay_qr_path: string
  instapay_handle: string
  instapay_link: string
  returns_text_ar: string
  payment_window_hours: number
  pending_order_limit: number
}

export type SettingKey = keyof ShopSettingsMap

export type UpdateSettingPayload = {
  [K in SettingKey]: { key: K; value: ShopSettingsMap[K] }
}[SettingKey]

export const SENSITIVE_SETTING_KEYS: readonly SettingKey[] = [
  'payment_methods_enabled',
  'instapay_qr_path',
  'instapay_handle',
  'instapay_link',
  'pending_order_limit',
  'payment_window_hours',
] as const

export function isSensitiveSetting(key: SettingKey): boolean {
  return SENSITIVE_SETTING_KEYS.includes(key)
}

export interface ShopSettingRow {
  key: string
  value: unknown
  is_public: boolean
  updated_at: string
  updated_by: string | null
}

export interface SettingsAuditEntry {
  id: number
  at: string
  actor: string | null
  actor_role: string
  action: string
  entity: string
  entity_id: string
  old: unknown
  new: unknown
}

export const INSTAPAY_QR_PLACEHOLDER = '/placeholders/instapay-qr.svg'

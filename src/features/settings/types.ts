export interface PublicShopSettings {
  shop_name_ar?: string
  shop_name_en?: string
  tagline_ar?: string
  phone?: string
  whatsapp?: string
  instagram?: string
  announcement_ar?: string
  hero_title_ar?: string
  hero_subtitle_ar?: string
  sale_percent?: number
  payment_methods_enabled?: string[]
  require_order_approval?: boolean
  returns_text_ar?: string
  returns_days?: number
  delivery_notes_ar?: string
  [key: string]: unknown
}

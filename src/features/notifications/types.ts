export type NotificationType = 'wishlist_sale' | 'order_approved' | 'general_sale'

export interface CustomerNotification {
  id: string
  customer_id: string
  type: NotificationType
  title_ar: string
  title_en: string
  message_ar: string
  message_en: string
  link: string | null
  is_read: boolean
  created_at: string
}

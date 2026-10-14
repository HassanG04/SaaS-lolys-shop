import type { Database } from '@/types'

export type CustomerStatRow = Database['public']['Views']['customer_stats']['Row']

export interface CustomerStat {
  user_id: string
  full_name: string | null
  phone: string | null
  role: 'customer' | 'admin'
  orders_count: number
  total_spent: number
  favorite_product_id: number | null
  favorite_product_name: string | null
}

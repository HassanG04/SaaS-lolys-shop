import { getSupabase } from '@/lib/supabase'
import type { CustomerStat } from './types'

export async function getCustomerStats(): Promise<CustomerStat[]> {
  const { data, error } = await getSupabase()
    .from('customer_stats')
    .select('*')
    .order('total_spent', { ascending: false })

  if (error) {
    throw new Error(`Failed to load customer statistics: ${error.message}`)
  }

  return (data ?? []).map((row) => ({
    user_id: row.user_id ?? '',
    full_name: row.full_name,
    phone: row.phone,
    role: (row.role as 'customer' | 'admin') ?? 'customer',
    orders_count: Number(row.orders_count ?? 0),
    total_spent: Number(row.total_spent ?? 0),
    favorite_product_id: row.favorite_product_id,
    favorite_product_name: row.favorite_product_name,
  }))
}

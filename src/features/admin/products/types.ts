import type { Tables } from '@/types'

export type StockAdjustmentReason = 'admin_adjust' | 'restock' | 'correction'

export interface AdminCategorySummary {
  id: number
  name: string
  name_ar: string | null
  slug: string
}

export interface AdminProduct extends Tables<'products'> {
  category?: AdminCategorySummary | null
  categories?: AdminCategorySummary | null
}

export type ActiveFilterValue = 'all' | 'active' | 'archived'
export type StockFilterValue = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'

export interface AdminProductsFilter {
  search: string
  categoryId: number | 'all'
  activeStatus: ActiveFilterValue
  stockStatus: StockFilterValue
}

export interface UpdateProductStockParams {
  productId: number
  newQuantity: number
  reason: StockAdjustmentReason
}

export interface UpdateProductActiveParams {
  productId: number
  isActive: boolean
}

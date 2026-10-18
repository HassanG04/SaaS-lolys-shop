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

export interface ProductFormData {
  custom_id?: number | ''
  name: string
  name_ar: string
  description: string
  description_ar: string
  category_id: number | ''
  price: number | ''
  discount_percent: number | ''
  stock_quantity: number | ''
  is_featured: boolean
  is_active: boolean
  image_url: string | null
  extra_images: string[]
}

export interface CreateProductParams {
  formData: ProductFormData
}

export interface UpdateProductParams {
  productId: number
  formData: Partial<ProductFormData>
}

export interface UpdateProductIdParams {
  oldId: number
  newId: number
}

export interface QuickProductUpdateParams {
  productId: number
  newId?: number
  name: string
  name_ar?: string | null
  categoryId: number
  price: number
  stockQuantity: number
  currentStockQuantity: number
  imageUrl?: string | null
}

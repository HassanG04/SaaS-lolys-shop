import type { Tables } from '@/types'

export type Category = Tables<'categories'>
export type Product = Tables<'products'>

export interface CategorySummary {
  id: number
  name: string
  name_ar: string | null
  slug: string
  is_active?: boolean
}

export interface ProductWithCategory extends Product {
  categories?: CategorySummary | null
  category?: CategorySummary | null
}

export interface GetCategoriesOptions {
  showOnHomeOnly?: boolean
}

import type { Tables } from '@/types'
import type { Product } from '@/features/catalog/types'

export type FavoriteRow = Tables<'favorites'>

export interface FavoriteItem {
  product_id: number
  created_at: string
  product: Product
}

export interface ToggleFavoriteParams {
  productId: number
  product?: Product
  willFavorite: boolean
}

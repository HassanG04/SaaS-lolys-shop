import { supabase } from '@/lib/supabase'
import { toAppError } from '@/lib/errors'
import type { FavoriteItem } from './types'

export async function getFavoritesApi(): Promise<FavoriteItem[]> {
  const { data, error } = await supabase
    .from('favorites')
    .select('product_id, created_at, product:products(*)')
    .order('created_at', { ascending: false })

  if (error) {
    throw toAppError(error)
  }

  return (data || [])
    .filter((item) => item.product !== null)
    .map((item) => ({
      product_id: item.product_id,
      created_at: item.created_at,
      product: item.product as unknown as FavoriteItem['product'],
    }))
}

export async function getFavoriteProductIdsApi(): Promise<number[]> {
  const { data, error } = await supabase.from('favorites').select('product_id')

  if (error) {
    throw toAppError(error)
  }

  return (data || []).map((row) => row.product_id)
}

export async function addFavoriteApi(userId: string, productId: number): Promise<void> {
  const { error } = await supabase
    .from('favorites')
    .insert({ user_id: userId, product_id: productId })

  if (error) {
    throw toAppError(error)
  }
}

export async function removeFavoriteApi(userId: string, productId: number): Promise<void> {
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', productId)

  if (error) {
    throw toAppError(error)
  }
}

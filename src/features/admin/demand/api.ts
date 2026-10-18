import { supabase } from '@/lib/supabase'
import { toAppError } from '@/lib/errors'
import type { WishlistDemandItem } from './types'

export async function adminFetchWishlistDemandApi(): Promise<WishlistDemandItem[]> {
  try {
    const { data, error } = await supabase.rpc('admin_get_wishlist_demand')

    if (error) {
      throw toAppError(error)
    }

    return (data || []) as WishlistDemandItem[]
  } catch (err) {
    throw toAppError(err)
  }
}

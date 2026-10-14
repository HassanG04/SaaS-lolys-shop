import { supabase } from '@/lib/supabase'
import { toAppError } from '@/lib/errors'
import type { PublicShopSettings } from './types'

/**
 * Fetches public shop settings configured in the shop_settings table.
 * Anonymous and authenticated users can only read is_public = true rows (enforced by RLS).
 */
export async function getPublicSettings(): Promise<PublicShopSettings> {
  try {
    const { data, error } = await supabase
      .from('shop_settings')
      .select('key, value')
      .eq('is_public', true)

    if (error) {
      throw toAppError(error)
    }

    const settings: PublicShopSettings = {}
    for (const row of data ?? []) {
      settings[row.key] = row.value
    }

    return settings
  } catch (err) {
    throw toAppError(err)
  }
}

import { supabase } from '../../lib/supabase'
import type { Governorate, DeliveryFeeOption, DeliveryMethod } from './types'

export const DELIVERY_METHOD_NAMES: Record<DeliveryMethod, { label_ar: string; label_en: string }> =
  {
    egypt_post: {
      label_ar: 'البريد المصري',
      label_en: 'Egypt Post',
    },
    representative: {
      label_ar: 'مندوب توصيل',
      label_en: 'Courier Representative',
    },
  }

/**
 * Fetches all governorates, sorted with Arabic names first.
 */
export async function getGovernorates(): Promise<Governorate[]> {
  const { data, error } = await supabase
    .from('governorates')
    .select('id, name_ar, name_en')
    .order('name_ar', { ascending: true })

  if (error) {
    throw new Error(`Failed to load governorates: ${error.message}`)
  }

  // Ensure deterministic Arabic alphabetical collation
  return (data ?? []).slice().sort((a, b) => a.name_ar.localeCompare(b.name_ar, 'ar'))
}

/**
 * Fetches available delivery methods and fees for a governorate.
 * Returns an empty list if a governorate has no rows configured.
 */
export async function getDeliveryFees(governorateId: number): Promise<DeliveryFeeOption[]> {
  if (!governorateId || governorateId <= 0) {
    return []
  }

  const { data, error } = await supabase
    .from('delivery_fees')
    .select('governorate_id, method, fee')
    .eq('governorate_id', governorateId)

  if (error) {
    throw new Error(`Failed to load delivery fees: ${error.message}`)
  }

  if (!data || data.length === 0) {
    return []
  }

  return data.map((row) => ({
    governorate_id: row.governorate_id,
    method: row.method,
    fee: Number(row.fee),
    label_ar: DELIVERY_METHOD_NAMES[row.method]?.label_ar ?? row.method,
    label_en: DELIVERY_METHOD_NAMES[row.method]?.label_en ?? row.method,
  }))
}

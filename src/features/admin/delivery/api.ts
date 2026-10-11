import { supabase } from '@/lib/supabase'
import type { DeliveryMethod } from '@/features/delivery/types'
import type { DeliveryFeeRow } from './types'

/**
 * Fetches all delivery fees configured in the database.
 */
export async function getAllDeliveryFees(): Promise<DeliveryFeeRow[]> {
  const { data, error } = await supabase
    .from('delivery_fees')
    .select('governorate_id, method, fee')
    .order('governorate_id', { ascending: true })

  if (error) {
    throw new Error(`Failed to load delivery fees: ${error.message}`)
  }

  return (data ?? []).map((row) => ({
    governorate_id: row.governorate_id,
    method: row.method,
    fee: Number(row.fee),
  }))
}

/**
 * Adds or updates a delivery fee for a governorate and delivery method.
 * Enforces validation that fee is 0 or greater.
 */
export async function upsertDeliveryFee(
  governorateId: number,
  method: DeliveryMethod,
  fee: number,
): Promise<void> {
  if (typeof fee !== 'number' || !Number.isFinite(fee) || fee < 0) {
    throw new Error('Validation failed: Delivery fee must be 0 or greater.')
  }

  const { error } = await supabase.from('delivery_fees').upsert(
    {
      governorate_id: governorateId,
      method,
      fee,
    },
    { onConflict: 'governorate_id,method' },
  )

  if (error) {
    throw new Error(`Failed to save delivery fee: ${error.message}`)
  }
}

/**
 * Removes a delivery fee for a governorate and method.
 * Makes this method unavailable at checkout for customers in this governorate.
 */
export async function deleteDeliveryFee(
  governorateId: number,
  method: DeliveryMethod,
): Promise<void> {
  const { error } = await supabase
    .from('delivery_fees')
    .delete()
    .eq('governorate_id', governorateId)
    .eq('method', method)

  if (error) {
    throw new Error(`Failed to remove delivery fee: ${error.message}`)
  }
}

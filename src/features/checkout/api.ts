import { supabase } from '@/lib/supabase'
import { toAppError } from '@/lib/errors'
import type { PlaceOrderParams } from './types'
import type { Json } from '@/types/database.types'

/**
 * Submits an order through the database RPC `place_order`.
 * Maps PostgREST errors and database exception hints (ORD-xxx, AUTH-xxx, SYS-xxx) through toAppError.
 */
export async function placeOrderApi(params: PlaceOrderParams): Promise<number> {
  const { items, delivery_method, payment_method, ship } = params

  try {
    const { data, error } = await supabase.rpc('place_order', {
      p_items: items as unknown as Json,
      p_delivery_method: delivery_method,
      p_payment_method: payment_method,
      p_ship: ship as unknown as Json,
    })

    if (error) {
      throw toAppError(error)
    }

    if (data === null || data === undefined) {
      throw toAppError('ORD-002')
    }

    return Number(data)
  } catch (err) {
    throw toAppError(err)
  }
}

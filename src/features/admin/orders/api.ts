import { supabase } from '@/lib/supabase'
import { toAppError } from '@/lib/errors'
import type { TablesUpdate } from '@/types'
import type {
  AdminOrder,
  AdminOrderFilters,
  UpdateOrderStatusPayload,
  UpdateFulfillmentPayload,
} from './types'

export async function getAdminOrders(filters?: AdminOrderFilters): Promise<AdminOrder[]> {
  try {
    let query = supabase
      .from('orders')
      .select('*, order_items(*, products(name, name_ar, image_url))')
      .order('created_at', { ascending: false })

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }

    if (filters?.payment_status && filters.payment_status !== 'all') {
      query = query.eq('payment_status', filters.payment_status)
    }

    const search = filters?.search?.trim()
    if (search) {
      const cleanSearch = search.replace(/^#/, '').trim()
      const isNum = /^\d+$/.test(cleanSearch)

      if (isNum) {
        query = query.or(
          `id.eq.${cleanSearch},ship_phone.ilike.%${cleanSearch}%,ship_alt_phone.ilike.%${cleanSearch}%,tracking_number.ilike.%${cleanSearch}%`,
        )
      } else {
        query = query.or(
          `ship_name.ilike.%${cleanSearch}%,ship_phone.ilike.%${cleanSearch}%,ship_alt_phone.ilike.%${cleanSearch}%,tracking_number.ilike.%${cleanSearch}%`,
        )
      }
    }

    const { data, error } = await query
    if (error) throw toAppError(error)

    return (data ?? []) as unknown as AdminOrder[]
  } catch (err) {
    throw toAppError(err)
  }
}

export async function getAdminOrderById(id: number): Promise<AdminOrder | null> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, products(name, name_ar, image_url))')
      .eq('id', id)
      .maybeSingle()

    if (error) throw toAppError(error)

    return (data ?? null) as unknown as AdminOrder | null
  } catch (err) {
    throw toAppError(err)
  }
}

export async function updateAdminOrderStatus(
  id: number,
  payload: UpdateOrderStatusPayload,
): Promise<AdminOrder> {
  try {
    const updateData: TablesUpdate<'orders'> = {
      status: payload.status,
    }
    if (payload.tracking_number !== undefined) {
      updateData.tracking_number = payload.tracking_number
    }
    if (payload.rep_name !== undefined) {
      updateData.rep_name = payload.rep_name
    }
    if (payload.rep_phone !== undefined) {
      updateData.rep_phone = payload.rep_phone
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select('*, order_items(*, products(name, name_ar, image_url))')
      .single()

    if (error) throw toAppError(error)

    return data as unknown as AdminOrder
  } catch (err) {
    throw toAppError(err)
  }
}

export async function updateAdminOrderFulfillment(
  id: number,
  payload: UpdateFulfillmentPayload,
): Promise<AdminOrder> {
  try {
    const updateData: TablesUpdate<'orders'> = {}
    if (payload.tracking_number !== undefined) {
      updateData.tracking_number = payload.tracking_number
    }
    if (payload.rep_name !== undefined) {
      updateData.rep_name = payload.rep_name
    }
    if (payload.rep_phone !== undefined) {
      updateData.rep_phone = payload.rep_phone
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select('*, order_items(*, products(name, name_ar, image_url))')
      .single()

    if (error) throw toAppError(error)

    return data as unknown as AdminOrder
  } catch (err) {
    throw toAppError(err)
  }
}

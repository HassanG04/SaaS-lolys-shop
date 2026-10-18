import { supabase } from '@/lib/supabase'
import { toAppError } from '@/lib/errors'
import type { CustomerNotification } from './types'

export async function fetchCustomerNotificationsApi(): Promise<CustomerNotification[]> {
  try {
    const { data, error } = await supabase
      .from('customer_notifications')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw toAppError(error)
    }

    return (data || []) as CustomerNotification[]
  } catch (err) {
    throw toAppError(err)
  }
}

export async function markNotificationReadApi(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('customer_notifications')
      .update({ is_read: true })
      .eq('id', id)

    if (error) {
      throw toAppError(error)
    }
  } catch (err) {
    throw toAppError(err)
  }
}

export async function markAllNotificationsReadApi(): Promise<void> {
  try {
    const { error } = await supabase.rpc('mark_all_notifications_read')

    if (error) {
      throw toAppError(error)
    }
  } catch (err) {
    throw toAppError(err)
  }
}

export async function deleteNotificationApi(id: string): Promise<void> {
  try {
    const { error } = await supabase.from('customer_notifications').delete().eq('id', id)

    if (error) {
      throw toAppError(error)
    }
  } catch (err) {
    throw toAppError(err)
  }
}

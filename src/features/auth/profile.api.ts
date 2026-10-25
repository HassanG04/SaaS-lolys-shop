import { AppError, toAppError } from '../../lib/errors'
import { supabase } from '../../lib/supabase'
import type { UserProfile } from './types'

const profileColumns =
  'id,role,full_name,phone,alt_phone,governorate_id,city,district,address,postal_code,floor,apartment,landmark,email' as const

export async function fetchProfileApi(userId: string): Promise<UserProfile | null> {
  try {
    let { data, error } = await supabase
      .from('profiles')
      .select(`${profileColumns},avatar_url`)
      .eq('id', userId)
      .maybeSingle()

    // Older hosted schemas may lack the optional photo migration. Preserve the
    // database role/address read, under the same RLS, only for this exact failure.
    // Permission, connection and other schema failures must remain visible.
    if (error?.code === '42703' && error.message === 'column profiles.avatar_url does not exist') {
      const fallback = await supabase
        .from('profiles')
        .select(profileColumns)
        .eq('id', userId)
        .maybeSingle()
      data = fallback.data ? { ...fallback.data, avatar_url: null } : null
      error = fallback.error
    }

    if (error) throw error
    if (!data) return null
    if (data.id !== userId || (data.role !== 'admin' && data.role !== 'customer')) {
      throw new AppError('SYS-001')
    }
    return data
  } catch (error) {
    throw toAppError(error)
  }
}

import { supabase } from '@/lib/supabase'
import { toAppError } from '@/lib/errors'
import type { CustomerStats, UpdateProfileInput } from './types'
import { validateAvatarFile, reencodeAvatar, generateAvatarStoragePath } from './avatarUpload'

export async function getCustomerStatsApi(): Promise<CustomerStats> {
  const { data, error } = await supabase
    .from('customer_stats')
    .select('orders_count, total_spent, favorite_product_id, favorite_product_name')
    .maybeSingle()

  if (error) {
    throw toAppError(error)
  }

  return {
    orders_count: Number(data?.orders_count ?? 0),
    total_spent: Number(data?.total_spent ?? 0),
    favorite_product_id: data?.favorite_product_id ? Number(data.favorite_product_id) : null,
    favorite_product_name: data?.favorite_product_name ?? null,
  }
}

export async function updateProfileApi(userId: string, input: UpdateProfileInput): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: input.full_name.trim(),
      phone: input.phone?.trim() || null,
      alt_phone: input.alt_phone?.trim() || null,
      governorate_id: input.governorate_id,
      city: input.city?.trim() || null,
      district: input.district?.trim() || null,
      address: input.address?.trim() || null,
      postal_code: input.postal_code?.trim() || null,
      floor: input.floor?.trim() || null,
      apartment: input.apartment?.trim() || null,
      landmark: input.landmark?.trim() || null,
    })
    .eq('id', userId)

  if (error) {
    throw toAppError(error)
  }
}

export async function uploadAvatarApi(
  userId: string,
  file: File | Blob,
  oldAvatarPath?: string | null,
): Promise<string> {
  // 1. Client-side signature and size validation
  const { extension, mimeType } = await validateAvatarFile(file)

  // 2. Browser canvas re-encoding: strips EXIF metadata & resizes to square
  const targetMime = mimeType === 'image/png' ? 'image/webp' : mimeType
  const reencodedBlob = await reencodeAvatar(file, 500, targetMime)
  const finalExt = mimeType === 'image/png' ? 'webp' : extension

  // 3. User-owned storage path: `{userId}/{uuid}.{ext}`
  const path = generateAvatarStoragePath(userId, finalExt)

  // 4. Upload to public 'avatars' bucket
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, reencodedBlob, {
      contentType: targetMime,
      upsert: false,
    })

  if (uploadError) {
    throw toAppError(uploadError)
  }

  // 5. Update profiles.avatar_url
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ avatar_url: path })
    .eq('id', userId)

  if (profileError) {
    // Rollback the uploaded object to prevent orphaned storage
    void supabase.storage.from('avatars').remove([path])
    throw toAppError(profileError)
  }

  // 6. Cleanup previous avatar if it exists and differs
  if (oldAvatarPath && oldAvatarPath !== path) {
    void supabase.storage.from('avatars').remove([oldAvatarPath])
  }

  return path
}

export async function removeAvatarApi(
  userId: string,
  currentAvatarPath?: string | null,
): Promise<void> {
  const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId)

  if (error) {
    throw toAppError(error)
  }

  if (currentAvatarPath) {
    void supabase.storage.from('avatars').remove([currentAvatarPath])
  }
}

import { supabase } from '@/lib/supabase'
import { toAppError, AppError } from '@/lib/errors'
import { validateProductImageFile, resizeAndEncodeImage } from '../products/imageUpload'
import { validateSettingValue } from './validators'
import {
  type ShopSettingsMap,
  type SettingKey,
  type SettingsAuditEntry,
  INSTAPAY_QR_PLACEHOLDER,
} from './types'

export const DEFAULT_SETTINGS: ShopSettingsMap = {
  shop_name_ar: "Lolys' Accessories & Home",
  shop_name_en: "Lolys' Accessories & Home",
  tagline_ar: '',
  phone: '',
  whatsapp: '',
  instagram: '',
  announcement_ar: '',
  hero_title_ar: 'إكسسوارات صنعت بكل حب',
  hero_subtitle_ar: 'قطع مميزة تناسب ذوقك وتضيف لمسة من الأناقة ليومك',
  sale_percent: 50,
  payment_methods_enabled: ['cod', 'instapay_qr'],
  instapay_qr_path: 'settings/instapay-qr-default.png',
  instapay_handle: '',
  returns_text_ar:
    'إمكانية الاسترجاع أو الاستبدال خلال 14 يوماً من الاستلام بشرط أن تكون المنتجات بحالتها الأصلية.',
  payment_window_hours: 24,
  pending_order_limit: 3,
}

/**
 * Returns all 16 shop settings from the shop_settings table.
 * Admin at AAL2 can read all rows (public and private).
 */
export async function getAdminSettings(): Promise<ShopSettingsMap> {
  try {
    const { data, error } = await supabase.from('shop_settings').select('*')
    if (error) {
      throw toAppError(error)
    }

    const settings: ShopSettingsMap = { ...DEFAULT_SETTINGS }
    for (const row of data ?? []) {
      const k = row.key as SettingKey
      if (k in settings) {
        ;(settings as unknown as Record<string, unknown>)[k] = row.value
      }
    }

    return settings
  } catch (err) {
    throw toAppError(err)
  }
}

/**
 * Updates a single shop setting via the admin_update_setting RPC.
 * Pre-validates against contract allow-list and typed constraints.
 */
export async function updateAdminSetting<K extends SettingKey>(
  key: K,
  value: ShopSettingsMap[K],
): Promise<void> {
  const check = validateSettingValue(key, value)
  if (!check.valid) {
    throw new AppError(check.errorHint ?? 'ADM-007')
  }

  try {
    const { error } = await supabase.rpc('admin_update_setting', {
      p_key: key,
      p_value: value,
    })

    if (error) {
      throw toAppError(error)
    }
  } catch (err) {
    throw toAppError(err)
  }
}

/**
 * Uploads a new InstaPay QR code image to storage, saves its path to shop_settings,
 * and removes the previous custom image if one existed.
 */
export async function uploadInstaPayQrImage(
  file: File | Blob,
  previousPath?: string | null,
): Promise<string> {
  await validateProductImageFile(file)
  const { blob, extension, contentType } = await resizeAndEncodeImage(file)

  const uuid = globalThis.crypto.randomUUID()
  const storagePath = `settings/instapay-qr-${uuid}.${extension}`

  try {
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(storagePath, blob, {
        contentType,
        upsert: true,
      })

    if (uploadError) {
      throw new AppError('UPL-003')
    }

    // Persist new path via RPC
    await updateAdminSetting('instapay_qr_path', storagePath)

    // Remove previous image from storage if it is an old custom QR code
    if (
      previousPath &&
      previousPath.startsWith('settings/') &&
      previousPath !== 'settings/instapay-qr-default.png' &&
      previousPath !== storagePath
    ) {
      void supabase.storage.from('product-images').remove([previousPath])
    }

    return storagePath
  } catch (err) {
    throw toAppError(err)
  }
}

/**
 * Returns public URL for the QR code image.
 * Uses placeholder SVG if path is empty or matches default seed placeholder.
 */
export function getPublicQrUrl(path?: string | null): string {
  if (!path || path === 'settings/instapay-qr-default.png') {
    return INSTAPAY_QR_PLACEHOLDER
  }
  const { data } = supabase.storage.from('product-images').getPublicUrl(path)
  return data.publicUrl
}

/**
 * Fetches recent audit log entries for shop_settings (latest 10).
 */
export async function getRecentSettingsAudit(): Promise<SettingsAuditEntry[]> {
  try {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .eq('entity', 'shop_settings')
      .order('at', { ascending: false })
      .limit(10)

    if (error) {
      throw toAppError(error)
    }

    return (data ?? []) as unknown as SettingsAuditEntry[]
  } catch (err) {
    throw toAppError(err)
  }
}

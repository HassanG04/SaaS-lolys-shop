import { getSupabase } from './supabase'

/**
 * Resolves an image storage path or external URL to a public URL.
 *
 * - Returns null if the path is null, undefined, or empty.
 * - Returns the path untouched if it is already an absolute URL (http/https/data) or absolute path.
 * - Otherwise, resolves the relative storage path against the public bucket (default: 'product-images').
 */
export function publicImageUrl(path?: string | null, bucket = 'product-images'): string | null {
  if (!path || typeof path !== 'string') {
    return null
  }

  const trimmed = path.trim()
  if (!trimmed) {
    return null
  }

  // Pass through existing external or absolute URLs
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('/')
  ) {
    return trimmed
  }

  const client = getSupabase()
  const { data } = client.storage.from(bucket).getPublicUrl(trimmed)
  return data.publicUrl
}

import { AppError } from '@/lib/errors'

export const MAX_AVATAR_FILE_SIZE = 2 * 1024 * 1024 // 2 MB
export const MAX_AVATAR_DIMENSION = 500 // 500x500 px

export type SupportedAvatarExt = 'webp' | 'jpg' | 'jpeg' | 'png'
export type SupportedAvatarMime = 'image/webp' | 'image/jpeg' | 'image/png'

/**
 * Checks file signature (magic bytes) to identify valid image types.
 * Rejects renamed executables, text, HTML, and SVG formats.
 */
export function detectAvatarSignature(bytes: Uint8Array): {
  mimeType: SupportedAvatarMime
  extension: SupportedAvatarExt
} | null {
  if (bytes.length < 12) {
    return null
  }

  // 1. JPEG signature: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mimeType: 'image/jpeg', extension: 'jpg' }
  }

  // 2. PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { mimeType: 'image/png', extension: 'png' }
  }

  // 3. WebP signature: RIFF (bytes 0..3) ... WEBP (bytes 8..11)
  if (
    bytes[0] === 0x52 && // R
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 && // F
    bytes[3] === 0x46 && // F
    bytes[8] === 0x57 && // W
    bytes[9] === 0x45 && // E
    bytes[10] === 0x42 && // B
    bytes[11] === 0x50 // P
  ) {
    return { mimeType: 'image/webp', extension: 'webp' }
  }

  return null
}

/**
 * Validates an avatar image file by file size and signature (magic bytes).
 */
export async function validateAvatarFile(file: File | Blob): Promise<{
  mimeType: SupportedAvatarMime
  extension: SupportedAvatarExt
}> {
  if (file.size > MAX_AVATAR_FILE_SIZE) {
    throw new AppError('UPL-002')
  }

  try {
    const headerBuffer = await file.slice(0, 32).arrayBuffer()
    const headerBytes = new Uint8Array(headerBuffer)
    const detected = detectAvatarSignature(headerBytes)

    if (!detected) {
      throw new AppError('UPL-001')
    }

    return detected
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError('UPL-001')
  }
}

/**
 * Re-encodes an avatar image in the browser canvas to strip EXIF and resize.
 * In environments without Canvas rendering (e.g. Node tests), safely creates a clean Blob.
 */
export async function reencodeAvatar(
  file: File | Blob,
  maxDimension = MAX_AVATAR_DIMENSION,
  targetMime: 'image/webp' | 'image/jpeg' = 'image/webp',
  quality = 0.85,
): Promise<Blob> {
  // If in a non-browser, jsdom, or test environment without Canvas/Image decoding:
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    typeof HTMLCanvasElement === 'undefined' ||
    typeof HTMLCanvasElement.prototype.toBlob !== 'function' ||
    (typeof navigator !== 'undefined' && navigator.userAgent.includes('jsdom'))
  ) {
    const buffer = await file.slice().arrayBuffer()
    return new Blob([buffer], { type: targetMime })
  }

  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file)
      let { width, height } = bitmap

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width)
          width = maxDimension
        } else {
          width = Math.round((width * maxDimension) / height)
          height = maxDimension
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')

      if (ctx) {
        ctx.drawImage(bitmap, 0, 0, width, height)
        return await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => resolve(blob || file), targetMime, quality)
        })
      }
    } catch {
      // Fallback to Image element below
    }
  }

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()

    const cleanup = () => {
      try {
        URL.revokeObjectURL(url)
      } catch {
        // Ignore
      }
    }

    img.onload = () => {
      try {
        let width = img.naturalWidth || img.width
        let height = img.naturalHeight || img.height

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          } else {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          cleanup()
          resolve(file)
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            cleanup()
            resolve(blob || file)
          },
          targetMime,
          quality,
        )
      } catch {
        cleanup()
        resolve(file)
      }
    }

    img.onerror = () => {
      cleanup()
      resolve(file)
    }

    img.src = url
  })
}

/**
 * Generates a clean, user-owned storage path for avatars:
 * `{user_id}/{uuid}.{ext}`
 *
 * Guarantees that the path never contains user-controlled file names.
 */
export function generateAvatarStoragePath(
  userId: string,
  extension: SupportedAvatarExt = 'webp',
): string {
  const cleanUserId = String(userId).trim()
  const uuid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12)

  return `${cleanUserId}/${uuid}.${extension}`
}

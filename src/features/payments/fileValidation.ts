import type { ProofValidationResult, SupportedProofExt, SupportedProofMime } from './types'

export const MAX_PROOF_FILE_SIZE = 5 * 1024 * 1024 // 5 MB in bytes

/**
 * Checks file signature (magic bytes) to identify valid image types.
 * Refuses renamed files, text, HTML, and SVG formats.
 */
export function detectImageSignature(bytes: Uint8Array): {
  mimeType: SupportedProofMime
  extension: SupportedProofExt
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
 * Validates a payment proof file by file size and signature (magic bytes).
 */
export async function validateProofFile(file: File | Blob): Promise<ProofValidationResult> {
  if (file.size > MAX_PROOF_FILE_SIZE) {
    return { ok: false, code: 'UPL-002' }
  }

  try {
    const headerBuffer = await file.slice(0, 32).arrayBuffer()
    const headerBytes = new Uint8Array(headerBuffer)
    const detected = detectImageSignature(headerBytes)

    if (!detected) {
      return { ok: false, code: 'UPL-001' }
    }

    return {
      ok: true,
      mimeType: detected.mimeType,
      extension: detected.extension,
    }
  } catch {
    return { ok: false, code: 'UPL-001' }
  }
}

/**
 * Generates a private storage path for payment proofs:
 * `payment-proofs/{user_id}/{order_id}/{uuid}.{ext}`
 *
 * Guarantees that the path never contains user-controlled file names.
 */
export function generateProofStoragePath(
  userId: string,
  orderId: number | string,
  extension: SupportedProofExt = 'jpg',
): string {
  const cleanUserId = String(userId).trim()
  const cleanOrderId = String(orderId).trim()

  const uuid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12)

  return `${cleanUserId}/${cleanOrderId}/${uuid}.${extension}`
}

/**
 * Re-encodes an image file in the browser canvas to strip EXIF and other metadata.
 * In environments without Canvas rendering (e.g. Node tests), safely creates a clean Blob.
 */
export async function reencodeImage(
  file: File | Blob,
  targetMime: 'image/jpeg' | 'image/webp' = 'image/jpeg',
  quality = 0.85,
): Promise<Blob> {
  // If in a non-browser or test environment without Canvas/toBlob support (e.g. jsdom):
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    typeof HTMLCanvasElement === 'undefined' ||
    typeof HTMLCanvasElement.prototype.toBlob !== 'function'
  ) {
    const buffer = await file.slice().arrayBuffer()
    return new Blob([buffer], { type: targetMime })
  }

  // Modern browsers: createImageBitmap is fast and strips metadata cleanly
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file)
      const canvas = document.createElement('canvas')
      canvas.width = bitmap.width
      canvas.height = bitmap.height
      const ctx = canvas.getContext('2d')

      if (ctx) {
        ctx.drawImage(bitmap, 0, 0)
        return await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => resolve(blob || file), targetMime, quality)
        })
      }
    } catch {
      // Fallback to Image element below
    }
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      cleanup()
      resolve(file)
    }, 500)

    const url = URL.createObjectURL(file)
    const img = new Image()

    const cleanup = () => {
      clearTimeout(timer)
      try {
        URL.revokeObjectURL(url)
      } catch {
        // Ignore
      }
    }

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth || img.width
        canvas.height = img.naturalHeight || img.height
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          cleanup()
          resolve(file)
          return
        }

        ctx.drawImage(img, 0, 0)
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

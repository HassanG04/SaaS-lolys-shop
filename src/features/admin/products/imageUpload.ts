import { AppError } from '@/lib/errors'

export const MAX_PRODUCT_IMAGE_INPUT_SIZE = 5 * 1024 * 1024 // 5 MB max input file
export const MAX_IMAGE_DIMENSION = 1200 // 1200px max width or height

export type SupportedImageExt = 'webp' | 'jpg' | 'jpeg' | 'png'
export type SupportedImageMime = 'image/webp' | 'image/jpeg' | 'image/png'

/**
 * Inspects file signature (magic bytes) to verify it is an actual JPEG, PNG, or WebP.
 * Refuses text, SVG, HTML, or renamed executables with code UPL-001.
 */
export function detectProductImageSignature(bytes: Uint8Array): {
  mimeType: SupportedImageMime
  extension: SupportedImageExt
} | null {
  if (bytes.length < 12) {
    return null
  }

  // 1. JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mimeType: 'image/jpeg', extension: 'jpg' }
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
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

  // 3. WebP: RIFF (bytes 0..3) ... WEBP (bytes 8..11)
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { mimeType: 'image/webp', extension: 'webp' }
  }

  return null
}

/**
 * Validates product image file size and magic bytes signature.
 * Throws AppError('UPL-001') for non-images and AppError('UPL-002') for files > 5MB.
 */
export async function validateProductImageFile(file: File | Blob): Promise<{
  mimeType: SupportedImageMime
  extension: SupportedImageExt
}> {
  if (file.size > MAX_PRODUCT_IMAGE_INPUT_SIZE) {
    throw new AppError('UPL-002')
  }

  try {
    const headerBuffer = await file.slice(0, 32).arrayBuffer()
    const headerBytes = new Uint8Array(headerBuffer)
    const detected = detectProductImageSignature(headerBytes)

    if (!detected) {
      throw new AppError('UPL-001')
    }

    return detected
  } catch (err) {
    if (err instanceof AppError) {
      throw err
    }
    throw new AppError('UPL-001')
  }
}

/**
 * Calculates scaled dimensions keeping aspect ratio within maxDimension.
 */
export function calculateTargetDimensions(
  width: number,
  height: number,
  maxDimension = MAX_IMAGE_DIMENSION,
): { width: number; height: number } {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height }
  }

  if (width > height) {
    const scale = maxDimension / width
    return {
      width: maxDimension,
      height: Math.round(height * scale),
    }
  }

  const scale = maxDimension / height
  return {
    width: Math.round(width * scale),
    height: maxDimension,
  }
}

/**
 * Tests if the current browser environment supports WebP canvas export.
 */
export function isWebpSupportedInCanvas(): boolean {
  if (
    typeof document === 'undefined' ||
    typeof HTMLCanvasElement === 'undefined' ||
    typeof HTMLCanvasElement.prototype.toDataURL !== 'function'
  ) {
    return false
  }
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    return canvas.toDataURL('image/webp').startsWith('data:image/webp')
  } catch {
    return false
  }
}

/**
 * Resizes the image to at most 1200px and re-encodes to WebP (or JPEG fallback).
 */
export async function resizeAndEncodeImage(
  file: File | Blob,
  maxDimension = MAX_IMAGE_DIMENSION,
  quality = 0.85,
): Promise<{ blob: Blob; extension: 'webp' | 'jpg'; contentType: string }> {
  const preferWebp = isWebpSupportedInCanvas()
  const targetMime = preferWebp ? 'image/webp' : 'image/jpeg'
  const targetExt = preferWebp ? 'webp' : 'jpg'

  // If running in a test or headless environment without canvas/Image:
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    typeof HTMLCanvasElement === 'undefined' ||
    typeof HTMLCanvasElement.prototype.toBlob !== 'function'
  ) {
    const buffer = await file.slice().arrayBuffer()
    return {
      blob: new Blob([buffer], { type: targetMime }),
      extension: targetExt,
      contentType: targetMime,
    }
  }

  // 1. Try createImageBitmap (modern, off-thread)
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file)
      const { width, height } = calculateTargetDimensions(bitmap.width, bitmap.height, maxDimension)

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')

      if (ctx) {
        ctx.drawImage(bitmap, 0, 0, width, height)
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b || file), targetMime, quality)
        })
        return {
          blob,
          extension: targetExt,
          contentType: targetMime,
        }
      }
    } catch {
      // Fallback to HTMLImageElement
    }
  }

  // 2. Fallback to HTMLImageElement
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(url)
      const { width, height } = calculateTargetDimensions(
        img.naturalWidth,
        img.naturalHeight,
        maxDimension,
      )

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        resolve({
          blob: file,
          extension: targetExt,
          contentType: targetMime,
        })
        return
      }

      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          resolve({
            blob: blob || file,
            extension: targetExt,
            contentType: targetMime,
          })
        },
        targetMime,
        quality,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new AppError('UPL-001'))
    }

    img.src = url
  })
}

/**
 * Generates storage path: products/{productId}/{uuid}.{ext}
 * Note: Never includes bucket prefix, only relative storage key matching DB constraint.
 */
export function generateProductStoragePath(
  productId: number | string,
  extension: 'webp' | 'jpg',
): string {
  const cleanId = String(productId).trim()
  const uuid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10)

  return `products/${cleanId}/${uuid}.${extension}`
}

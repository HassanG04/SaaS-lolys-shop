import type { CartStoredItem } from './types'

export const CART_STORAGE_KEY = 'cart:v1'

/**
 * Loads cart items from localStorage.
 * Filters out invalid entries and merges duplicate product IDs.
 */
export function loadCart(): CartStoredItem[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return []
  }

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    const mergedMap = new Map<number, number>()

    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue

      const productId = Number((item as Record<string, unknown>).productId)
      const quantity = Number((item as Record<string, unknown>).quantity)

      if (
        !Number.isInteger(productId) ||
        productId <= 0 ||
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        continue
      }

      const existing = mergedMap.get(productId) ?? 0
      mergedMap.set(productId, existing + quantity)
    }

    return Array.from(mergedMap.entries()).map(([productId, quantity]) => ({
      productId,
      quantity,
    }))
  } catch {
    return []
  }
}

/**
 * Persists cart items to localStorage.
 * Strictly writes only `{ productId, quantity }`.
 */
export function saveCart(items: CartStoredItem[]): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return
  }

  try {
    const payload = items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    }))
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Gracefully handle storage quota or private-browsing errors
  }
}

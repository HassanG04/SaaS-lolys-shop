import type { CartStoredItem } from './types'

export const CART_STORAGE_KEY = 'cart:v1'

/**
 * Loads cart items from localStorage.
 * Filters out invalid entries and merges duplicate product IDs.
 */
export function loadCart(): CartStoredItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    if (!Array.isArray(parsed)) return []
    const map = new Map<number, number>()
    for (const item of parsed) {
      const p = item?.productId,
        q = item?.quantity
      if (Number.isInteger(p) && p > 0 && Number.isInteger(q) && q > 0) {
        map.set(p, (map.get(p) ?? 0) + q)
      }
    }
    return Array.from(map, ([productId, quantity]) => ({ productId, quantity }))
  } catch {
    return []
  }
}

export function saveCart(items: CartStoredItem[]): void {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Ignore storage quota/security errors
  }
}

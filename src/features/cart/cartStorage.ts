import type { CartStoredItem } from './types'

export const CART_STORAGE_KEY = 'cart:v1'

/**
 * Loads cart items from localStorage.
 * Filters out invalid entries and merges duplicate product IDs.
 */
export function loadCart(): CartStoredItem[] {
  if (typeof window === 'undefined' || !window.localStorage) return []
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const map = new Map<number, number>()
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue
      const { productId, quantity } = item as Record<string, number>
      if (
        Number.isInteger(productId) &&
        productId > 0 &&
        Number.isInteger(quantity) &&
        quantity > 0
      ) {
        map.set(productId, (map.get(productId) ?? 0) + quantity)
      }
    }
    return Array.from(map, ([productId, quantity]) => ({ productId, quantity }))
  } catch {
    return []
  }
}

export function saveCart(items: CartStoredItem[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify(items.map(({ productId, quantity }) => ({ productId, quantity }))),
    )
  } catch {
    // quota
  }
}

import type { CartAction, CartStoredItem } from './types'

/**
 * Pure cart reducer managing stored cart items.
 */
const clampStock = (qty: number, max?: number) =>
  typeof max === 'number' ? Math.min(qty, Math.max(0, max)) : qty

export function cartReducer(state: CartStoredItem[], action: CartAction): CartStoredItem[] {
  switch (action.type) {
    case 'ADD_ITEM': {
      const add = action.quantity ?? 1
      if (add <= 0) return state
      const idx = state.findIndex((item) => item.productId === action.productId)
      if (idx >= 0) {
        const q = clampStock(state[idx].quantity + add, action.maxStock)
        return q <= 0
          ? state.filter((_, i) => i !== idx)
          : state.map((item, i) => (i === idx ? { ...item, quantity: q } : item))
      }
      const q = clampStock(add, action.maxStock)
      return q <= 0 ? state : [...state, { productId: action.productId, quantity: q }]
    }
    case 'UPDATE_QUANTITY': {
      const q = clampStock(action.quantity, action.maxStock)
      if (q <= 0) return state.filter((item) => item.productId !== action.productId)
      return state.some((item) => item.productId === action.productId)
        ? state.map((item) =>
            item.productId === action.productId ? { ...item, quantity: q } : item,
          )
        : [...state, { productId: action.productId, quantity: q }]
    }
    case 'REMOVE_ITEM':
      return state.filter((item) => item.productId !== action.productId)
    case 'CLEAR_CART':
      return []
    case 'SYNC_STOCK': {
      const valid = new Set(action.validProductIds)
      return state
        .filter((item) => valid.has(item.productId))
        .map((item) => {
          const liveStock = action.stockMap[item.productId]
          return typeof liveStock === 'number'
            ? { ...item, quantity: clampStock(item.quantity, liveStock) }
            : item
        })
        .filter((item) => item.quantity > 0)
    }
    default:
      return state
  }
}

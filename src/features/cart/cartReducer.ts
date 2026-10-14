import type { CartAction, CartStoredItem } from './types'

/**
 * Pure cart reducer managing stored cart items.
 */
export function cartReducer(state: CartStoredItem[], action: CartAction): CartStoredItem[] {
  switch (action.type) {
    case 'ADD_ITEM': {
      const quantityToAdd = action.quantity ?? 1
      if (quantityToAdd <= 0) {
        return state
      }

      const existingIndex = state.findIndex((item) => item.productId === action.productId)

      if (existingIndex >= 0) {
        const existing = state[existingIndex]
        let newQuantity = existing.quantity + quantityToAdd

        if (typeof action.maxStock === 'number') {
          newQuantity = Math.min(newQuantity, Math.max(0, action.maxStock))
        }

        if (newQuantity <= 0) {
          return state.filter((_, idx) => idx !== existingIndex)
        }

        return state.map((item, idx) =>
          idx === existingIndex ? { ...item, quantity: newQuantity } : item,
        )
      }

      let initialQuantity = quantityToAdd
      if (typeof action.maxStock === 'number') {
        initialQuantity = Math.min(initialQuantity, Math.max(0, action.maxStock))
      }

      if (initialQuantity <= 0) {
        return state
      }

      return [...state, { productId: action.productId, quantity: initialQuantity }]
    }

    case 'UPDATE_QUANTITY': {
      if (action.quantity <= 0) {
        return state.filter((item) => item.productId !== action.productId)
      }

      let finalQuantity = action.quantity
      if (typeof action.maxStock === 'number') {
        finalQuantity = Math.min(finalQuantity, Math.max(0, action.maxStock))
      }

      if (finalQuantity <= 0) {
        return state.filter((item) => item.productId !== action.productId)
      }

      const exists = state.some((item) => item.productId === action.productId)
      if (!exists) {
        return [...state, { productId: action.productId, quantity: finalQuantity }]
      }

      return state.map((item) =>
        item.productId === action.productId ? { ...item, quantity: finalQuantity } : item,
      )
    }

    case 'REMOVE_ITEM': {
      return state.filter((item) => item.productId !== action.productId)
    }

    case 'CLEAR_CART': {
      return []
    }

    case 'SYNC_STOCK': {
      const validSet = new Set(action.validProductIds)

      return state
        .filter((item) => validSet.has(item.productId))
        .map((item) => {
          const liveStock = action.stockMap[item.productId]
          if (typeof liveStock === 'number') {
            const clamped = Math.max(0, Math.min(item.quantity, liveStock))
            return { ...item, quantity: clamped }
          }
          return item
        })
        .filter((item) => item.quantity > 0)
    }

    default:
      return state
  }
}

import type { ProductWithCategory } from '../catalog'

/**
 * Persisted cart item format in localStorage ('cart:v1').
 * Strictly stores only productId and quantity to maintain database authority.
 */
export interface CartStoredItem {
  productId: number
  quantity: number
}

/**
 * Rich hydrated line item combined with live product data.
 */
export interface CartLine {
  productId: number
  quantity: number
  product: ProductWithCategory | null
  unitPrice: number
  originalPrice: number | null
  hasDiscount: boolean
  discountPercent: number
  lineTotal: number
  isOutOfStock: boolean
  maxStock: number
  isStale: boolean
}

export type CartAction =
  | { type: 'ADD_ITEM'; productId: number; quantity?: number; maxStock?: number }
  | { type: 'UPDATE_QUANTITY'; productId: number; quantity: number; maxStock?: number }
  | { type: 'REMOVE_ITEM'; productId: number }
  | { type: 'CLEAR_CART' }
  | {
      type: 'SYNC_STOCK'
      stockMap: Record<number, number>
      validProductIds: number[]
    }

export interface CartContextValue {
  items: CartStoredItem[]
  lines: CartLine[]
  totalCount: number
  itemCount: number
  subtotal: number
  isLoading: boolean
  isDrawerOpen: boolean
  openDrawer: () => void
  closeDrawer: () => void
  toggleDrawer: () => void
  addItem: (productId: number, quantity?: number, maxStock?: number) => void
  updateQuantity: (productId: number, quantity: number, maxStock?: number) => void
  removeItem: (productId: number) => void
  clearCart: () => void
}

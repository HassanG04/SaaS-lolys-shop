import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useMemo,
  useCallback,
  useState,
  type ReactNode,
} from 'react'
import { useCartProductsByIds } from './api'
import { loadCart, saveCart } from './cartStorage'
import { cartReducer } from './cartReducer'
import type { CartContextValue, CartLine, CartStoredItem } from './types'

const CartContext = createContext<CartContextValue | null>(null)

interface CartProviderProps {
  children: ReactNode
  initialItems?: CartStoredItem[]
}

export function CartProvider({ children, initialItems }: CartProviderProps) {
  const [items, dispatch] = useReducer(cartReducer, undefined, () => initialItems ?? loadCart())
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Persist to localStorage whenever stored items change
  useEffect(() => {
    saveCart(items)
  }, [items])

  // Extract all unique product IDs currently in cart
  const productIds = useMemo(() => items.map((item) => item.productId), [items])

  // Live product data query for fresh pricing and stock validation
  const { data: liveProducts, isLoading: isProductsLoading } = useCartProductsByIds(productIds)

  // Live re-validation: clamp to live stock and remove stale/deleted products
  useEffect(() => {
    if (!liveProducts || productIds.length === 0) return

    const validProductIds: number[] = []
    const stockMap: Record<number, number> = {}

    for (const p of liveProducts) {
      if (p && p.is_active) {
        validProductIds.push(p.id)
        stockMap[p.id] = p.stock_quantity ?? 0
      }
    }

    let needsSync = false
    for (const item of items) {
      if (!validProductIds.includes(item.productId)) {
        needsSync = true
        break
      }
      const available = stockMap[item.productId]
      if (typeof available === 'number' && item.quantity > available) {
        needsSync = true
        break
      }
    }

    if (needsSync) {
      dispatch({
        type: 'SYNC_STOCK',
        stockMap,
        validProductIds,
      })
    }
  }, [liveProducts, items, productIds])

  // Hydrate stored items into rich CartLine representations
  const lines: CartLine[] = useMemo(() => {
    if (!items.length) return []
    const productMap = new Map((liveProducts ?? []).map((p) => [p.id, p]))

    return items.map((item) => {
      const product = productMap.get(item.productId) ?? null
      const isStale = Boolean(liveProducts && !product)
      const hasDiscount = Boolean(product?.discount_percent && product.discount_percent > 0)
      const unitPrice =
        typeof product?.final_price === 'number'
          ? product.final_price
          : hasDiscount && product
            ? Math.round(product.price * (1 - (product.discount_percent ?? 0) / 100))
            : (product?.price ?? 0)
      const originalPrice = hasDiscount && product ? product.price : null
      const discountPercent = product?.discount_percent ?? 0
      const maxStock = product ? Math.max(0, product.stock_quantity) : 0
      const isOutOfStock = Boolean(product && (!product.in_stock || maxStock <= 0))
      const lineTotal = unitPrice * item.quantity

      return {
        productId: item.productId,
        quantity: item.quantity,
        product,
        unitPrice,
        originalPrice,
        hasDiscount,
        discountPercent,
        lineTotal,
        isOutOfStock,
        maxStock,
        isStale,
      }
    })
  }, [items, liveProducts])

  const totalCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items])

  const itemCount = items.length

  const subtotal = useMemo(
    () => lines.reduce((sum, line) => sum + (line.isOutOfStock ? 0 : line.lineTotal), 0),
    [lines],
  )

  const openDrawer = useCallback(() => setIsDrawerOpen(true), [])
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), [])
  const toggleDrawer = useCallback(() => setIsDrawerOpen((prev) => !prev), [])

  const addItem = useCallback((productId: number, quantity = 1, maxStock?: number) => {
    dispatch({ type: 'ADD_ITEM', productId, quantity, maxStock })
  }, [])

  const updateQuantity = useCallback((productId: number, quantity: number, maxStock?: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', productId, quantity, maxStock })
  }, [])

  const removeItem = useCallback((productId: number) => {
    dispatch({ type: 'REMOVE_ITEM', productId })
  }, [])

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR_CART' })
  }, [])

  const value: CartContextValue = {
    items,
    lines,
    totalCount,
    itemCount,
    subtotal,
    isLoading: isProductsLoading && productIds.length > 0,
    isDrawerOpen,
    openDrawer,
    closeDrawer,
    toggleDrawer,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

const defaultCartContext: CartContextValue = {
  items: [],
  lines: [],
  totalCount: 0,
  itemCount: 0,
  subtotal: 0,
  isLoading: false,
  isDrawerOpen: false,
  openDrawer: () => {},
  closeDrawer: () => {},
  toggleDrawer: () => {},
  addItem: () => {},
  updateQuantity: () => {},
  removeItem: () => {},
  clearCart: () => {},
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext)
  return context ?? defaultCartContext
}

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

export const CartContext = createContext<CartContextValue | null>(null)

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
    if (!liveProducts || !productIds.length) return
    const valid: number[] = []
    const stockMap: Record<number, number> = {}
    for (const p of liveProducts) {
      if (p?.is_active) {
        valid.push(p.id)
        stockMap[p.id] = p.stock_quantity ?? 0
      }
    }
    if (
      items.some(
        (i) => !valid.includes(i.productId) || i.quantity > (stockMap[i.productId] ?? Infinity),
      )
    ) {
      dispatch({ type: 'SYNC_STOCK', stockMap, validProductIds: valid })
    }
  }, [liveProducts, items, productIds])

  // Hydrate stored items into rich CartLine representations
  const lines: CartLine[] = useMemo(() => {
    if (!items.length) return []
    const productMap = new Map((liveProducts ?? []).map((p) => [p.id, p]))

    return items.map((item) => {
      const p = productMap.get(item.productId) ?? null
      const disc = p?.discount_percent ?? 0
      const hasDiscount = disc > 0
      const unitPrice =
        typeof p?.final_price === 'number'
          ? p.final_price
          : hasDiscount && p
            ? Math.round(p.price * (1 - disc / 100))
            : (p?.price ?? 0)
      const maxStock = p ? Math.max(0, p.stock_quantity) : 0

      return {
        productId: item.productId,
        quantity: item.quantity,
        product: p,
        unitPrice,
        originalPrice: hasDiscount && p ? p.price : null,
        hasDiscount,
        discountPercent: disc,
        lineTotal: unitPrice * item.quantity,
        isOutOfStock: Boolean(p && (!p.in_stock || maxStock <= 0)),
        maxStock,
        isStale: Boolean(liveProducts && !p),
      }
    })
  }, [items, liveProducts])

  const totalCount = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items])
  const itemCount = items.length
  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + (l.isOutOfStock ? 0 : l.lineTotal), 0),
    [lines],
  )

  const openDrawer = useCallback(() => setIsDrawerOpen(true), [])
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), [])
  const toggleDrawer = useCallback(() => setIsDrawerOpen((p) => !p), [])
  const addItem = useCallback(
    (productId: number, quantity = 1, maxStock?: number) =>
      dispatch({ type: 'ADD_ITEM', productId, quantity, maxStock }),
    [],
  )
  const updateQuantity = useCallback(
    (productId: number, quantity: number, maxStock?: number) =>
      dispatch({ type: 'UPDATE_QUANTITY', productId, quantity, maxStock }),
    [],
  )
  const removeItem = useCallback(
    (productId: number) => dispatch({ type: 'REMOVE_ITEM', productId }),
    [],
  )
  const clearCart = useCallback(() => dispatch({ type: 'CLEAR_CART' }), [])

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

const fallbackCart = new Proxy(
  {
    items: [],
    lines: [],
    totalCount: 0,
    itemCount: 0,
    subtotal: 0,
    isLoading: false,
    isDrawerOpen: false,
  } as unknown as CartContextValue,
  {
    get: (target, prop) =>
      prop in target ? (target as unknown as Record<string, unknown>)[prop as string] : () => {},
  },
)

export function useCart(): CartContextValue {
  return useContext(CartContext) ?? fallbackCart
}

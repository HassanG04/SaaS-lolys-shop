import { useQuery } from '@tanstack/react-query'
import type { ProductWithCategory } from '../catalog/types'

export async function getCartProductsByIds(ids: number[]): Promise<ProductWithCategory[]> {
  const validIds = Array.from(
    new Set(ids.filter((id) => typeof id === 'number' && !Number.isNaN(id) && id > 0)),
  )
  if (validIds.length === 0) {
    return []
  }

  const { fetchCartProducts } = await import('./cartProducts.api')
  return fetchCartProducts(validIds)
}

export function useCartProductsByIds(ids: number[]) {
  const validIds = Array.from(
    new Set(ids.filter((id) => typeof id === 'number' && !Number.isNaN(id) && id > 0)),
  ).sort((a, b) => a - b)

  const queryKey = ['catalog', 'products', validIds.join(',')]

  return useQuery<ProductWithCategory[], Error>({
    queryKey,
    queryFn: () => (validIds.length > 0 ? getCartProductsByIds(validIds) : Promise.resolve([])),
    enabled: validIds.length > 0,
    staleTime: 60 * 1000,
  })
}

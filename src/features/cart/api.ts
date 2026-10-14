import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ProductWithCategory } from '../catalog/types'
import type { Tables } from '@/types'

type RawProductRow = Tables<'products'> & {
  categories?: { id: number; name: string; name_ar: string | null; slug: string } | null
  category?: { id: number; name: string; name_ar: string | null; slug: string } | null
}

export async function getCartProductsByIds(ids: number[]): Promise<ProductWithCategory[]> {
  const validIds = Array.from(
    new Set(ids.filter((id) => typeof id === 'number' && !Number.isNaN(id) && id > 0)),
  )
  if (validIds.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from('products')
    .select('*, categories(id, name, name_ar, slug)')
    .in('id', validIds)
    .eq('is_active', true)

  if (error) {
    throw error
  }

  return ((data ?? []) as unknown as RawProductRow[]).map((raw) => ({
    ...raw,
    category: raw.categories ?? raw.category ?? null,
  }))
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

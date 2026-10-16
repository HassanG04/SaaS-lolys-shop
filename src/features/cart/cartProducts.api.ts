import { supabase } from '@/lib/supabase'
import type { ProductWithCategory } from '../catalog/types'
import type { Tables } from '@/types'

type RawProductRow = Tables<'products'> & {
  categories?: { id: number; name: string; name_ar: string | null; slug: string } | null
  category?: { id: number; name: string; name_ar: string | null; slug: string } | null
}

export async function fetchCartProducts(ids: number[]): Promise<ProductWithCategory[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, categories(id, name, name_ar, slug)')
    .in('id', ids)
    .eq('is_active', true)

  if (error) {
    throw error
  }

  return ((data ?? []) as unknown as RawProductRow[]).map((raw) => ({
    ...raw,
    category: raw.categories ?? raw.category ?? null,
  }))
}

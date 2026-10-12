import { supabase } from '@/lib/supabase'
import { toAppError, AppError } from '@/lib/errors'
import type { Tables } from '@/types'
import type {
  AdminProduct,
  AdminCategorySummary,
  UpdateProductStockParams,
  UpdateProductActiveParams,
} from './types'

type RawAdminProductRow = Tables<'products'> & {
  categories?: AdminCategorySummary | null
  category?: AdminCategorySummary | null
}

function normalizeAdminProduct(raw: RawAdminProductRow): AdminProduct {
  const category = raw.categories ?? raw.category ?? null
  return {
    ...raw,
    category,
    categories: category,
    extra_images: Array.isArray(raw.extra_images) ? raw.extra_images : [],
  }
}

/**
 * Fetches all products (active and inactive) for admin management.
 */
export async function getAdminProducts(): Promise<AdminProduct[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, categories:category_id (id, name, name_ar, slug)')
      .order('id', { ascending: false })

    if (error) {
      throw toAppError(error)
    }

    return (data ?? []).map((row) => normalizeAdminProduct(row as RawAdminProductRow))
  } catch (err) {
    throw toAppError(err)
  }
}

/**
 * Fetches all categories for filtering in the admin products list.
 */
export async function getAdminCategories(): Promise<AdminCategorySummary[]> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, name_ar, slug')
      .order('sort_order', { ascending: true })

    if (error) {
      throw toAppError(error)
    }

    return (data ?? []) as AdminCategorySummary[]
  } catch (err) {
    throw toAppError(err)
  }
}

/**
 * Updates a product's stock quantity.
 * Rejects negative stock quantities (< 0).
 */
export async function updateProductStock({
  productId,
  newQuantity,
}: UpdateProductStockParams): Promise<AdminProduct> {
  if (
    typeof newQuantity !== 'number' ||
    !Number.isFinite(newQuantity) ||
    !Number.isInteger(newQuantity) ||
    newQuantity < 0
  ) {
    throw new AppError('ORD-006')
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .update({ stock_quantity: newQuantity })
      .eq('id', productId)
      .select('*, categories:category_id (id, name, name_ar, slug)')
      .single()

    if (error) {
      throw toAppError(error)
    }

    return normalizeAdminProduct(data as RawAdminProductRow)
  } catch (err) {
    throw toAppError(err)
  }
}

/**
 * Updates a product's active (is_active) status.
 */
export async function updateProductActive({
  productId,
  isActive,
}: UpdateProductActiveParams): Promise<AdminProduct> {
  try {
    const { data, error } = await supabase
      .from('products')
      .update({ is_active: isActive })
      .eq('id', productId)
      .select('*, categories:category_id (id, name, name_ar, slug)')
      .single()

    if (error) {
      throw toAppError(error)
    }

    return normalizeAdminProduct(data as RawAdminProductRow)
  } catch (err) {
    throw toAppError(err)
  }
}

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

import {
  buildProductInsertPayload,
  buildProductUpdatePayload,
  type ProductInputForm,
} from './payloadBuilder'

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

/**
 * Fetches a single product by ID for admin viewing / editing.
 */
export async function getAdminProductById(productId: number): Promise<AdminProduct> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, categories:category_id (id, name, name_ar, slug)')
      .eq('id', productId)
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
 * Creates a new product.
 * Uses buildProductInsertPayload to strictly omit generated and DB-maintained columns.
 */
export async function createAdminProduct(formData: ProductInputForm): Promise<AdminProduct> {
  try {
    const payload = buildProductInsertPayload(formData)

    const { data, error } = await supabase
      .from('products')
      .insert(payload)
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
 * Updates an existing product.
 * Uses buildProductUpdatePayload to strictly omit generated and DB-maintained columns.
 */
export async function updateAdminProduct(
  productId: number,
  formData: Partial<ProductInputForm>,
): Promise<AdminProduct> {
  try {
    const payload = buildProductUpdatePayload(formData)

    const { data, error } = await supabase
      .from('products')
      .update(payload)
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
 * Permanently deletes a product via admin_delete_product RPC.
 * Throws AppError('ADM-004') if the product has already been ordered.
 */
export async function deleteAdminProduct(productId: number): Promise<void> {
  try {
    const { error } = await supabase.rpc('admin_delete_product', {
      p_id: productId,
    })

    if (error) {
      throw toAppError(error)
    }
  } catch (err) {
    throw toAppError(err)
  }
}

/**
 * Archives a product (sets is_active to false).
 */
export async function archiveAdminProduct(productId: number): Promise<AdminProduct> {
  return updateProductActive({ productId, isActive: false })
}

/**
 * Restores an archived product (sets is_active to true).
 */
export async function restoreAdminProduct(productId: number): Promise<AdminProduct> {
  return updateProductActive({ productId, isActive: true })
}

import {
  validateProductImageFile,
  resizeAndEncodeImage,
  generateProductStoragePath,
} from './imageUpload'

/**
 * Validates, resizes, re-encodes, and uploads an image to `product-images` bucket.
 * Returns the relative storage path to be stored in the database.
 */
export async function uploadProductImage(
  file: File | Blob,
  productId: number | string,
): Promise<string> {
  await validateProductImageFile(file)
  const { blob, extension, contentType } = await resizeAndEncodeImage(file)
  const storagePath = generateProductStoragePath(productId, extension)

  const { error } = await supabase.storage.from('product-images').upload(storagePath, blob, {
    contentType,
    upsert: true,
  })

  if (error) {
    throw new AppError('UPL-001')
  }

  return storagePath
}

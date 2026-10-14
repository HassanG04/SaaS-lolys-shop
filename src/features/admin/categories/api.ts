import { supabase } from '@/lib/supabase'
import { toAppError, AppError } from '@/lib/errors'
import type { AdminCategory, CategoryCreateData, CategoryUpdateData } from './types'

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** Validates a slug matches the DB check constraint pattern. */
export function validateSlug(slug: string): boolean {
  return SLUG_RE.test(slug)
}

/** Derives an auto-suggested slug from an English string. */
export function suggestSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Returns all categories ordered by sort_order (admin sees inactive too).
 * Joined with product count to enable UI hints.
 */
export async function getAdminCategoriesWithCount(): Promise<
  (AdminCategory & { product_count: number })[]
> {
  try {
    // Fetch full category rows
    const { data: cats, error: catErr } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true })

    if (catErr) throw toAppError(catErr)

    const categories = cats ?? []
    if (categories.length === 0) return []

    // Fetch product counts per category
    const ids = categories.map((c) => c.id)
    const { data: counts, error: cntErr } = await supabase
      .from('products')
      .select('category_id')
      .in('category_id', ids)

    if (cntErr) throw toAppError(cntErr)

    const countMap: Record<number, number> = {}
    for (const row of counts ?? []) {
      countMap[row.category_id] = (countMap[row.category_id] ?? 0) + 1
    }

    return categories.map((c) => ({ ...c, product_count: countMap[c.id] ?? 0 }))
  } catch (err) {
    throw toAppError(err)
  }
}

/**
 * Creates a new category.
 * Raises ADM-006 (via DB constraint) on bad slug.
 */
export async function createAdminCategory(data: CategoryCreateData): Promise<AdminCategory> {
  if (!validateSlug(data.slug)) {
    throw new AppError('ADM-006')
  }

  try {
    const payload = {
      name: data.name,
      name_ar: data.name_ar ?? null,
      slug: data.slug,
      image_url: data.image_url ?? null,
      show_on_home: data.show_on_home,
      is_active: data.is_active,
      sort_order: data.sort_order,
    }

    const { data: row, error } = await supabase
      .from('categories')
      .insert(payload)
      .select('*')
      .single()

    if (error) throw toAppError(error)
    return row as AdminCategory
  } catch (err) {
    throw toAppError(err)
  }
}

/**
 * Updates an existing category.
 * Raises ADM-006 if the slug is provided but invalid.
 */
export async function updateAdminCategory(
  categoryId: number,
  data: CategoryUpdateData,
): Promise<AdminCategory> {
  if (data.slug !== undefined && !validateSlug(data.slug)) {
    throw new AppError('ADM-006')
  }

  try {
    const { data: row, error } = await supabase
      .from('categories')
      .update(data)
      .eq('id', categoryId)
      .select('*')
      .single()

    if (error) throw toAppError(error)
    return row as AdminCategory
  } catch (err) {
    throw toAppError(err)
  }
}

/**
 * Deletes a category via the admin_delete_category RPC.
 * If the category has products, p_move_to must be supplied (ADM-005 otherwise).
 */
export async function deleteAdminCategory(
  categoryId: number,
  moveToId?: number | null,
): Promise<void> {
  try {
    const { error } = await supabase.rpc('admin_delete_category', {
      p_id: categoryId,
      p_move_to: moveToId ?? null,
    })

    if (error) throw toAppError(error)
  } catch (err) {
    throw toAppError(err)
  }
}

/**
 * Batch-updates sort_order for a list of category ids (in ascending order).
 */
export async function reorderAdminCategories(orderedIds: number[]): Promise<void> {
  try {
    const updates = orderedIds.map((id, idx) =>
      supabase.from('categories').update({ sort_order: idx }).eq('id', id),
    )

    const results = await Promise.all(updates)
    for (const { error } of results) {
      if (error) throw toAppError(error)
    }
  } catch (err) {
    throw toAppError(err)
  }
}

/**
 * Validates, resizes, re-encodes, and uploads a category tile image to `product-images` bucket.
 * Uses the same upload pipeline as products but under the `categories/` prefix.
 * Returns the relative storage path.
 */
export async function uploadCategoryImage(
  file: File | Blob,
  categoryId: number | string,
): Promise<string> {
  const { validateProductImageFile, resizeAndEncodeImage } = await import('../products/imageUpload')

  await validateProductImageFile(file)
  const { blob, extension, contentType } = await resizeAndEncodeImage(file)

  // Path: categories/{id}/{uuid}.{ext}  (matches DB constraint regex)
  const uuid = globalThis.crypto.randomUUID()
  const storagePath = `categories/${String(categoryId)}/${uuid}.${extension}`

  const { error } = await supabase.storage.from('product-images').upload(storagePath, blob, {
    contentType,
    upsert: true,
  })

  if (error) {
    throw new AppError('UPL-001')
  }

  return storagePath
}

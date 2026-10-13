import type { Tables } from '@/types'

/** Full admin category row (all columns visible to admin). */
export type AdminCategory = Tables<'categories'>

/** Payload for creating a new category. */
export interface CategoryCreateData {
  name: string
  name_ar: string | null
  slug: string
  image_url: string | null
  show_on_home: boolean
  is_active: boolean
  sort_order: number
}

/** Payload for updating a category (all fields optional). */
export type CategoryUpdateData = Partial<CategoryCreateData>

/** Parameters for the delete-category RPC call. */
export interface DeleteCategoryParams {
  categoryId: number
  /** If the category has products, move them to this category first. */
  moveToId?: number | null
}

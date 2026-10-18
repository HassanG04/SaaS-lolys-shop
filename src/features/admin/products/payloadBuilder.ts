/**
 * Payload builder for creating and updating products in public.products.
 *
 * HARD RULE: Never send generated or trigger-maintained columns from the client:
 * - final_price (generated always)
 * - in_stock (generated always)
 * - sold_count (order-trigger maintained)
 * - created_at (timestamp default)
 * - updated_at (timestamp default / trigger)
 * - id (identity column on insert)
 */

export interface ProductInputForm {
  custom_id?: number
  name: string
  name_ar?: string | null
  description?: string | null
  description_ar?: string | null
  category_id: number
  price: number
  discount_percent?: number
  stock_quantity?: number
  is_featured?: boolean
  is_active?: boolean
  image_url?: string | null
  extra_images?: string[]
}

/**
 * Strips HTML tags and script elements from a string to enforce plain-text only.
 */
export function sanitizePlainText(input?: string | null): string {
  if (!input) return ''
  return input
    .replace(/<[^>]*>/g, '') // remove HTML tags
    .trim()
}

/**
 * Builds the database insert payload for inserting a new product into public.products.
 * Strictly guarantees that NO generated or system columns are included unless explicit custom_id is provided.
 */
export function buildProductInsertPayload(input: ProductInputForm): {
  id?: number
  category_id: number
  name: string
  name_ar: string | null
  description: string | null
  description_ar: string | null
  price: number
  discount_percent: number
  stock_quantity: number
  is_featured: boolean
  is_active: boolean
  image_url: string | null
  extra_images: string[]
} {
  const cleanName = input.name.trim()
  const cleanNameAr = input.name_ar ? input.name_ar.trim() : null
  const cleanDesc = sanitizePlainText(input.description) || null
  const cleanDescAr = sanitizePlainText(input.description_ar) || null

  const priceNum = Math.max(0, Number(input.price) || 0)
  const discountNum = Math.min(100, Math.max(0, Math.round(Number(input.discount_percent) || 0)))
  const stockNum = Math.max(0, Math.round(Number(input.stock_quantity) || 0))

  const payload: {
    id?: number
    category_id: number
    name: string
    name_ar: string | null
    description: string | null
    description_ar: string | null
    price: number
    discount_percent: number
    stock_quantity: number
    is_featured: boolean
    is_active: boolean
    image_url: string | null
    extra_images: string[]
  } = {
    category_id: Number(input.category_id),
    name: cleanName,
    name_ar: cleanNameAr,
    description: cleanDesc,
    description_ar: cleanDescAr,
    price: priceNum,
    discount_percent: discountNum,
    stock_quantity: stockNum,
    is_featured: Boolean(input.is_featured),
    is_active: input.is_active !== undefined ? Boolean(input.is_active) : true,
    image_url: input.image_url ? input.image_url.trim() : null,
    extra_images: Array.isArray(input.extra_images) ? input.extra_images : [],
  }

  if (
    typeof input.custom_id === 'number' &&
    Number.isInteger(input.custom_id) &&
    input.custom_id > 0
  ) {
    payload.id = input.custom_id
  }

  return payload
}

/**
 * Builds the database update payload for updating an existing product in public.products.
 * Strictly guarantees that NO generated or system columns are included.
 * Note: stock updates on existing products must use the dedicated stock adjustment flow.
 */
export function buildProductUpdatePayload(input: Partial<ProductInputForm>): {
  category_id?: number
  name?: string
  name_ar?: string | null
  description?: string | null
  description_ar?: string | null
  price?: number
  discount_percent?: number
  is_featured?: boolean
  is_active?: boolean
  image_url?: string | null
  extra_images?: string[]
} {
  const payload: ReturnType<typeof buildProductUpdatePayload> = {}

  if (input.category_id !== undefined) {
    payload.category_id = Number(input.category_id)
  }

  if (input.name !== undefined) {
    payload.name = input.name.trim()
  }

  if (input.name_ar !== undefined) {
    payload.name_ar = input.name_ar ? input.name_ar.trim() : null
  }

  if (input.description !== undefined) {
    payload.description = sanitizePlainText(input.description) || null
  }

  if (input.description_ar !== undefined) {
    payload.description_ar = sanitizePlainText(input.description_ar) || null
  }

  if (input.price !== undefined) {
    payload.price = Math.max(0, Number(input.price) || 0)
  }

  if (input.discount_percent !== undefined) {
    payload.discount_percent = Math.min(
      100,
      Math.max(0, Math.round(Number(input.discount_percent) || 0)),
    )
  }

  if (input.is_featured !== undefined) {
    payload.is_featured = Boolean(input.is_featured)
  }

  if (input.is_active !== undefined) {
    payload.is_active = Boolean(input.is_active)
  }

  if (input.image_url !== undefined) {
    payload.image_url = input.image_url ? input.image_url.trim() : null
  }

  if (input.extra_images !== undefined) {
    payload.extra_images = Array.isArray(input.extra_images) ? input.extra_images : []
  }

  return payload
}

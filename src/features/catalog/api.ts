import { supabase } from '@/lib/supabase'
import { toAppError } from '@/lib/errors'
import type {
  Category,
  ProductWithCategory,
  GetCategoriesOptions,
  CategorySummary,
  GetBrowseProductsOptions,
  BrowseProductsResult,
} from './types'
import type { Tables } from '@/types'

type RawProductRow = Tables<'products'> & {
  categories?: CategorySummary | null
  category?: CategorySummary | null
}

function normalizeProduct(raw: RawProductRow): ProductWithCategory {
  const category = raw.categories ?? raw.category ?? null
  return {
    ...raw,
    category,
    categories: category,
    extra_images: Array.isArray(raw.extra_images) ? raw.extra_images : [],
  }
}

/**
 * Fetches active product categories, sorted by sort_order.
 * Optionally filters to categories configured for the home page.
 */
export async function getCategories(options?: GetCategoriesOptions): Promise<Category[]> {
  try {
    let query = supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (options?.showOnHomeOnly) {
      query = query.eq('show_on_home', true)
    }

    const { data, error } = await query

    if (error) {
      throw toAppError(error)
    }

    return (data ?? []) as Category[]
  } catch (err) {
    throw toAppError(err)
  }
}

/**
 * Fetches an active category by its unique slug.
 * Returns null if not found or inactive.
 */
export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const trimmed = slug?.trim()
  if (!trimmed || trimmed === 'all') {
    return null
  }

  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('slug', trimmed)
      .eq('is_active', true)
      .maybeSingle()

    if (error) {
      throw toAppError(error)
    }

    return (data as Category) ?? null
  } catch (err) {
    throw toAppError(err)
  }
}

/**
 * Fetches best selling active products ordered by sold_count descending.
 */
export async function getBestSellers(limit = 8): Promise<ProductWithCategory[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, categories!inner(id, name, name_ar, slug, is_active)')
      .eq('is_active', true)
      .eq('categories.is_active', true)
      .order('sold_count', { ascending: false })
      .limit(limit)

    if (error) {
      throw toAppError(error)
    }

    return ((data ?? []) as unknown as RawProductRow[]).map(normalizeProduct)
  } catch (err) {
    throw toAppError(err)
  }
}

/**
 * Fetches active products belonging to a category identified by its slug.
 */
export async function getProductsByCategory(categorySlug: string): Promise<ProductWithCategory[]> {
  const slug = categorySlug?.trim()
  if (!slug) {
    return []
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, categories!inner(id, name, name_ar, slug, is_active)')
      .eq('categories.slug', slug)
      .eq('is_active', true)
      .eq('categories.is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      throw toAppError(error)
    }

    return ((data ?? []) as unknown as RawProductRow[]).map(normalizeProduct)
  } catch (err) {
    throw toAppError(err)
  }
}

/**
 * Fetches a single active product by its unique ID.
 * Returns null if the product is not found or is inactive.
 */
export async function getProductById(id: number | string): Promise<ProductWithCategory | null> {
  const numericId = typeof id === 'string' ? Number(id) : id
  if (!numericId || Number.isNaN(numericId) || numericId <= 0) {
    return null
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(id, name, name_ar, slug)')
      .eq('id', numericId)
      .eq('is_active', true)
      .maybeSingle()

    if (error) {
      throw toAppError(error)
    }

    if (!data) {
      return null
    }

    return normalizeProduct(data as unknown as RawProductRow)
  } catch (err) {
    throw toAppError(err)
  }
}

/**
 * Searches active products matching a query across Arabic/English name and description.
 */
export async function searchProducts(query: string, limit = 20): Promise<ProductWithCategory[]> {
  const trimmed = query?.trim()
  if (!trimmed) {
    return []
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, categories!inner(id, name, name_ar, slug, is_active)')
      .eq('is_active', true)
      .eq('categories.is_active', true)
      .or(
        `name.ilike.%${trimmed}%,name_ar.ilike.%${trimmed}%,description.ilike.%${trimmed}%,description_ar.ilike.%${trimmed}%`,
      )
      .order('sold_count', { ascending: false })
      .limit(limit)

    if (error) {
      throw toAppError(error)
    }

    return ((data ?? []) as unknown as RawProductRow[]).map(normalizeProduct)
  } catch (err) {
    throw toAppError(err)
  }
}

/**
 * Fetches featured active products for storefront highlights.
 */
export async function getFeaturedProducts(limit = 8): Promise<ProductWithCategory[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, categories!inner(id, name, name_ar, slug, is_active)')
      .eq('is_active', true)
      .eq('is_featured', true)
      .eq('categories.is_active', true)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw toAppError(error)
    }

    return ((data ?? []) as unknown as RawProductRow[]).map(normalizeProduct)
  } catch (err) {
    throw toAppError(err)
  }
}

/**
 * Fetches products for the browse catalog with optional category filter, sorting, and pagination.
 */
export async function getBrowseProducts(
  options?: GetBrowseProductsOptions,
): Promise<BrowseProductsResult> {
  const limit = options?.limit ?? 12
  const offset = options?.offset ?? 0
  const sortBy = options?.sortBy ?? 'best_sellers'
  const categorySlug = options?.categorySlug?.trim()

  try {
    let query = supabase
      .from('products')
      .select('*, categories!inner(id, name, name_ar, slug, is_active)', { count: 'exact' })
      .eq('is_active', true)
      .eq('categories.is_active', true)

    if (categorySlug && categorySlug !== 'all') {
      query = query.eq('categories.slug', categorySlug)
    }

    if (options?.inStockOnly) {
      query = query.gt('stock_quantity', 0)
    }

    if (sortBy === 'price_asc') {
      query = query.order('final_price', { ascending: true })
    } else if (sortBy === 'price_desc') {
      query = query.order('final_price', { ascending: false })
    } else if (sortBy === 'newest') {
      query = query.order('created_at', { ascending: false })
    } else {
      // default: best_sellers
      query = query.order('sold_count', { ascending: false })
    }

    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      throw toAppError(error)
    }

    const totalCount = count ?? 0
    const products = ((data ?? []) as unknown as RawProductRow[]).map(normalizeProduct)
    const hasMore = offset + products.length < totalCount

    return {
      products,
      totalCount,
      hasMore,
    }
  } catch (err) {
    throw toAppError(err)
  }
}

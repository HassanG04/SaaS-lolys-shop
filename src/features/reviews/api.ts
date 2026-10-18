import { supabase } from '@/lib/supabase'
import { toAppError } from '@/lib/errors'
import type {
  ProductReview,
  ProductReviewSummary,
  UserReviewEligibility,
  SubmitReviewPayload,
} from './types'

interface SupabaseRpcCaller {
  rpc<T = unknown>(
    fn: string,
    args?: Record<string, unknown>,
  ): Promise<{ data: T | null; error: unknown }>
}

const db = supabase as unknown as SupabaseRpcCaller

export async function getProductReviewsApi(productId: number): Promise<ProductReview[]> {
  const { data, error } = await db.rpc<ProductReview[]>('get_product_reviews', {
    p_product_id: productId,
  })

  if (error) {
    throw toAppError(error)
  }

  return (data || []) as ProductReview[]
}

export async function getProductReviewSummaryApi(productId: number): Promise<ProductReviewSummary> {
  const { data, error } = await db.rpc<{
    review_count?: number
    average_rating?: number
    distribution?: {
      '1'?: number
      '2'?: number
      '3'?: number
      '4'?: number
      '5'?: number
    }
  }>('get_product_review_summary', {
    p_product_id: productId,
  })

  if (error) {
    throw toAppError(error)
  }

  return {
    review_count: data?.review_count ?? 0,
    average_rating: Number(data?.average_rating ?? 0),
    distribution: {
      '1': data?.distribution?.['1'] ?? 0,
      '2': data?.distribution?.['2'] ?? 0,
      '3': data?.distribution?.['3'] ?? 0,
      '4': data?.distribution?.['4'] ?? 0,
      '5': data?.distribution?.['5'] ?? 0,
    },
  }
}

export async function checkUserReviewEligibilityApi(
  productId: number,
): Promise<UserReviewEligibility> {
  const { data, error } = await db.rpc<{
    is_authenticated?: boolean
    is_banned?: boolean
    has_purchased?: boolean
    existing_review?: {
      id: number
      rating: number
      comment: string
      created_at: string
    } | null
  }>('check_user_review_eligibility', {
    p_product_id: productId,
  })

  if (error) {
    throw toAppError(error)
  }

  return {
    is_authenticated: Boolean(data?.is_authenticated),
    is_banned: Boolean(data?.is_banned),
    has_purchased: Boolean(data?.has_purchased),
    existing_review: data?.existing_review ?? null,
  }
}

export async function submitProductReviewApi(
  payload: SubmitReviewPayload,
): Promise<{ review_id: number; status: string }> {
  const { data, error } = await db.rpc<{ review_id?: number; status?: string }>(
    'submit_product_review',
    {
      p_product_id: payload.productId,
      p_rating: payload.rating,
      p_comment: payload.comment,
    },
  )

  if (error) {
    throw toAppError(error)
  }

  return {
    review_id: Number(data?.review_id ?? 0),
    status: data?.status ?? 'published',
  }
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { AppError } from '@/lib/errors'
import {
  getProductReviewsApi,
  getProductReviewSummaryApi,
  checkUserReviewEligibilityApi,
  submitProductReviewApi,
} from './api'
import type {
  ProductReview,
  ProductReviewSummary,
  UserReviewEligibility,
  SubmitReviewPayload,
} from './types'

export const REVIEWS_QUERY_KEY = 'reviews'

export function useProductReviews(productId: number | null) {
  return useQuery<ProductReview[], AppError>({
    queryKey: [REVIEWS_QUERY_KEY, 'list', productId],
    queryFn: () => (productId ? getProductReviewsApi(productId) : Promise.resolve([])),
    enabled: typeof productId === 'number' && productId > 0,
    staleTime: 60 * 1000,
  })
}

export function useProductReviewSummary(productId: number | null) {
  return useQuery<ProductReviewSummary, AppError>({
    queryKey: [REVIEWS_QUERY_KEY, 'summary', productId],
    queryFn: () =>
      productId
        ? getProductReviewSummaryApi(productId)
        : Promise.resolve({
            review_count: 0,
            average_rating: 0,
            distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
          }),
    enabled: typeof productId === 'number' && productId > 0,
    staleTime: 60 * 1000,
  })
}

export function useUserReviewEligibility(productId: number | null) {
  return useQuery<UserReviewEligibility, AppError>({
    queryKey: [REVIEWS_QUERY_KEY, 'eligibility', productId],
    queryFn: () =>
      productId
        ? checkUserReviewEligibilityApi(productId)
        : Promise.resolve({
            is_authenticated: false,
            is_banned: false,
            has_purchased: false,
            existing_review: null,
          }),
    enabled: typeof productId === 'number' && productId > 0,
    staleTime: 30 * 1000,
  })
}

export function useSubmitReview() {
  const queryClient = useQueryClient()

  return useMutation<{ review_id: number; status: string }, AppError, SubmitReviewPayload>({
    mutationFn: (payload) => submitProductReviewApi(payload),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: [REVIEWS_QUERY_KEY, 'list', variables.productId],
      })
      void queryClient.invalidateQueries({
        queryKey: [REVIEWS_QUERY_KEY, 'summary', variables.productId],
      })
      void queryClient.invalidateQueries({
        queryKey: [REVIEWS_QUERY_KEY, 'eligibility', variables.productId],
      })
    },
  })
}

export interface ProductReview {
  id: number
  product_id: number
  rating: number
  comment: string
  reviewer_name: string
  is_verified_purchase: boolean
  is_own: boolean
  created_at: string
}

export interface RatingDistribution {
  '1': number
  '2': number
  '3': number
  '4': number
  '5': number
}

export interface ProductReviewSummary {
  review_count: number
  average_rating: number
  distribution: RatingDistribution
}

export interface UserReviewEligibility {
  is_authenticated: boolean
  is_banned: boolean
  has_purchased: boolean
  existing_review: {
    id: number
    rating: number
    comment: string
    created_at: string
  } | null
}

export interface SubmitReviewPayload {
  productId: number
  rating: number
  comment: string
}

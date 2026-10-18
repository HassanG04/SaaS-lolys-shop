import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  submitCustomerSuggestionApi,
  fetchCustomerSuggestionsApi,
  adminFetchSuggestionsApi,
  adminReviewSuggestionApi,
} from './api'
import type { CustomerSuggestion, SubmitSuggestionPayload, ReviewSuggestionPayload } from './types'

export const CUSTOMER_SUGGESTIONS_KEY = ['customer_suggestions']
export const ADMIN_SUGGESTIONS_KEY = ['admin_suggestions']

export function useCustomerSuggestions(enabled = true) {
  return useQuery<CustomerSuggestion[]>({
    queryKey: CUSTOMER_SUGGESTIONS_KEY,
    queryFn: fetchCustomerSuggestionsApi,
    enabled,
    staleTime: 60_000,
  })
}

export function useSubmitSuggestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: SubmitSuggestionPayload) => submitCustomerSuggestionApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMER_SUGGESTIONS_KEY })
    },
  })
}

export function useAdminSuggestions() {
  return useQuery<CustomerSuggestion[]>({
    queryKey: ADMIN_SUGGESTIONS_KEY,
    queryFn: adminFetchSuggestionsApi,
    staleTime: 30_000,
  })
}

export function useAdminReviewSuggestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: ReviewSuggestionPayload) => adminReviewSuggestionApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_SUGGESTIONS_KEY })
    },
  })
}

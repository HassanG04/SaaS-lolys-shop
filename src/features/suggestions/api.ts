import { supabase } from '@/lib/supabase'
import { toAppError } from '@/lib/errors'
import type { CustomerSuggestion, SubmitSuggestionPayload, ReviewSuggestionPayload } from './types'

export async function submitCustomerSuggestionApi(
  payload: SubmitSuggestionPayload,
): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('submit_customer_suggestion', {
      p_topic: payload.topic,
      p_message: payload.message,
    })

    if (error) {
      throw toAppError(error)
    }

    return data as string
  } catch (err) {
    throw toAppError(err)
  }
}

export async function fetchCustomerSuggestionsApi(): Promise<CustomerSuggestion[]> {
  try {
    const { data, error } = await supabase
      .from('customer_suggestions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw toAppError(error)
    }

    return (data || []) as CustomerSuggestion[]
  } catch (err) {
    throw toAppError(err)
  }
}

export async function adminFetchSuggestionsApi(): Promise<CustomerSuggestion[]> {
  try {
    const { data, error } = await supabase
      .from('customer_suggestions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw toAppError(error)
    }

    return (data || []) as CustomerSuggestion[]
  } catch (err) {
    throw toAppError(err)
  }
}

export async function adminReviewSuggestionApi(payload: ReviewSuggestionPayload): Promise<void> {
  try {
    const { error } = await supabase.rpc('admin_review_suggestion', {
      p_id: payload.id,
      p_status: payload.status,
      p_notes: payload.notes || undefined,
    })

    if (error) {
      throw toAppError(error)
    }
  } catch (err) {
    throw toAppError(err)
  }
}

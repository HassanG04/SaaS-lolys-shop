export type SuggestionTopic = 'products' | 'service' | 'delivery' | 'website' | 'other'

export type SuggestionStatus = 'pending' | 'reviewed' | 'archived'

export interface CustomerSuggestion {
  id: string
  customer_id: string | null
  topic: SuggestionTopic
  message: string
  status: SuggestionStatus
  admin_notes: string | null
  created_at: string
  reviewed_at: string | null
}

export interface SubmitSuggestionPayload {
  topic: SuggestionTopic
  message: string
}

export interface ReviewSuggestionPayload {
  id: string
  status: SuggestionStatus
  notes?: string
}

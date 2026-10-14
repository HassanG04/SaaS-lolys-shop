import type { Database } from '@/types/database.types'

export type PaymentStatus = Database['public']['Enums']['payment_status']
export type PaymentMethod = Database['public']['Enums']['payment_method']
export type OrderStatus = Database['public']['Enums']['order_status']

export interface OrderPaymentDetails {
  id: number
  user_id: string
  status: OrderStatus
  payment_status: PaymentStatus
  payment_method: PaymentMethod
  payment_deadline: string | null
  payment_reference: string | null
  payment_proof_path: string | null
  payment_submitted_at: string | null
  payment_review_note: string | null
  total: number
  created_at: string
}

export type SupportedProofMime = 'image/jpeg' | 'image/png' | 'image/webp'
export type SupportedProofExt = 'jpg' | 'png' | 'webp'

export type ProofValidationResult =
  | {
      ok: true
      mimeType: SupportedProofMime
      extension: SupportedProofExt
    }
  | {
      ok: false
      code: 'UPL-001' | 'UPL-002'
    }

export interface SubmitProofPayload {
  orderId: number
  reference: string
  proofPath: string
}

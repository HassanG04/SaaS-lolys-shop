import type { Database } from '@/types/database.types'

export type PaymentStatus = Database['public']['Enums']['payment_status']
export type PaymentMethod = Database['public']['Enums']['payment_method']
export type OrderStatus = Database['public']['Enums']['order_status']
export type DeliveryMethod = Database['public']['Enums']['delivery_method']

export interface AdminPaymentOrder {
  id: number
  user_id: string
  status: OrderStatus
  delivery_method: DeliveryMethod
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  payment_deadline: string | null
  payment_reference: string | null
  payment_proof_path: string | null
  payment_submitted_at: string | null
  payment_reviewed_by: string | null
  payment_review_note: string | null
  paid_at: string | null
  ship_name: string
  ship_phone: string
  ship_alt_phone: string | null
  ship_governorate: string
  ship_city: string | null
  ship_district: string | null
  ship_address: string
  ship_floor: string | null
  ship_apartment: string | null
  ship_landmark: string | null
  subtotal: number
  shipping_fee: number
  total: number
  tracking_number: string | null
  rep_name: string | null
  rep_phone: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface PaymentReviewFilter {
  orderId?: number
  status?: 'all' | PaymentStatus
  search?: string
}

export interface ReviewPaymentPayload {
  orderId: number
  approve: boolean
  note?: string | null
}

export interface PurgeProofsResult {
  purgedCount: number
  orderIds: number[]
}

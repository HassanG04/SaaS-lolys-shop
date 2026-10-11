import type { DeliveryMethod, Governorate } from '@/features/delivery/types'

export interface DeliveryFeeRow {
  governorate_id: number
  method: DeliveryMethod
  fee: number
}

export interface GovernorateDeliveryGridRow {
  governorate: Governorate
  fees: Partial<Record<DeliveryMethod, number>>
}

export interface EditFeeTarget {
  governorate: Governorate
  method: DeliveryMethod
  currentFee: number | null
}

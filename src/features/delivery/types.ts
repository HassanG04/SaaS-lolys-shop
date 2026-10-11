import type { Database } from '../../types'

export type DeliveryMethod = Database['public']['Enums']['delivery_method']

export type Governorate = {
  id: number
  name_ar: string
  name_en: string
}

export type DeliveryFeeOption = {
  governorate_id: number
  method: DeliveryMethod
  fee: number
  label_ar: string
  label_en: string
}

export interface BasketPairItem {
  product_a_id: number
  product_a_name: string
  product_a_name_ar: string
  product_b_id: number
  product_b_name: string
  product_b_name_ar: string
  support: number
  confidence: number
  lift: number
  sample_orders: number
}

export interface CohortRetentionItem {
  cohort_month: string
  period_months: number
  cohort_size: number
  active_customers: number
  retention_rate: number
}

export interface CustomerSegmentItem {
  segment: 'champions' | 'loyal' | 'promising' | 'at_risk' | 'lost' | 'other'
  customer_count: number
  total_revenue: number
  avg_order_value: number
}

export interface SalesOverviewItem {
  day: string
  units: number
  revenue: number
  units_ma7: number
  revenue_ma7: number
  units_ma28: number
  revenue_ma28: number
}

export interface ProductPerformanceItem {
  product_id: number
  name: string
  name_ar: string
  category_id: number | null
  total_revenue: number
  total_units: number
  revenue_share_pct: number
  abc_class: 'A' | 'B' | 'C'
  xyz_class: 'X' | 'Y' | 'Z'
  cv_demand: number | null
}

export interface DiscountEffectItem {
  promo_weekly_units: number
  baseline_weekly_units: number
  uplift_pct: number
  note_ar: string
  note_en: string
}

export interface FulfilmentQualityItem {
  total_orders: number
  cancellation_rate_pct: number
  refusal_rate_pct: number
  expiry_rate_pct: number
  median_delivery_days: number
  avg_proof_hours: number
}

export interface GeographyItem {
  governorate: string
  customer_count: number
  orders_count: number
  total_revenue: number
}

export interface AnalyticsInsightsPayload {
  basket_pairs: BasketPairItem[]
  cohorts: CohortRetentionItem[]
  customer_segments: CustomerSegmentItem[]
  sales_overview: SalesOverviewItem[]
  product_performance: ProductPerformanceItem[]
  discount_effect: DiscountEffectItem
  fulfilment_quality: FulfilmentQualityItem
  geography: GeographyItem[]
}

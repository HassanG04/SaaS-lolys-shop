import { supabase } from '@/lib/supabase'
import type { AnalyticsInsightsPayload } from './types'

export async function getAdminAnalyticsInsights(): Promise<AnalyticsInsightsPayload> {
  const { data, error } = await supabase.rpc('admin_get_analytics_insights')

  if (error) {
    throw error
  }

  const raw = data as unknown as AnalyticsInsightsPayload

  return {
    basket_pairs: Array.isArray(raw?.basket_pairs) ? raw.basket_pairs : [],
    cohorts: Array.isArray(raw?.cohorts) ? raw.cohorts : [],
    customer_segments: Array.isArray(raw?.customer_segments) ? raw.customer_segments : [],
    sales_overview: Array.isArray(raw?.sales_overview) ? raw.sales_overview : [],
    product_performance: Array.isArray(raw?.product_performance) ? raw.product_performance : [],
    discount_effect: raw?.discount_effect ?? {
      promo_weekly_units: 0,
      baseline_weekly_units: 0,
      uplift_pct: 0,
      note_ar: 'هذا التحليل للمقارنة ولا يثبت علاقة سببية حتمية',
      note_en: 'Correlation for comparison; not proof of cause',
    },
    fulfilment_quality: raw?.fulfilment_quality ?? {
      total_orders: 0,
      cancellation_rate_pct: 0,
      refusal_rate_pct: 0,
      expiry_rate_pct: 0,
      median_delivery_days: 0,
      avg_proof_hours: 0,
    },
    geography: Array.isArray(raw?.geography) ? raw.geography : [],
  }
}

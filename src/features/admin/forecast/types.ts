export type SeriesType = 'shop' | 'category' | 'product'

export interface ForecastPoint {
  forecast_date: string
  horizon_step: number
  predicted_units: number
  predicted_revenue: number
  lower_80: number
  upper_80: number
  model_name: string
}

export interface HistoryPoint {
  day: string
  units: number
  revenue: number
}

export interface ForecastMetric {
  model_name: string
  wape: number
  mase: number | null
  pinball_loss: number | null
  bias: number | null
  is_selected: boolean
}

export interface ForecastRunNotes {
  series_counts?: {
    shop: number
    categories: number
    products: number
    total_series: number
  }
  readiness_summary?: Record<string, 'ok' | 'preliminary' | 'insufficient_data'>
  selected_models?: Record<string, string>
  hierarchy_discrepancy_max_pct?: number
  history_days?: number
  total_units_sold?: number
  drift_alert?: boolean
  display_fallback?: boolean
  drift_details?: {
    drift_alert: boolean
    display_fallback: boolean
    consecutive_weeks_drift: number
    recent_ratios: number[]
  } | null
}

export interface ForecastRun {
  id: number
  run_at: string
  git_commit: string
  model_version: string
  notes: ForecastRunNotes
}

export interface ForecastResponse {
  status: 'ok' | 'no_data'
  message?: string
  run?: ForecastRun
  forecasts: ForecastPoint[]
  metrics: ForecastMetric[]
  history: HistoryPoint[]
}

export interface ReorderItem {
  product_id: number
  name: string
  name_ar: string
  category_id: number
  stock_quantity: number
  daily_forecast: number
  days_of_cover: number
  reorder_point: number
  suggested_quantity: number
  needs_reorder: boolean
  days_since_last_sale: number
  is_dead_stock: boolean
  is_stock_risk: boolean
}

export interface ForecastCategoryOption {
  id: number
  name_ar: string
}

export interface ForecastProductOption {
  id: number
  name_ar: string
  category_id: number
}

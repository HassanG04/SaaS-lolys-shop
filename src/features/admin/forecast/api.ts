import { z } from 'zod'
import { toAppError } from '@/lib/errors'
import { supabase } from '@/lib/supabase'
import type {
  AdminOccasionReminder,
  ForecastExportReadiness,
  ForecastCategoryOption,
  ForecastProductOption,
  ForecastResponse,
  ReorderItem,
  SeriesType,
  UpcomingOccasion,
} from './types'

export async function getAdminForecastExport(exportRows = false): Promise<ForecastExportReadiness> {
  const { data, error } = await supabase.rpc('admin_get_forecast_export', {
    p_export: exportRows,
  })
  if (error) throw toAppError(error)
  const row = z.object({
    sale_date: z.string(),
    product_id: z.number(),
    product_name: z.string(),
    product_name_ar: z.string().nullable(),
    category_id: z.number(),
    category_name: z.string(),
    category_name_ar: z.string().nullable(),
    units_sold: z.number(),
    revenue_egp: z.number(),
    valid_orders: z.number(),
    exported_at: z.string(),
    average_paid_unit_price: z.number().nullable(),
    current_list_price: z.number(),
    current_discount_percent: z.number(),
    current_stock: z.number(),
    wishlists_at_export: z.number(),
    closing_stock: z.number().nullable(),
    stockout_flag: z.boolean().nullable(),
    ramadan: z.boolean().nullable(),
    eid_fitr: z.boolean().nullable(),
    eid_adha: z.boolean().nullable(),
    mothers_day: z.boolean().nullable(),
    valentines: z.boolean().nullable(),
    black_friday: z.boolean().nullable(),
    back_to_school: z.boolean().nullable(),
  })
  try {
    return z
      .object({
        ready: z.boolean(),
        first_sale_date: z.string().nullable(),
        valid_orders: z.number().nonnegative(),
        days_since_first_sale: z.number().nonnegative(),
        minimum_days: z.literal(56),
        minimum_orders: z.literal(30),
        row_count: z.number().int().nonnegative(),
        rows: z.array(row),
      })
      .refine((value) => value.row_count === value.rows.length)
      .parse(data)
  } catch (error) {
    throw toAppError(error)
  }
}

export async function getAdminForecasts(
  seriesType: SeriesType = 'shop',
  seriesId: number | null = null,
  runId: number | null = null,
): Promise<ForecastResponse> {
  const { data, error } = await supabase.rpc('admin_get_forecasts', {
    p_series_type: seriesType,
    p_series_id: seriesId ?? undefined,
    p_run_id: runId ?? undefined,
  })

  if (error) {
    throw error
  }

  const raw = data as unknown as ForecastResponse
  return {
    status: raw?.status || 'no_data',
    message: raw?.message,
    run: raw?.run,
    forecasts: Array.isArray(raw?.forecasts) ? raw.forecasts : [],
    metrics: Array.isArray(raw?.metrics) ? raw.metrics : [],
    history: Array.isArray(raw?.history) ? raw.history : [],
  }
}

export async function getAdminReorderList(
  leadTimeDays: number = 7,
  serviceZ: number = 1.28,
): Promise<ReorderItem[]> {
  const { data, error } = await supabase.rpc('admin_get_reorder_list', {
    p_lead_time_days: leadTimeDays,
    p_service_z: serviceZ,
  })

  if (error) {
    throw error
  }

  return (Array.isArray(data) ? data : []) as unknown as ReorderItem[]
}

export async function getForecastCategories(): Promise<ForecastCategoryOption[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name_ar')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []).map((c) => ({
    id: c.id,
    name_ar: c.name_ar ?? '',
  }))
}

export async function getForecastProducts(): Promise<ForecastProductOption[]> {
  const { data, error } = await supabase
    .from('products')
    .select('id, name_ar, category_id')
    .eq('is_active', true)
    .order('name_ar', { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []).map((p) => ({
    id: p.id,
    name_ar: p.name_ar ?? '',
    category_id: p.category_id,
  }))
}

export async function getUpcomingOccasions(daysAhead: number = 120): Promise<UpcomingOccasion[]> {
  const { data, error } = await supabase.rpc('admin_get_upcoming_occasions', {
    p_days_ahead: daysAhead,
  })

  if (error) {
    throw error
  }

  return (Array.isArray(data) ? data : []) as unknown as UpcomingOccasion[]
}

export async function getAdminOccasionReminders(): Promise<AdminOccasionReminder[]> {
  const { data, error } = await supabase.rpc('admin_get_occasion_reminders')

  if (error) {
    throw error
  }

  return (Array.isArray(data) ? data : []) as unknown as AdminOccasionReminder[]
}

export async function generateAdminOccasionReminders(advanceDays?: number): Promise<number> {
  const { data, error } = await supabase.rpc('admin_generate_occasion_reminders', {
    p_advance_days: advanceDays ?? undefined,
  })

  if (error) {
    throw error
  }

  return typeof data === 'number' ? data : 0
}

export async function dismissAdminOccasionReminder(reminderId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('admin_dismiss_occasion_reminder', {
    p_reminder_id: reminderId,
  })

  if (error) {
    throw error
  }

  return Boolean(data)
}

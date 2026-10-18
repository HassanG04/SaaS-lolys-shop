import { supabase } from '@/lib/supabase'
import type {
  AdminOccasionReminder,
  ForecastCategoryOption,
  ForecastProductOption,
  ForecastResponse,
  ReorderItem,
  SeriesType,
  UpcomingOccasion,
} from './types'

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

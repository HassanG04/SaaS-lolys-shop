import type { z } from 'zod'
import type {
  dashboardDataSchema,
  dashboardKpisSchema,
  dashboardDailyItemSchema,
  dashboardByMethodItemSchema,
  dashboardByGovernorateItemSchema,
  dashboardTopProductItemSchema,
  dashboardTopCustomerItemSchema,
  dashboardLowStockItemSchema,
  dashboardRangeSchema,
} from './schema'

export type DashboardData = z.infer<typeof dashboardDataSchema>
export type DashboardRange = z.infer<typeof dashboardRangeSchema>
export type DashboardKpis = z.infer<typeof dashboardKpisSchema>
export type DashboardDailyItem = z.infer<typeof dashboardDailyItemSchema>
export type DashboardByMethodItem = z.infer<typeof dashboardByMethodItemSchema>
export type DashboardByGovernorateItem = z.infer<typeof dashboardByGovernorateItemSchema>
export type DashboardTopProduct = z.infer<typeof dashboardTopProductItemSchema>
export type DashboardTopCustomer = z.infer<typeof dashboardTopCustomerItemSchema>
export type DashboardLowStock = z.infer<typeof dashboardLowStockItemSchema>

export type DashboardPreset = '7d' | '30d' | '90d' | 'custom'

export interface DashboardDateRange {
  from: string
  to: string
}

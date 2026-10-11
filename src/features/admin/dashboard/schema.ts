import { z } from 'zod'

/**
 * Zod schema for dashboard date range.
 */
export const dashboardRangeSchema = z.object({
  from: z.string(),
  to: z.string(),
})

/**
 * Zod schema for dashboard high-level KPIs.
 * Includes optional awaiting_review and paid_total per database-contract.md.
 */
export const dashboardKpisSchema = z.object({
  orders: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
  booked_total: z.number().nonnegative(),
  delivered_total: z.number().nonnegative(),
  avg_order: z.number().nonnegative(),
  awaiting_review: z.number().int().nonnegative().optional().default(0),
  paid_total: z.number().nonnegative().optional().default(0),
})

/**
 * Zod schema for daily orders and totals breakdown.
 */
export const dashboardDailyItemSchema = z.object({
  day: z.string(),
  orders: z.number().int().nonnegative(),
  booked_total: z.number().nonnegative(),
  delivered_total: z.number().nonnegative(),
})

/**
 * Zod schema for delivery method breakdown item.
 */
export const dashboardByMethodItemSchema = z.object({
  method: z.string(),
  orders: z.number().int().nonnegative(),
  total: z.number().nonnegative(),
})

/**
 * Zod schema for governorate breakdown item.
 */
export const dashboardByGovernorateItemSchema = z.object({
  governorate: z.string(),
  orders: z.number().int().nonnegative(),
  total: z.number().nonnegative(),
})

/**
 * Zod schema for top-selling product item.
 */
export const dashboardTopProductItemSchema = z.object({
  product_id: z.number().int().positive(),
  name: z.string(),
  units: z.number().int().nonnegative(),
  sales: z.number().nonnegative(),
})

/**
 * Zod schema for top spending customer item.
 */
export const dashboardTopCustomerItemSchema = z.object({
  user_id: z.string(),
  name: z.string(),
  orders: z.number().int().nonnegative(),
  total: z.number().nonnegative(),
})

/**
 * Zod schema for low-stock inventory alert item.
 */
export const dashboardLowStockItemSchema = z.object({
  product_id: z.number().int().positive(),
  name: z.string(),
  stock: z.number().int(),
})

/**
 * Full schema for the admin_dashboard RPC payload.
 * Validates the complete shape documented in database-contract.md.
 */
export const dashboardDataSchema = z.object({
  range: dashboardRangeSchema,
  kpis: dashboardKpisSchema,
  daily: z.array(dashboardDailyItemSchema),
  by_status: z.record(z.string(), z.number().int().nonnegative()),
  by_method: z.array(dashboardByMethodItemSchema),
  by_governorate: z.array(dashboardByGovernorateItemSchema),
  top_products: z.array(dashboardTopProductItemSchema),
  top_customers: z.array(dashboardTopCustomerItemSchema),
  low_stock: z.array(dashboardLowStockItemSchema),
})

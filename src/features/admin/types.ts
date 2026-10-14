export interface AdminNavItem {
  to: string
  label: string
  icon:
    | 'dashboard'
    | 'products'
    | 'categories'
    | 'orders'
    | 'customers'
    | 'payments'
    | 'delivery'
    | 'audit'
    | 'analytics'
  end?: boolean
}

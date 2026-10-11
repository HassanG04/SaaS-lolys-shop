export interface AdminNavItem {
  to: string
  label: string
  icon:
    | 'dashboard'
    | 'products'
    | 'categories'
    | 'orders'
    | 'payments'
    | 'delivery'
    | 'audit'
    | 'analytics'
  end?: boolean
}

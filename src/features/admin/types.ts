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
    | 'settings'
    | 'audit'
    | 'analytics'
  end?: boolean
}

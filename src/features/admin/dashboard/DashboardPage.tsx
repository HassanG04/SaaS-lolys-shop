import { lazy, Suspense } from 'react'
import { useLanguage } from '../../../i18n/LanguageProvider'
import { ErrorPanel } from '../../../components/ui/ErrorPanel'
import { PearlLoader } from '../../../components/ui/PearlLoader'
import { Skeleton } from '../../../components/ui/Skeleton'
import { useAdminDashboard } from './hooks'
import { DashboardRangeSelector } from './DashboardRangeSelector'
import { DashboardKpis } from './DashboardKpis'
import { DashboardBreakdowns } from './DashboardBreakdowns'
import { DashboardTopLists } from './DashboardTopLists'
import { DashboardLowStock } from './DashboardLowStock'

const DashboardChart = lazy(() => import('./DashboardChart'))

export function DashboardPage() {
  const { t } = useLanguage()
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    preset,
    setPreset,
    activeRange,
    customRange,
    setCustomRange,
  } = useAdminDashboard()

  return (
    <div className="space-y-8">
      {/* Page Header and Range Selector */}
      <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-6 sm:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-(--shadow-card)">
        <div>
          <h1 className="text-h1 font-bold font-accent text-(--color-brand)">لوحة تحكم الإدارة</h1>
          <p className="mt-2 text-body text-(--color-text-muted)">{t.admin.dashboardDesc}</p>
        </div>

        <DashboardRangeSelector
          preset={preset}
          onPresetChange={setPreset}
          activeRange={activeRange}
          customRange={customRange}
          onCustomRangeChange={setCustomRange}
        />
      </div>

      {/* Error state */}
      {isError && (
        <ErrorPanel
          title={t.admin.dashboardError}
          message={error?.message}
          onRetry={() => refetch()}
          retryLabel={t.admin.retry}
        />
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-8" role="status" aria-label={t.admin.dashboardLoading}>
          {/* KPI Skeletons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-28 rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-5 flex flex-col justify-between"
              >
                <Skeleton className="w-24 h-4" />
                <Skeleton className="w-32 h-8" />
              </div>
            ))}
          </div>

          {/* Chart Skeleton */}
          <div className="h-96 rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-6 flex flex-col items-center justify-center gap-4">
            <PearlLoader loading />
            <span className="text-small text-(--color-text-muted)">{t.admin.dashboardLoading}</span>
          </div>
        </div>
      )}

      {/* Dashboard Data Display */}
      {!isLoading && !isError && data && (
        <div className="space-y-8">
          {/* 1. High-level KPI Cards */}
          <DashboardKpis kpis={data.kpis} />

          {/* 2. Daily Revenue Chart (Lazy Recharts) */}
          <Suspense
            fallback={
              <div
                role="status"
                aria-label={t.admin.dashboardLoading}
                className="h-80 flex flex-col items-center justify-center rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-6 gap-3 text-(--color-brand)"
              >
                <PearlLoader loading />
                <span className="text-small text-(--color-text-muted)">
                  {t.admin.dashboardLoading}
                </span>
              </div>
            }
          >
            <DashboardChart daily={data.daily} />
          </Suspense>

          {/* 3. Breakdowns (Status, Method, Governorate) */}
          <DashboardBreakdowns
            byStatus={data.by_status}
            byMethod={data.by_method}
            byGovernorate={data.by_governorate}
          />

          {/* 4. Top Lists (Products and Customers) */}
          <DashboardTopLists topProducts={data.top_products} topCustomers={data.top_customers} />

          {/* 5. Low-stock inventory alerts */}
          <DashboardLowStock lowStock={data.low_stock} />
        </div>
      )}
    </div>
  )
}

export default DashboardPage

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
    <div className="space-y-8 print:space-y-4 print:p-0">
      {/* Page Header and Range Selector */}
      <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-6 sm:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-(--shadow-card) print:shadow-none print:border-none print:p-0 ui-print-card">
        <div>
          <h1 className="text-h1 font-bold font-accent text-(--color-brand)">لوحة تحكم الإدارة</h1>
          <p className="mt-2 text-body text-(--color-text-muted)">{t.admin.dashboardDesc}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-(--radius-pill) border border-(--color-border) bg-(--color-surface-2) px-3 py-1.5 text-small font-semibold text-(--color-text) hover:bg-(--color-surface-tint) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus) print:hidden"
            aria-label={t.admin.printReport}
          >
            <svg
              className="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect width="12" height="8" x="6" y="14" />
            </svg>
            <span>{t.admin.printReport}</span>
          </button>

          <div className="print:hidden">
            <DashboardRangeSelector
              preset={preset}
              onPresetChange={setPreset}
              activeRange={activeRange}
              customRange={customRange}
              onCustomRangeChange={setCustomRange}
            />
          </div>
        </div>
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

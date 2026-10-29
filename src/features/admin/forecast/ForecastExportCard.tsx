import { useState } from 'react'
import { ErrorPanel } from '@/components/ui/ErrorPanel'
import { AppError, toAppError } from '@/lib/errors'
import { Button } from '@/components/ui/Button'
import { formatNumber } from '@/lib/format'
import { useLanguage } from '@/i18n/LanguageProvider'
import { buildCsv, downloadCsv, getExportFilename } from '../export/csv'
import { useAdminForecastExport, useDownloadAdminForecastExport } from './hooks'
import { useForecastI18n } from './i18n'

export function ForecastExportCard() {
  const { lang } = useLanguage()
  const t = useForecastI18n(lang)
  const readiness = useAdminForecastExport()
  const download = useDownloadAdminForecastExport()
  const [failed, setFailed] = useState<AppError | null>(null)
  const state = readiness.data
  const ready = !readiness.isError && state?.ready === true

  async function handleDownload() {
    setFailed(null)
    try {
      const result = await download.mutateAsync()
      if (!result.ready) {
        await readiness.refetch()
        throw new AppError('ANL-001')
      }
      const h =
        lang === 'ar'
          ? [
              'التاريخ',
              'معرف المنتج',
              'اسم المنتج',
              'اسم المنتج بالعربية',
              'معرف القسم',
              'القسم',
              'القسم بالعربية',
              'الوحدات المباعة',
              'الإيراد بالجنيه',
              'متوسط سعر الوحدة المدفوع',
              'السعر الحالي',
              'نسبة الخصم الحالية',
              'المخزون الحالي',
              'عدد المفضلة عند التصدير',
              'إغلاق المخزون',
              'نفاد المخزون',
              'رمضان',
              'عيد الفطر',
              'عيد الأضحى',
              'عيد الأم',
              'عيد الحب',
              'الجمعة البيضاء',
              'العودة للمدارس',
              'عدد الطلبات الصحيحة',
              'وقت التصدير',
            ]
          : [
              'Sale date',
              'Product ID',
              'Product name',
              'Product name Arabic',
              'Category ID',
              'Category',
              'Category Arabic',
              'Units sold',
              'Revenue EGP',
              'Average paid unit price',
              'Current list price',
              'Current discount percent',
              'Current stock',
              'Wishlists at export',
              'Closing stock',
              'Stockout',
              'Ramadan',
              'Eid al-Fitr',
              'Eid al-Adha',
              "Mother's Day",
              "Valentine's Day",
              'Black Friday',
              'Back to school',
              'Valid orders',
              'Exported at UTC',
            ]
      const rows = result.rows.map((row) => [
        row.sale_date,
        row.product_id,
        row.product_name,
        row.product_name_ar,
        row.category_id,
        row.category_name,
        row.category_name_ar,
        row.units_sold,
        row.revenue_egp,
        row.average_paid_unit_price,
        row.current_list_price,
        row.current_discount_percent,
        row.current_stock,
        row.wishlists_at_export,
        row.closing_stock,
        row.stockout_flag,
        row.ramadan,
        row.eid_fitr,
        row.eid_adha,
        row.mothers_day,
        row.valentines,
        row.black_friday,
        row.back_to_school,
        row.valid_orders,
        row.exported_at,
      ])
      downloadCsv(buildCsv(h, rows), getExportFilename('lolys-forecast-dataset'))
    } catch (error) {
      setFailed(toAppError(error))
    }
  }

  const progress = t.exportProgress
    .replace('{days}', formatNumber(state?.days_since_first_sale ?? 0, undefined, lang))
    .replace('{minimumDays}', formatNumber(state?.minimum_days ?? 56, undefined, lang))
    .replace('{orders}', formatNumber(state?.valid_orders ?? 0, undefined, lang))
    .replace('{minimumOrders}', formatNumber(state?.minimum_orders ?? 30, undefined, lang))

  return (
    <section
      className="rounded-card border border-border bg-surface p-5 shadow-card space-y-3"
      aria-labelledby="forecast-export-title"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="forecast-export-title" className="text-h3 font-bold font-accent text-brand">
            {t.exportTitle}
          </h2>
          <p className="mt-1 text-small text-text-muted">{t.exportDescription}</p>
        </div>
        <Button
          type="button"
          onClick={() => void handleDownload()}
          disabled={!ready || download.isPending}
        >
          {download.isPending ? t.exporting : t.exportCsv}
        </Button>
      </div>
      <p className="text-caption text-text-muted">{t.exportCaveat}</p>
      {!readiness.isError && (
        <p className="text-caption text-text-muted" role="status">
          {readiness.isLoading ? t.exporting : ready ? t.exportReady : progress}
        </p>
      )}
      {!ready && !readiness.isLoading && !readiness.isError && (
        <p className="text-caption text-text-muted">{t.exportLocked}</p>
      )}
      {readiness.isError && (
        <ErrorPanel error={readiness.error} onRetry={() => void readiness.refetch()} />
      )}
      {failed && <ErrorPanel error={failed} />}
    </section>
  )
}

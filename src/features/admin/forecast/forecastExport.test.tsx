import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/i18n/LanguageProvider'
import { ForecastExportCard } from './ForecastExportCard'
const network = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: network.rpc } }))
const ready = {
  ready: true,
  first_sale_date: '2026-08-01',
  valid_orders: 30,
  days_since_first_sale: 89,
  minimum_days: 56,
  minimum_orders: 30,
  row_count: 0,
  rows: [],
}
const row = {
  sale_date: '2026-10-01',
  product_id: 1,
  product_name: '=unsafe',
  product_name_ar: 'سلسلة',
  category_id: 2,
  category_name: 'Chains',
  category_name_ar: 'سلاسل',
  units_sold: 2,
  revenue_egp: 200,
  valid_orders: 1,
  exported_at: '2026-10-29T00:00:00Z',
  average_paid_unit_price: 100,
  current_list_price: 120,
  current_discount_percent: 10,
  current_stock: 3,
  wishlists_at_export: 4,
  closing_stock: null,
  stockout_flag: null,
  ramadan: false,
  eid_fitr: false,
  eid_adha: false,
  mothers_day: false,
  valentines: false,
  black_friday: false,
  back_to_school: false,
}
const objectUrl = vi.fn<(blob: Blob) => string>(() => 'blob:local')
function show(lang: 'en' | 'ar' = 'en') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <LanguageProvider initialLanguage={lang}>
      <QueryClientProvider client={client}>
        <ForecastExportCard />
      </QueryClientProvider>
    </LanguageProvider>,
  )
}
beforeEach(() => {
  vi.clearAllMocks()
  network.rpc.mockResolvedValue({ data: ready, error: null })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL = objectUrl
      static revokeObjectURL = vi.fn()
    },
  )
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
describe('Forecast dataset download', () => {
  it.each(['en', 'ar'] as const)('stays disabled below readiness (%s)', async (lang) => {
    network.rpc.mockResolvedValue({
      data: { ...ready, ready: false, valid_orders: 3, days_since_first_sale: 12 },
      error: null,
    })
    show(lang)
    await waitFor(() =>
      expect(screen.getByRole('status')).not.toHaveTextContent(/Preparing|التجهيز/),
    )
    expect(
      screen.getByRole('button', { name: lang === 'en' ? 'Download CSV file' : 'تنزيل ملف CSV' }),
    ).toBeDisabled()
    expect(objectUrl).not.toHaveBeenCalled()
  })
  it('exports the actual safe UTF-8 CSV when the server permits it', async () => {
    network.rpc
      .mockResolvedValueOnce({ data: ready, error: null })
      .mockResolvedValueOnce({ data: { ...ready, row_count: 1, rows: [row] }, error: null })
    show()
    await screen.findByText('The dataset is ready to download.')
    await userEvent.click(screen.getByRole('button', { name: 'Download CSV file' }))
    await waitFor(() => expect(objectUrl).toHaveBeenCalledOnce())
    expect(network.rpc).toHaveBeenLastCalledWith('admin_get_forecast_export', { p_export: true })
    const blob = objectUrl.mock.calls[0]?.[0] as unknown as Blob
    const text = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.readAsText(blob)
    })
    expect(text).toContain("'=unsafe")
    expect(text).toContain('سلسلة')
    expect(text).toContain('Wishlists at export')
    expect(text).toContain('Exported at UTC')
    expect(text).not.toContain('undefined')
  })
  it('shows a safe setup error and stays disabled when the cloud RPC is missing', async () => {
    network.rpc.mockResolvedValue({
      data: null,
      error: { code: 'PGRST202', message: 'private schema detail' },
    })
    show()
    expect((await screen.findAllByRole('alert'))[0]).toHaveTextContent('SYS-001')
    expect(screen.queryByText('private schema detail')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download CSV file' })).toBeDisabled()
  })
  it.each([
    { data: { ...ready, ready: false }, error: null },
    { data: null, error: { code: '42501', hint: 'ADM-002' } },
    { data: { ...ready, row_count: 1, rows: [] }, error: null },
  ])(
    'does not download when readiness, permission or response integrity changes',
    async (result) => {
      network.rpc.mockResolvedValueOnce({ data: ready, error: null }).mockResolvedValue(result)
      show()
      await screen.findByText('The dataset is ready to download.')
      await userEvent.click(screen.getByRole('button', { name: 'Download CSV file' }))
      await screen.findAllByRole('alert')
      expect(objectUrl).not.toHaveBeenCalled()
    },
  )
})

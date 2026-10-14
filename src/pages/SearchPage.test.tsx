import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LanguageProvider } from '@/i18n/LanguageProvider'
import { CartProvider } from '@/features/cart'
import SearchPage from './SearchPage'
import * as catalogHooks from '@/features/catalog/hooks'
import type { ProductWithCategory } from '@/features/catalog/types'
import { AppError } from '@/lib/errors'

const mockProducts: ProductWithCategory[] = [
  {
    id: 101,
    category_id: 1,
    name: 'Pearl Necklace',
    name_ar: 'عقد لؤلؤ',
    description: 'Lovely pearl necklace',
    description_ar: 'عقد لؤلؤ طبيعي أنيق',
    price: 250,
    discount_percent: 0,
    final_price: 250,
    stock_quantity: 8,
    in_stock: true,
    sold_count: 30,
    is_active: true,
    is_featured: false,
    image_url: 'products/necklace-1.webp',
    extra_images: [],
    created_at: '2026-10-10T00:00:00Z',
    updated_at: '2026-10-10T00:00:00Z',
    category: {
      id: 1,
      name: 'Necklaces',
      name_ar: 'سلاسل',
      slug: 'necklaces',
      is_active: true,
    },
  },
  {
    id: 102,
    category_id: 2,
    name: 'Pearl Bracelet',
    name_ar: 'سوار لؤلؤ',
    description: 'Delicate pearl bracelet',
    description_ar: 'سوار لؤلؤ ناعم',
    price: 180,
    discount_percent: 10,
    final_price: 162,
    stock_quantity: 4,
    in_stock: true,
    sold_count: 15,
    is_active: true,
    is_featured: true,
    image_url: 'products/bracelet-1.webp',
    extra_images: [],
    created_at: '2026-10-10T00:00:00Z',
    updated_at: '2026-10-10T00:00:00Z',
    category: {
      id: 2,
      name: 'Bracelets',
      name_ar: 'أساور',
      slug: 'bracelets',
      is_active: true,
    },
  },
]

function LocationWatcher() {
  const location = useLocation()
  return <div data-testid="current-location">{location.pathname + location.search}</div>
}

function renderSearchPage(initialEntries = ['/search']) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  })

  return render(
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <CartProvider>
          <MemoryRouter initialEntries={initialEntries}>
            <LocationWatcher />
            <Routes>
              <Route path="/search" element={<SearchPage />} />
              <Route path="/category/:slug" element={<div>Category Page</div>} />
            </Routes>
          </MemoryRouter>
        </CartProvider>
      </QueryClientProvider>
    </LanguageProvider>,
  )
}

describe('SearchPage (T-3.07)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('renders initial empty prompt state when no search query is provided', () => {
    vi.spyOn(catalogHooks, 'useSearchProducts').mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof catalogHooks.useSearchProducts>)

    renderSearchPage(['/search'])

    expect(screen.getByRole('heading', { level: 1, name: 'نتائج البحث' })).toBeInTheDocument()
    expect(screen.getByText('ابحث في متجر لوليز')).toBeInTheDocument()
    expect(screen.getByText(/اكتب اسم المنتج أو الإكسسوار/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'تصفّح' })).toBeInTheDocument()
  })

  it('renders search results when query matches products', () => {
    vi.spyOn(catalogHooks, 'useSearchProducts').mockReturnValue({
      data: mockProducts,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof catalogHooks.useSearchProducts>)

    renderSearchPage(['/search?q=%D9%84%D8%A4%D9%84%D8%A4']) // 'لؤلؤ'

    expect(screen.getByText('«لؤلؤ»')).toBeInTheDocument()
    expect(screen.getByText(/\(2 منتج\)|\(2 products\)/)).toBeInTheDocument()
    expect(screen.getByText('عقد لؤلؤ')).toBeInTheDocument()
    expect(screen.getByText('سوار لؤلؤ')).toBeInTheDocument()
  })

  it('renders empty state when search returns zero products', () => {
    vi.spyOn(catalogHooks, 'useSearchProducts').mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof catalogHooks.useSearchProducts>)

    renderSearchPage(['/search?q=unknownitem'])

    expect(screen.getByText('لا توجد نتائج. جرّب كلمة أخرى.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'تصفّح' })).toBeInTheDocument()
  })

  it('renders error panel with retry button when query fails', async () => {
    const user = userEvent.setup()
    const refetchMock = vi.fn()

    vi.spyOn(catalogHooks, 'useSearchProducts').mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new AppError('SYS-001', { raw: 'Network error' }),
      refetch: refetchMock,
    } as unknown as ReturnType<typeof catalogHooks.useSearchProducts>)

    renderSearchPage(['/search?q=errorquery'])

    expect(screen.getAllByRole('alert')[0]).toBeInTheDocument()
    const retryButton = screen.getByRole('button', { name: 'إعادة المحاولة' })
    expect(retryButton).toBeInTheDocument()

    await user.click(retryButton)
    expect(refetchMock).toHaveBeenCalled()
  })

  it('renders skeleton loading cards while search is in progress', () => {
    vi.spyOn(catalogHooks, 'useSearchProducts').mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof catalogHooks.useSearchProducts>)

    renderSearchPage(['/search?q=loadingquery'])

    expect(screen.getByRole('status', { name: 'Searching products' })).toBeInTheDocument()
  })

  it('debounces input typing and syncs search param to URL', async () => {
    const user = userEvent.setup()

    vi.spyOn(catalogHooks, 'useSearchProducts').mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof catalogHooks.useSearchProducts>)

    renderSearchPage(['/search'])

    const searchInput = screen.getByRole('searchbox', { name: 'بحث' })
    await user.type(searchInput, 'silver')

    await waitFor(
      () => {
        expect(screen.getByTestId('current-location')).toHaveTextContent('/search?q=silver')
      },
      { timeout: 1000 },
    )
  })

  it('clears query and resets URL when clear button is clicked', async () => {
    const user = userEvent.setup()

    vi.spyOn(catalogHooks, 'useSearchProducts').mockReturnValue({
      data: mockProducts,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof catalogHooks.useSearchProducts>)

    renderSearchPage(['/search?q=pearl'])

    const clearBtn = screen.getByRole('button', { name: 'مسح البحث' })
    expect(clearBtn).toBeInTheDocument()

    await user.click(clearBtn)

    expect(screen.getByTestId('current-location')).toHaveTextContent('/search')
    const searchInput = screen.getByRole('searchbox', { name: 'بحث' })
    expect(searchInput).toHaveValue('')
  })
})

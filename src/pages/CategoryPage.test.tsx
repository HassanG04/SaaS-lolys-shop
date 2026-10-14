import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LanguageProvider, type Language } from '@/i18n/LanguageProvider'
import CategoryPage from './CategoryPage'
import * as catalogHooks from '@/features/catalog/hooks'
import type { Category, ProductWithCategory } from '@/features/catalog/types'

const mockCategory: Category = {
  id: 1,
  name: 'Earrings',
  name_ar: 'أقراط',
  slug: 'earrings',
  image_url: 'categories/earrings-cover.webp',
  sort_order: 1,
  is_active: true,
  show_on_home: true,
  created_at: '2026-10-10T00:00:00Z',
}

const mockProducts: ProductWithCategory[] = [
  {
    id: 101,
    category_id: 1,
    name: 'Gold Earrings',
    name_ar: 'أقراط ذهبية',
    description: 'Golden earrings',
    description_ar: 'أقراط ذهبية أنيقة',
    price: 150,
    discount_percent: 20,
    final_price: 120,
    stock_quantity: 5,
    in_stock: true,
    sold_count: 50,
    is_active: true,
    is_featured: true,
    image_url: 'products/earrings-1.webp',
    extra_images: [],
    created_at: '2026-10-10T00:00:00Z',
    updated_at: '2026-10-10T00:00:00Z',
    category: {
      id: 1,
      name: 'Earrings',
      name_ar: 'أقراط',
      slug: 'earrings',
      is_active: true,
    },
  },
  {
    id: 102,
    category_id: 1,
    name: 'Pearl Studs',
    name_ar: 'أقراط اللؤلؤ',
    description: 'Pearl studs',
    description_ar: 'أقراط لؤلؤ كلاسيكية',
    price: 100,
    discount_percent: 0,
    final_price: 100,
    stock_quantity: 0,
    in_stock: false,
    sold_count: 80,
    is_active: true,
    is_featured: false,
    image_url: 'products/earrings-2.webp',
    extra_images: [],
    created_at: '2026-10-10T00:00:00Z',
    updated_at: '2026-10-10T00:00:00Z',
    category: {
      id: 1,
      name: 'Earrings',
      name_ar: 'أقراط',
      slug: 'earrings',
      is_active: true,
    },
  },
]

function LocationWatcher({
  onLocation,
}: {
  onLocation: (loc: ReturnType<typeof useLocation>) => void
}) {
  const loc = useLocation()
  onLocation(loc)
  return null
}

function renderCategoryPage(initialEntries = ['/category/earrings'], lang: Language = 'ar') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  let currentLocation: ReturnType<typeof useLocation> = {
    pathname: '',
    search: '',
    hash: '',
    state: null,
    key: 'default',
  }

  const result = render(
    <QueryClientProvider client={queryClient}>
      <LanguageProvider initialLanguage={lang}>
        <MemoryRouter initialEntries={initialEntries}>
          <LocationWatcher
            onLocation={(loc) => {
              currentLocation = loc
            }}
          />
          <Routes>
            <Route path="/category/:slug" element={<CategoryPage />} />
            <Route path="/category" element={<CategoryPage />} />
          </Routes>
        </MemoryRouter>
      </LanguageProvider>
    </QueryClientProvider>,
  )

  return {
    ...result,
    getCurrentLocation: () => currentLocation,
  }
}

describe('CategoryPage (T-3.04)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()

    // Default mock: category exists
    vi.spyOn(catalogHooks, 'useCategory').mockImplementation((slug) => {
      if (slug === 'earrings') {
        return {
          data: mockCategory,
          isLoading: false,
          error: null,
        } as unknown as ReturnType<typeof catalogHooks.useCategory>
      }
      return {
        data: null,
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof catalogHooks.useCategory>
    })

    // Default mock: products query
    vi.spyOn(catalogHooks, 'useBrowseProducts').mockReturnValue({
      data: {
        products: mockProducts,
        totalCount: 2,
        hasMore: false,
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof catalogHooks.useBrowseProducts>)
  })

  it('renders 404 when category slug is unknown', () => {
    vi.spyOn(catalogHooks, 'useCategory').mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof catalogHooks.useCategory>)

    renderCategoryPage(['/category/unknown-slug'])

    expect(screen.getByRole('heading', { level: 1, name: '404' })).toBeInTheDocument()
    expect(screen.getByText('القسم غير موجود')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'تصفّح الأقسام' })).toHaveAttribute(
      'href',
      '/category/all',
    )
  })

  it('renders category title, breadcrumbs, and products for valid category', () => {
    renderCategoryPage(['/category/earrings'])

    // Category heading
    expect(screen.getByRole('heading', { level: 1, name: 'أقراط' })).toBeInTheDocument()

    // Breadcrumbs
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(breadcrumb).getByRole('link', { name: 'الرئيسية' })).toHaveAttribute('href', '/')
    expect(within(breadcrumb).getByRole('link', { name: 'جميع المنتجات' })).toHaveAttribute(
      'href',
      '/category/all',
    )
    expect(within(breadcrumb).getByText('أقراط')).toBeInTheDocument()

    // Products are displayed
    expect(screen.getByText('أقراط ذهبية')).toBeInTheDocument()
    expect(screen.getByText('أقراط اللؤلؤ')).toBeInTheDocument()
  })

  it('defaults to in-stock items by default (inStockOnly: true)', () => {
    const browseSpy = vi.spyOn(catalogHooks, 'useBrowseProducts')

    renderCategoryPage(['/category/earrings'])

    expect(browseSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        categorySlug: 'earrings',
        inStockOnly: true,
        sortBy: 'best_sellers',
      }),
    )

    // Checkbox is unchecked by default
    const checkbox = screen.getByRole('checkbox', { name: 'عرض المنتجات المنتهية' })
    expect(checkbox).not.toBeChecked()
  })

  it('toggling show sold out updates the URL search params and query filter', async () => {
    const user = userEvent.setup()
    const browseSpy = vi.spyOn(catalogHooks, 'useBrowseProducts')

    const { getCurrentLocation } = renderCategoryPage(['/category/earrings'])

    const checkbox = screen.getByRole('checkbox', { name: 'عرض المنتجات المنتهية' })
    await user.click(checkbox)

    // URL is updated to sold_out=1
    expect(getCurrentLocation().search).toContain('sold_out=1')

    // useBrowseProducts is called with inStockOnly: false
    expect(browseSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        inStockOnly: false,
      }),
    )
  })

  it('changing sort selector updates the URL search params and query option', async () => {
    const user = userEvent.setup()
    const browseSpy = vi.spyOn(catalogHooks, 'useBrowseProducts')

    const { getCurrentLocation } = renderCategoryPage(['/category/earrings'])

    const select = screen.getByRole('combobox', { name: /ترتيب حسب/i })
    await user.selectOptions(select, 'price_asc')

    // URL is updated to sort=price_asc
    expect(getCurrentLocation().search).toContain('sort=price_asc')

    // useBrowseProducts is called with sortBy: 'price_asc'
    expect(browseSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        sortBy: 'price_asc',
      }),
    )
  })

  it('reloading a filtered URL restores the exact same view and controls state', () => {
    const browseSpy = vi.spyOn(catalogHooks, 'useBrowseProducts')

    // Initial URL with filtered sort and sold_out
    renderCategoryPage(['/category/earrings?sort=price_desc&sold_out=1'])

    // Controls restore state
    const select = screen.getByRole('combobox', { name: /ترتيب حسب/i })
    expect(select).toHaveValue('price_desc')

    const checkbox = screen.getByRole('checkbox', { name: 'عرض المنتجات المنتهية' })
    expect(checkbox).toBeChecked()

    // Query executed with restored params
    expect(browseSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        categorySlug: 'earrings',
        sortBy: 'price_desc',
        inStockOnly: false,
      }),
    )
  })

  it('supports virtual all categories slug with all products title', () => {
    renderCategoryPage(['/category/all'])

    expect(screen.getByRole('heading', { level: 1, name: 'جميع المنتجات' })).toBeInTheDocument()
  })

  it('renders empty state when no products are returned', () => {
    vi.spyOn(catalogHooks, 'useBrowseProducts').mockReturnValue({
      data: {
        products: [],
        totalCount: 0,
        hasMore: false,
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof catalogHooks.useBrowseProducts>)

    renderCategoryPage(['/category/earrings'])

    expect(screen.getByText('لم يتم العثور على منتجات في هذا القسم.')).toBeInTheDocument()
  })

  it('supports English localization and LTR labels', () => {
    renderCategoryPage(['/category/all'], 'en')

    expect(screen.getByRole('heading', { level: 1, name: 'All Products' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Show sold out products' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /Sort By/i })).toBeInTheDocument()
  })
})

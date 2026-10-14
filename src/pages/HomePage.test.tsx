import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LanguageProvider, type Language } from '@/i18n/LanguageProvider'
import HomePage from './HomePage'
import * as settingsHooks from '@/features/settings/hooks'
import * as catalogHooks from '@/features/catalog/hooks'
import type { Category, ProductWithCategory } from '@/features/catalog/types'

const mockCategories: Category[] = [
  {
    id: 1,
    name: 'Earrings',
    name_ar: 'أقراط',
    slug: 'earrings',
    image_url: 'categories/earrings-cover.webp',
    sort_order: 1,
    is_active: true,
    show_on_home: true,
    created_at: '2026-10-10T00:00:00Z',
  },
  {
    id: 2,
    name: 'Chains',
    name_ar: 'سلاسل',
    slug: 'chains',
    image_url: 'categories/chains-cover.webp',
    sort_order: 2,
    is_active: true,
    show_on_home: true,
    created_at: '2026-10-10T00:00:00Z',
  },
]

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
    },
  },
  {
    id: 102,
    category_id: 2,
    name: 'Silver Chain',
    name_ar: 'سلسلة فضية',
    description: 'Silver chain',
    description_ar: 'سلسلة فضية نقية',
    price: 300,
    discount_percent: 0,
    final_price: 300,
    stock_quantity: 8,
    in_stock: true,
    sold_count: 35,
    is_active: true,
    is_featured: false,
    image_url: 'products/chain-1.webp',
    extra_images: [],
    created_at: '2026-10-10T00:00:00Z',
    updated_at: '2026-10-10T00:00:00Z',
    category: {
      id: 2,
      name: 'Chains',
      name_ar: 'سلاسل',
      slug: 'chains',
    },
  },
]

function renderWithProviders(initialLanguage: Language = 'ar') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <LanguageProvider initialLanguage={initialLanguage}>
          <HomePage />
        </LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('HomePage (T-3.03)', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock data
    vi.spyOn(settingsHooks, 'usePublicSettings').mockReturnValue({
      data: {
        hero_title_ar: 'إكسسوارات صنعت بكل حب',
        hero_subtitle_ar: 'قطع مميزة تناسب ذوقك وتضيف لمسة من الأناقة ليومك',
        sale_percent: 50,
        returns_text_ar: 'إمكانية الاسترجاع أو الاستبدال خلال 14 يوماً من الاستلام.',
        tagline_ar: 'أشياء لطيفة لأسلوبك ومساحتك',
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof settingsHooks.usePublicSettings>)

    vi.spyOn(catalogHooks, 'useCategories').mockReturnValue({
      data: mockCategories,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof catalogHooks.useCategories>)

    vi.spyOn(catalogHooks, 'useBestSellers').mockReturnValue({
      data: [mockProducts[0]],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof catalogHooks.useBestSellers>)

    vi.spyOn(catalogHooks, 'useBrowseProducts').mockReturnValue({
      data: {
        products: mockProducts,
        totalCount: 2,
        hasMore: false,
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof catalogHooks.useBrowseProducts>)
  })

  it('renders Hero with live public settings, ornaments, and call to action links', () => {
    renderWithProviders('ar')

    // Dynamic hero title from settings
    expect(screen.getByText('إكسسوارات صنعت بكل حب')).toBeInTheDocument()
    expect(screen.getByText('قطع مميزة تناسب ذوقك وتضيف لمسة من الأناقة ليومك')).toBeInTheDocument()

    // Sale banner percentage
    expect(screen.getByText(/خصم يصل إلى 50%/)).toBeInTheDocument()

    // CTAs linking to anchors
    const ctaBrowse = screen.getByRole('link', { name: 'تسوّق العروض' })
    expect(ctaBrowse).toHaveAttribute('href', '#browse')

    const ctaStore = screen.getByRole('link', { name: 'استكشف الأقسام' })
    expect(ctaStore).toHaveAttribute('href', '#store')
  })

  it('proves changing a public setting changes the hero without a deploy', () => {
    // Override settings to simulate database setting update
    vi.spyOn(settingsHooks, 'usePublicSettings').mockReturnValue({
      data: {
        hero_title_ar: 'عروض الصيف الكبرى',
        hero_subtitle_ar: 'تخفيضات استثنائية على كل التشكيلات',
        sale_percent: 70,
        returns_text_ar: 'استبدال خلال 30 يوم.',
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof settingsHooks.usePublicSettings>)

    renderWithProviders('ar')

    expect(screen.getByText('عروض الصيف الكبرى')).toBeInTheDocument()
    expect(screen.getByText('تخفيضات استثنائية على كل التشكيلات')).toBeInTheDocument()
    expect(screen.getByText(/خصم يصل إلى 70%/)).toBeInTheDocument()
  })

  it('renders Store section with category tiles and arch frames', () => {
    const { container } = renderWithProviders('ar')

    const storeSection = container.querySelector('#store')
    expect(storeSection).toBeInTheDocument()

    expect(screen.getByRole('heading', { name: 'تسوّق حسب القسم' })).toBeInTheDocument()

    // Check category tiles rendered
    expect(screen.getByTestId('category-tile-earrings')).toBeInTheDocument()
    expect(screen.getByTestId('category-tile-chains')).toBeInTheDocument()
  })

  it('renders Browse section with filters, sort selector, and products grid', async () => {
    const user = userEvent.setup()
    const browseMock = vi.fn().mockReturnValue({
      data: {
        products: mockProducts,
        totalCount: 15,
        hasMore: true,
      },
      isLoading: false,
      error: null,
    })
    vi.spyOn(catalogHooks, 'useBrowseProducts').mockImplementation(browseMock)

    const { container } = renderWithProviders('ar')

    const browseSection = container.querySelector('#browse')
    expect(browseSection).toBeInTheDocument()

    // Products in grid
    expect(within(browseSection as HTMLElement).getByText('أقراط ذهبية')).toBeInTheDocument()
    expect(within(browseSection as HTMLElement).getByText('سلسلة فضية')).toBeInTheDocument()

    // Sort select
    const sortSelect = screen.getByLabelText(/ترتيب حسب/)
    expect(sortSelect).toBeInTheDocument()
    await user.selectOptions(sortSelect, 'newest')

    // Filter pill clicked
    const chainsPill = screen.getAllByRole('button', { name: 'سلاسل' })[0]
    await user.click(chainsPill)

    // Load more button
    const loadMoreBtn = screen.getByRole('button', { name: 'عرض المزيد' })
    expect(loadMoreBtn).toBeInTheDocument()
    await user.click(loadMoreBtn)
  })

  it('renders About and Delivery section with returns guarantee from settings', () => {
    renderWithProviders('ar')

    const aboutHeading = screen.getAllByText('عن المتجر')
    expect(aboutHeading.length).toBeGreaterThanOrEqual(1)

    expect(screen.getByText('التوصيل والدفع')).toBeInTheDocument()
    expect(
      screen.getByText('إمكانية الاسترجاع أو الاستبدال خلال 14 يوماً من الاستلام.'),
    ).toBeInTheDocument()
  })
})

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LanguageProvider, type Language } from '@/i18n/LanguageProvider'
import { ToastProvider } from '@/components/ui/ToastProvider'
import ProductPage from './ProductPage'
import * as catalogHooks from '@/features/catalog/hooks'
import type { ProductWithCategory } from '@/features/catalog/types'

vi.mock('@/features/reviews', () => ({
  ProductReviewsSection: () => <div data-testid="mock-reviews-section" />,
  useProductReviewSummary: () => ({
    data: { average_rating: 4.5, total_reviews: 12 },
    isLoading: false,
  }),
  StarRating: () => <div data-testid="mock-star-rating" />,
}))

const mockProductInStock: ProductWithCategory = {
  id: 42,
  category_id: 1,
  name: 'Sparkle Ring',
  name_ar: 'خاتم اللمعة',
  description: 'Handcrafted sparkle ring',
  description_ar: 'خاتم فضة لامع مصمم يدويًا بحب',
  price: 200,
  discount_percent: 25,
  final_price: 150,
  stock_quantity: 4, // low stock (<= 5)
  in_stock: true,
  sold_count: 35,
  is_active: true,
  is_featured: true,
  image_url: 'products/product-main.webp',
  extra_images: ['products/product-angle.webp', 'products/product-lifestyle.webp'],
  created_at: '2026-10-10T00:00:00Z',
  updated_at: '2026-10-10T00:00:00Z',
  category: {
    id: 1,
    name: 'Rings',
    name_ar: 'خواتم',
    slug: 'rings',
    is_active: true,
  },
}

const mockProductSoldOut: ProductWithCategory = {
  id: 43,
  category_id: 1,
  name: 'Vintage Brooch',
  name_ar: 'بروش كلاسيكي',
  description: 'Vintage brooch',
  description_ar: 'بروش كلاسيكي نادر',
  price: 300,
  discount_percent: 0,
  final_price: 300,
  stock_quantity: 0,
  in_stock: false,
  sold_count: 10,
  is_active: true,
  is_featured: false,
  image_url: 'products/brooch-main.webp',
  extra_images: [],
  created_at: '2026-10-10T00:00:00Z',
  updated_at: '2026-10-10T00:00:00Z',
  category: {
    id: 1,
    name: 'Rings',
    name_ar: 'خواتم',
    slug: 'rings',
    is_active: true,
  },
}

const mockRelatedProducts: ProductWithCategory[] = [
  mockProductInStock,
  {
    id: 44,
    category_id: 1,
    name: 'Silver Band',
    name_ar: 'دبلة فضية',
    description: 'Silver band',
    description_ar: 'دبلة فضية ناعمة',
    price: 180,
    discount_percent: 0,
    final_price: 180,
    stock_quantity: 10,
    in_stock: true,
    sold_count: 20,
    is_active: true,
    is_featured: false,
    image_url: 'products/band-main.webp',
    extra_images: [],
    created_at: '2026-10-10T00:00:00Z',
    updated_at: '2026-10-10T00:00:00Z',
    category: {
      id: 1,
      name: 'Rings',
      name_ar: 'خواتم',
      slug: 'rings',
      is_active: true,
    },
  },
]

function renderProductPage(initialEntries = ['/product/42'], lang: Language = 'ar') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <LanguageProvider initialLanguage={lang}>
        <ToastProvider>
          <MemoryRouter initialEntries={initialEntries}>
            <Routes>
              <Route path="/product/:id" element={<ProductPage />} />
              <Route path="/category/:slug" element={<div data-testid="category-screen" />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </LanguageProvider>
    </QueryClientProvider>,
  )
}

describe('ProductPage (T-3.05)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()

    vi.spyOn(catalogHooks, 'useProduct').mockImplementation((id) => {
      if (id === 42) {
        return {
          data: mockProductInStock,
          isLoading: false,
          error: null,
        } as unknown as ReturnType<typeof catalogHooks.useProduct>
      }
      if (id === 43) {
        return {
          data: mockProductSoldOut,
          isLoading: false,
          error: null,
        } as unknown as ReturnType<typeof catalogHooks.useProduct>
      }
      return {
        data: null,
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof catalogHooks.useProduct>
    })

    vi.spyOn(catalogHooks, 'useProductsByCategory').mockReturnValue({
      data: mockRelatedProducts,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof catalogHooks.useProductsByCategory>)
  })

  it('renders 404 when product id is unknown or non-numeric', () => {
    renderProductPage(['/product/999'])

    expect(screen.getByRole('heading', { level: 1, name: '404' })).toBeInTheDocument()
    expect(screen.getByText('المنتج غير موجود')).toBeInTheDocument()
  })

  it('renders product title, price, discount badge, and breadcrumbs', () => {
    renderProductPage(['/product/42'])

    // Title
    expect(screen.getByRole('heading', { level: 1, name: 'خاتم اللمعة' })).toBeInTheDocument()

    // Pricing
    expect(screen.getByText(/150/)).toBeInTheDocument()
    expect(screen.getByText(/200/)).toBeInTheDocument()
    expect(screen.getByText('-25%')).toBeInTheDocument()

    // Breadcrumb
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(breadcrumb).getByRole('link', { name: 'الرئيسية' })).toHaveAttribute('href', '/')
    expect(within(breadcrumb).getByRole('link', { name: 'خواتم' })).toHaveAttribute(
      'href',
      '/category/rings',
    )
    expect(within(breadcrumb).getByText('خاتم اللمعة')).toBeInTheDocument()
  })

  it('renders gallery thumbnails and switches selected image on click', async () => {
    const user = userEvent.setup()
    renderProductPage(['/product/42'])

    const thumbnails = screen.getAllByRole('button', { name: /Thumbnail/i })
    expect(thumbnails).toHaveLength(3)

    // Click second thumbnail
    await user.click(thumbnails[1])

    const mainImage = screen.getByRole('img', { name: 'خاتم اللمعة' })
    expect(mainImage.getAttribute('src')).toContain('product-angle.webp')
  })

  it('shows stock note when quantity is 5 or fewer ("متبقي N فقط")', () => {
    renderProductPage(['/product/42'])

    expect(screen.getByText('متبقي 4 فقط')).toBeInTheDocument()
  })

  it('quantity stepper increments and caps at available stock (cannot exceed stock)', async () => {
    const user = userEvent.setup()
    renderProductPage(['/product/42'])

    const decreaseBtn = screen.getByRole('button', { name: 'تقليل الكمية' })
    const increaseBtn = screen.getByRole('button', { name: 'زيادة الكمية' })
    const qtyValue = screen.getByTestId('quantity-value')

    expect(qtyValue).toHaveTextContent('1')
    expect(decreaseBtn).toBeDisabled()

    // Increase up to max stock (4)
    await user.click(increaseBtn)
    expect(qtyValue).toHaveTextContent('2')
    expect(decreaseBtn).not.toBeDisabled()

    await user.click(increaseBtn)
    expect(qtyValue).toHaveTextContent('3')

    await user.click(increaseBtn)
    expect(qtyValue).toHaveTextContent('4')

    // Cannot exceed stock: button disabled at 4
    expect(increaseBtn).toBeDisabled()
    expect(qtyValue).toHaveTextContent('4')

    // Decrease back
    await user.click(decreaseBtn)
    expect(qtyValue).toHaveTextContent('3')
    expect(increaseBtn).not.toBeDisabled()
  })

  it('sold out product shows disabled state and cannot be added to cart', () => {
    renderProductPage(['/product/43'])

    // Sold out badge and note
    expect(screen.getAllByText('نفد من المخزون').length).toBeGreaterThanOrEqual(1)

    // Stepper buttons disabled
    expect(screen.getByRole('button', { name: 'تقليل الكمية' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'زيادة الكمية' })).toBeDisabled()
    expect(screen.getByTestId('quantity-value')).toHaveTextContent('0')

    // Add to cart button is disabled
    const addBtn = screen.getByRole('button', { name: 'نفد من المخزون' })
    expect(addBtn).toBeDisabled()
  })

  it('renders delivery and assurance info chips', () => {
    renderProductPage(['/product/42'])

    expect(screen.getByText('توصيل سريع لجميع المحافظات')).toBeInTheDocument()
    expect(screen.getByText('تغليف هدايا أنيق متاح')).toBeInTheDocument()
    expect(screen.getByText('استرجاع واستبدال خلال 14 يومًا')).toBeInTheDocument()
  })

  it('renders related products from same category excluding the current product', () => {
    renderProductPage(['/product/42'])

    expect(screen.getByRole('heading', { level: 2, name: 'منتجات قد تعجبك' })).toBeInTheDocument()

    // Product 44 is displayed as related
    expect(screen.getByText('دبلة فضية')).toBeInTheDocument()

    // Current product 42 is not duplicated inside related products
    const relatedSection = screen.getByRole('region', { name: 'منتجات قد تعجبك' })
    expect(within(relatedSection).queryByText('خاتم اللمعة')).not.toBeInTheDocument()
  })

  it('supports English language rendering and labels', () => {
    renderProductPage(['/product/42'], 'en')

    expect(screen.getByRole('heading', { level: 1, name: 'Sparkle Ring' })).toBeInTheDocument()
    expect(screen.getByText('Only 4 left')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add to Cart' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'You might also like' }),
    ).toBeInTheDocument()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { LanguageProvider } from '@/i18n/LanguageProvider'
import { WishlistDemandTable } from './WishlistDemandTable'
import * as api from './api'
import type { WishlistDemandItem } from './types'

const mockDemandItems: WishlistDemandItem[] = [
  {
    product_id: 101,
    product_name: 'Crystal Ceramic Mug',
    product_name_ar: 'كوب سيراميك كريستال',
    price: 350,
    discount_percent: 10,
    final_price: 315,
    stock_quantity: 12,
    is_active: true,
    image_url: 'https://example.com/mug.jpg',
    wishlist_count: 42,
  },
  {
    product_id: 102,
    product_name: 'Silver Pearl Bracelet',
    product_name_ar: 'سوار اللؤلؤ الفضي',
    price: 220,
    discount_percent: 0,
    final_price: 220,
    stock_quantity: 0,
    is_active: true,
    image_url: '',
    wishlist_count: 19,
  },
]

function renderWithProviders(ui: React.ReactElement, initialLang: 'ar' | 'en' = 'ar') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <LanguageProvider initialLanguage={initialLang}>
        <MemoryRouter>{ui}</MemoryRouter>
      </LanguageProvider>
    </QueryClientProvider>,
  )
}

describe('WishlistDemandTable (T-2.10)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(api, 'adminFetchWishlistDemandApi').mockResolvedValue(mockDemandItems)
  })

  it('renders products ranked by wishlist demand count and shows stock badges', async () => {
    renderWithProviders(<WishlistDemandTable />, 'ar')

    // Find products
    expect(await screen.findByText('كوب سيراميك كريستال')).toBeInTheDocument()
    expect(screen.getByText('سوار اللؤلؤ الفضي')).toBeInTheDocument()

    // Wishlist counts
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('19')).toBeInTheDocument()

    // Stock
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText(/قطعة/i)).toBeInTheDocument()
    expect(screen.getByText('نفد من المخزون')).toBeInTheDocument()
  })

  it('renders English product names and out of stock label in en mode', async () => {
    renderWithProviders(<WishlistDemandTable />, 'en')

    expect(await screen.findByText('Crystal Ceramic Mug')).toBeInTheDocument()
    expect(screen.getByText('Silver Pearl Bracelet')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText(/units/i)).toBeInTheDocument()
    expect(screen.getByText(/Out of stock/i)).toBeInTheDocument()
  })

  it('renders empty state when no items are in demand', async () => {
    vi.spyOn(api, 'adminFetchWishlistDemandApi').mockResolvedValue([])
    renderWithProviders(<WishlistDemandTable />, 'ar')

    expect(await screen.findByText('لا توجد بيانات تفضيل حتى الآن')).toBeInTheDocument()
  })
})

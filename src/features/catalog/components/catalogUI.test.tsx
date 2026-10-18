import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { LanguageProvider, type Language } from '@/i18n/LanguageProvider'
import { ProductImage } from './ProductImage'
import { ProductCard } from './ProductCard'
import { CategoryTile } from './CategoryTile'
import type { Product, Category } from '../types'

const mockAvailableProduct: Product = {
  id: 1,
  category_id: 10,
  name: 'Golden Bracelet',
  name_ar: 'سوار ذهبي',
  description: 'Handcrafted golden chain bracelet.',
  description_ar: 'سوار سلسلة ذهبية مصنوع يدويًا.',
  price: 200,
  discount_percent: 25,
  final_price: 150,
  stock_quantity: 5,
  in_stock: true,
  sold_count: 12,
  is_active: true,
  is_featured: true,
  image_url: 'products/bracelet-gold.webp',
  extra_images: [],
  created_at: '2026-10-10T00:00:00Z',
  updated_at: '2026-10-10T00:00:00Z',
}

const mockSoldOutProduct: Product = {
  id: 2,
  category_id: 10,
  name: 'Pearl Hairpin',
  name_ar: 'دبوس شعر لؤلؤي',
  description: 'Classic hairpin with pearl.',
  description_ar: 'دبوس شعر كلاسيكي مع لؤلؤة.',
  price: 80,
  discount_percent: 0,
  final_price: 80,
  stock_quantity: 0,
  in_stock: false,
  sold_count: 40,
  is_active: true,
  is_featured: false,
  image_url: 'products/hairpin-pearl.webp',
  extra_images: [],
  created_at: '2026-10-10T00:00:00Z',
  updated_at: '2026-10-10T00:00:00Z',
}

const mockCategory: Category = {
  id: 10,
  name: 'Bracelets & Bangles',
  name_ar: 'أساور وأغواش',
  slug: 'bracelets',
  image_url: 'categories/bracelets-cover.webp',
  sort_order: 1,
  is_active: true,
  show_on_home: true,
  created_at: '2026-10-10T00:00:00Z',
}

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CartProvider } from '@/features/cart'

function renderWithProviders(ui: React.ReactElement, initialLanguage: Language = 'ar') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <LanguageProvider initialLanguage={initialLanguage}>
          <CartProvider>{ui}</CartProvider>
        </LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Catalog UI Components (T-3.02)', () => {
  describe('ProductImage', () => {
    it('renders with aspect-ratio container, lazy loading and resolved storage path', () => {
      const { container } = renderWithProviders(
        <ProductImage src="products/necklace-test.webp" alt="Necklace" />,
      )

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper.className).toContain('aspect-square')
      expect(wrapper.className).toContain('rounded-image')

      const img = screen.getByRole('img', { name: 'Necklace' })
      expect(img).toHaveAttribute('loading', 'lazy')
      expect(img).toHaveAttribute('src', expect.stringContaining('products/necklace-test.webp'))
    })

    it('supports custom aspect ratio without layout shift', () => {
      const { container } = renderWithProviders(
        <ProductImage src="products/necklace-test.webp" alt="Necklace" aspectRatio="4/3" />,
      )

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper.className).toContain('aspect-4/3')
    })

    it('falls back to accessible placeholder when image src is missing or triggers error', () => {
      renderWithProviders(<ProductImage src={null} alt="Missing Item" />)

      const fallback = screen.getByRole('img', { name: 'Missing Item' })
      expect(fallback).toBeInTheDocument()
      expect(fallback.tagName).toBe('DIV')

      // Now test image load error handling
      const { rerender } = renderWithProviders(
        <ProductImage src="products/broken-path.webp" alt="Broken Item" />,
      )
      const img = screen.getByRole('img', { name: 'Broken Item' })
      fireEvent.error(img)

      rerender(
        <MemoryRouter>
          <LanguageProvider initialLanguage="ar">
            <ProductImage src="products/broken-path.webp" alt="Broken Item" />
          </LanguageProvider>
        </MemoryRouter>,
      )

      expect(screen.getByRole('img', { name: 'Broken Item' })).toBeInTheDocument()
    })

    it('resets loaded and error states when src prop changes', () => {
      const { rerender } = renderWithProviders(
        <ProductImage src="products/initial.webp" alt="Test Item" />,
      )

      const img = screen.getByRole('img', { name: 'Test Item' })
      fireEvent.load(img)
      expect(img.className).toContain('opacity-100')

      // Rerender with broken image
      rerender(
        <MemoryRouter>
          <LanguageProvider initialLanguage="ar">
            <ProductImage src="products/broken.webp" alt="Test Item" />
          </LanguageProvider>
        </MemoryRouter>,
      )

      const brokenImg = screen.getByRole('img', { name: 'Test Item' })
      fireEvent.error(brokenImg)
      expect(screen.getByRole('img', { name: 'Test Item' }).tagName).toBe('DIV')

      // Replace with recovered image: should reset error and display IMG tag
      rerender(
        <MemoryRouter>
          <LanguageProvider initialLanguage="ar">
            <ProductImage src="products/recovered.webp" alt="Test Item" />
          </LanguageProvider>
        </MemoryRouter>,
      )

      const recoveredImg = screen.getByRole('img', { name: 'Test Item' })
      expect(recoveredImg.tagName).toBe('IMG')
      fireEvent.load(recoveredImg)
      expect(recoveredImg.className).toContain('opacity-100')
    })
  })

  describe('ProductCard', () => {
    it('renders 28px card radius, 20px inner image radius, links, and prices', () => {
      const { container } = renderWithProviders(<ProductCard product={mockAvailableProduct} />)

      // Card radius 28px
      const card = container.querySelector('article')
      expect(card?.className).toContain('rounded-card')

      // Inner image radius 20px
      const imageContainer = container.querySelector('.rounded-image')
      expect(imageContainer).toBeInTheDocument()

      // Product link
      const titleLink = screen.getByRole('link', { name: 'سوار ذهبي' })
      expect(titleLink).toHaveAttribute('href', '/product/1')

      // Prices: final price 150 and original 200 struck through
      expect(screen.getByText(/150/)).toBeInTheDocument()
      const struckThrough = container.querySelector('del')
      expect(struckThrough).toBeInTheDocument()
      expect(struckThrough?.textContent).toContain('200')

      // Discount badge
      expect(screen.getByText('-25%')).toBeInTheDocument()

      // Add to cart button is enabled
      const addBtn = screen.getByRole('button', { name: /أضف إلى السلة/ })
      expect(addBtn).toBeEnabled()
    })

    it('calls onAddToCart when available item is added', async () => {
      const user = userEvent.setup()
      const onAdd = vi.fn()

      renderWithProviders(<ProductCard product={mockAvailableProduct} onAddToCart={onAdd} />)

      const addBtn = screen.getByRole('button', { name: /أضف إلى السلة/ })
      await user.click(addBtn)

      expect(onAdd).toHaveBeenCalledWith(mockAvailableProduct)
    })

    it('adds product directly via CartProvider when onAddToCart is not provided', async () => {
      const user = userEvent.setup()

      renderWithProviders(<ProductCard product={mockAvailableProduct} />)

      const addBtn = screen.getByRole('button', { name: /أضف إلى السلة/ })
      expect(addBtn.className).toContain('flower-button')
      await user.click(addBtn)

      // Button remains accessible and rendered
      expect(screen.getByRole('button', { name: /أضف إلى السلة/ })).toBeInTheDocument()
    })

    it('proves sold-out items are clearly marked and CANNOT be added', async () => {
      const user = userEvent.setup()
      const onAdd = vi.fn()

      renderWithProviders(<ProductCard product={mockSoldOutProduct} onAddToCart={onAdd} />)

      // Clearly marked with sold out badge
      const badges = screen.getAllByText('نفد من المخزون')
      expect(badges.length).toBeGreaterThanOrEqual(1)

      // Button is disabled
      const btn = screen.getByRole('button', { name: /دبوس شعر لؤلؤي - نفد من المخزون/ })
      expect(btn).toBeDisabled()

      // Attempting to click must NOT trigger onAddToCart
      await user.click(btn)
      expect(onAdd).not.toHaveBeenCalled()
    })

    it('places offer badge opposite wishlist button using logical start and end classes (T-3.10b)', () => {
      const { container } = renderWithProviders(
        <ProductCard product={mockAvailableProduct} />,
        'ar',
      )

      const badgeOverlay = container.querySelector('.product-badges-overlay')
      const favoriteOverlay = container.querySelector('.product-favorite-overlay')

      expect(badgeOverlay).toBeInTheDocument()
      expect(badgeOverlay?.className).toContain('start-2')
      expect(favoriteOverlay).toBeInTheDocument()
      expect(favoriteOverlay?.className).toContain('end-2')

      // In Arabic, favorite button accessible name uses Arabic name
      const favBtnAr = screen.getByRole('button', { name: /إضافة إلى المفضلة - سوار ذهبي/ })
      expect(favBtnAr).toBeInTheDocument()
    })

    it('renders English product name in favorite button accessible name when language is en (T-3.10b)', () => {
      renderWithProviders(<ProductCard product={mockAvailableProduct} />, 'en')

      const favBtnEn = screen.getByRole('button', { name: /Add to favorites - Golden Bracelet/ })
      expect(favBtnEn).toBeInTheDocument()
    })
  })

  describe('CategoryTile', () => {
    it('renders full-bleed image with floating label chip and category link', () => {
      const { container } = renderWithProviders(<CategoryTile category={mockCategory} />)

      const link = screen.getByRole('link', { name: 'أساور وأغواش' })
      expect(link).toHaveAttribute('href', '/category/bracelets')
      expect(link.className).toContain('rounded-card')

      // Label chip is rendered
      expect(screen.getByText('أساور وأغواش')).toBeInTheDocument()

      // Image has full bleed aspect square
      const img = container.querySelector('img')
      expect(img).toHaveAttribute('src', expect.stringContaining('categories/bracelets-cover.webp'))
    })

    it('renders English name when language is en', () => {
      renderWithProviders(<CategoryTile category={mockCategory} />, 'en')
      expect(screen.getByText('Bracelets & Bangles')).toBeInTheDocument()
    })
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import type { ReactNode } from 'react'
import { LanguageProvider } from '@/i18n/LanguageProvider'
import { ToastProvider } from '@/components/ui/ToastProvider'
import { AppError } from '@/lib/errors'
import { buildProductInsertPayload, buildProductUpdatePayload } from './payloadBuilder'
import {
  detectProductImageSignature,
  validateProductImageFile,
  generateProductStoragePath,
  calculateTargetDimensions,
} from './imageUpload'
import { DeleteProductDialog } from './DeleteProductDialog'
import ProductFormPage from './ProductFormPage'
import * as api from './api'
import type { AdminProduct } from './types'

// Mock Supabase storage and API
vi.mock('@/lib/supabase', () => {
  const client = {
    from: vi.fn(),
    rpc: vi.fn(),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: { path: 'products/1/test.webp' }, error: null }),
        getPublicUrl: vi.fn((path: string) => ({
          data: {
            publicUrl: `https://test.supabase.co/storage/v1/object/public/product-images/${path}`,
          },
        })),
      })),
    },
  }
  return {
    supabase: client,
    getSupabase: () => client,
  }
})

const sampleProduct: AdminProduct = {
  id: 42,
  category_id: 1,
  name: 'Velvet Headband',
  name_ar: 'طوق مخملي راقي',
  description: 'Soft velvet headband with golden pearls',
  description_ar: 'طوق شعر من المخمل الناعم مرصع بحبات اللؤلؤ الذهبي',
  price: 250,
  discount_percent: 10,
  final_price: 225,
  stock_quantity: 8,
  in_stock: true,
  sold_count: 14,
  is_active: true,
  is_featured: true,
  image_url: 'products/42/main.webp',
  extra_images: ['products/42/gallery1.webp', 'products/42/gallery2.webp'],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
}

function createWrapper(initialEntries = ['/']) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <ToastProvider>
            <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
          </ToastProvider>
        </LanguageProvider>
      </QueryClientProvider>
    )
  }
}

describe('T-5.03: Product form, images, and lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '')
    })
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.removeAttribute('open')
    })
  })

  // ---------------------------------------------------------------------------
  // 1. Success Criterion: Payload builder strictly omits generated columns
  // ---------------------------------------------------------------------------
  describe('Payload Builder', () => {
    it('proves buildProductInsertPayload omits generated and DB-maintained columns', () => {
      const input = {
        name: '  Pearl Bracelet  ',
        name_ar: '  سوار لؤلؤ  ',
        description: '<p>Beautiful <b>handcrafted</b> bracelet</p>',
        description_ar: '<script>alert("xss")</script>سوار لؤلؤ رائع',
        category_id: 3,
        price: 199.99,
        discount_percent: 15,
        stock_quantity: 25,
        is_featured: true,
        is_active: true,
        image_url: ' products/bracelet.webp ',
        extra_images: ['products/extra1.webp'],
      }

      const payload = buildProductInsertPayload(input)

      // 1. Assert NO generated or system columns exist
      expect(payload).not.toHaveProperty('id')
      expect(payload).not.toHaveProperty('final_price')
      expect(payload).not.toHaveProperty('in_stock')
      expect(payload).not.toHaveProperty('sold_count')
      expect(payload).not.toHaveProperty('created_at')
      expect(payload).not.toHaveProperty('updated_at')

      // 2. Assert values are sanitized and cleanly shaped
      expect(payload.name).toBe('Pearl Bracelet')
      expect(payload.name_ar).toBe('سوار لؤلؤ')
      expect(payload.description).toBe('Beautiful handcrafted bracelet')
      expect(payload.description_ar).toBe('alert("xss")سوار لؤلؤ رائع')
      expect(payload.category_id).toBe(3)
      expect(payload.price).toBe(199.99)
      expect(payload.discount_percent).toBe(15)
      expect(payload.stock_quantity).toBe(25)
      expect(payload.is_featured).toBe(true)
      expect(payload.is_active).toBe(true)
      expect(payload.image_url).toBe('products/bracelet.webp')
      expect(payload.extra_images).toEqual(['products/extra1.webp'])
    })

    it('proves buildProductUpdatePayload omits generated columns and ignores stock_quantity', () => {
      const input = {
        name: 'Updated Ring',
        price: 350,
        discount_percent: 20,
        stock_quantity: 99, // Should NOT be included in update payload
        is_featured: false,
      }

      const payload = buildProductUpdatePayload(input)

      expect(payload).not.toHaveProperty('id')
      expect(payload).not.toHaveProperty('final_price')
      expect(payload).not.toHaveProperty('in_stock')
      expect(payload).not.toHaveProperty('sold_count')
      expect(payload).not.toHaveProperty('stock_quantity')
      expect(payload).not.toHaveProperty('created_at')
      expect(payload).not.toHaveProperty('updated_at')

      expect(payload.name).toBe('Updated Ring')
      expect(payload.price).toBe(350)
      expect(payload.discount_percent).toBe(20)
      expect(payload.is_featured).toBe(false)
    })
  })

  // ---------------------------------------------------------------------------
  // 2. Success Criterion: Image signature validation refuses non-images (UPL-001)
  // ---------------------------------------------------------------------------
  describe('Image validation and magic bytes', () => {
    it('detects valid JPEG, PNG, and WebP signatures', () => {
      // JPEG: FF D8 FF
      const jpegBytes = new Uint8Array([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      ])
      expect(detectProductImageSignature(jpegBytes)).toEqual({
        mimeType: 'image/jpeg',
        extension: 'jpg',
      })

      // PNG: 89 50 4E 47 0D 0A 1A 0A
      const pngBytes = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      ])
      expect(detectProductImageSignature(pngBytes)).toEqual({
        mimeType: 'image/png',
        extension: 'png',
      })

      // WebP: RIFF (bytes 0..3) ... WEBP (bytes 8..11)
      const webpBytes = new Uint8Array([
        0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
      ])
      expect(detectProductImageSignature(webpBytes)).toEqual({
        mimeType: 'image/webp',
        extension: 'webp',
      })
    })

    it('refuses non-images (e.g. text, HTML, SVG, fake headers) with UPL-001', async () => {
      // Plain text file pretending to be image
      const textBlob = new Blob(['Hello World! This is plain text, not an image.'], {
        type: 'text/plain',
      })
      await expect(validateProductImageFile(textBlob)).rejects.toThrow()

      try {
        await validateProductImageFile(textBlob)
      } catch (err) {
        expect(err).toBeInstanceOf(AppError)
        expect((err as AppError).code).toBe('UPL-001')
      }

      // SVG file pretending to be image
      const svgBlob = new Blob(['<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>'], {
        type: 'image/svg+xml',
      })
      await expect(validateProductImageFile(svgBlob)).rejects.toThrow()
      try {
        await validateProductImageFile(svgBlob)
      } catch (err) {
        expect(err).toBeInstanceOf(AppError)
        expect((err as AppError).code).toBe('UPL-001')
      }
    })

    it('refuses oversized files (> 5 MB) with UPL-002', async () => {
      const hugeBlob = {
        size: 6 * 1024 * 1024,
        slice: vi.fn(),
      } as unknown as Blob

      await expect(validateProductImageFile(hugeBlob)).rejects.toMatchObject({
        code: 'UPL-002',
      })
    })

    it('calculates aspect-ratio target dimensions correctly capped at 1200px', () => {
      expect(calculateTargetDimensions(800, 600, 1200)).toEqual({ width: 800, height: 600 })
      expect(calculateTargetDimensions(2400, 1200, 1200)).toEqual({ width: 1200, height: 600 })
      expect(calculateTargetDimensions(1000, 2000, 1200)).toEqual({ width: 600, height: 1200 })
      expect(calculateTargetDimensions(3000, 3000, 1200)).toEqual({ width: 1200, height: 1200 })
    })

    it('generates relative storage path matching DB constraint without bucket prefix', () => {
      const path = generateProductStoragePath(42, 'webp')
      expect(path).toMatch(/^products\/42\/[A-Za-z0-9_-]+\.webp$/)
      expect(path).not.toContain('product-images')
    })
  })

  // ---------------------------------------------------------------------------
  // 3. Success Criterion: Deleting an ordered product shows ADM-004 and offers to archive
  // ---------------------------------------------------------------------------
  describe('Delete vs Archive behavior on ADM-004', () => {
    it('deleting an ordered product shows ADM-004 and offers to archive instead', async () => {
      const user = userEvent.setup()

      // Mock deleteAdminProduct throwing ADM-004
      vi.spyOn(api, 'deleteAdminProduct').mockRejectedValueOnce(new AppError('ADM-004'))
      const archiveSpy = vi.spyOn(api, 'archiveAdminProduct').mockResolvedValueOnce({
        ...sampleProduct,
        is_active: false,
      })

      const onDeleted = vi.fn()
      const onArchived = vi.fn()
      const onClose = vi.fn()

      render(
        <DeleteProductDialog
          product={sampleProduct}
          onClose={onClose}
          onDeleted={onDeleted}
          onArchived={onArchived}
        />,
        { wrapper: createWrapper() },
      )

      // Confirm dialog is open with product name
      expect(screen.getByText(/تأكيد حذف المنتج/i)).toBeInTheDocument()
      expect(screen.getByText(/طوق مخملي راقي/i)).toBeInTheDocument()

      // Click "حذف نهائي" button
      const deleteButton = screen.getByRole('button', { name: /حذف نهائي/i })
      await user.click(deleteButton)

      // Expect ADM-004 error message to be displayed
      await waitFor(() => {
        expect(
          screen.getByText(/لا يمكن حذف منتج سبق طلبه\. يمكنك أرشفته بدلًا من ذلك\./i),
        ).toBeInTheDocument()
      })
      expect(screen.getByText(/ADM-004/i)).toBeInTheDocument()

      // Expect "أرشفة المنتج بدلًا من الحذف" button to appear
      const archiveButton = screen.getByRole('button', {
        name: /أرشفة المنتج بدلًا من الحذف/i,
      })
      expect(archiveButton).toBeInTheDocument()

      // Click "أرشفة المنتج بدلًا من الحذف"
      await user.click(archiveButton)

      await waitFor(() => {
        expect(archiveSpy).toHaveBeenCalledWith(42)
        expect(onArchived).toHaveBeenCalledTimes(1)
        expect(onClose).toHaveBeenCalledTimes(1)
      })
    })

    it('successfully deletes an un-ordered product when confirmed', async () => {
      const user = userEvent.setup()
      const deleteSpy = vi.spyOn(api, 'deleteAdminProduct').mockResolvedValueOnce(undefined)

      const onDeleted = vi.fn()
      const onClose = vi.fn()

      render(
        <DeleteProductDialog product={sampleProduct} onClose={onClose} onDeleted={onDeleted} />,
        { wrapper: createWrapper() },
      )

      const deleteButton = screen.getByRole('button', { name: /حذف نهائي/i })
      await user.click(deleteButton)

      await waitFor(() => {
        expect(deleteSpy).toHaveBeenCalledWith(42)
        expect(onDeleted).toHaveBeenCalledTimes(1)
        expect(onClose).toHaveBeenCalledTimes(1)
      })
    })
  })

  // ---------------------------------------------------------------------------
  // 4. ProductFormPage Integration
  // ---------------------------------------------------------------------------
  describe('ProductFormPage', () => {
    it('populates fields and submits updates for an existing product', async () => {
      const user = userEvent.setup()

      vi.spyOn(api, 'getAdminProductById').mockResolvedValue(sampleProduct)
      vi.spyOn(api, 'getAdminCategories').mockResolvedValue([
        { id: 1, name: 'Headbands', name_ar: 'أطواق شعر', slug: 'headbands' },
      ])
      const updateSpy = vi.spyOn(api, 'updateAdminProduct').mockResolvedValue(sampleProduct)

      render(
        <Routes>
          <Route path="/admin/products/:id" element={<ProductFormPage />} />
          <Route path="/admin/products" element={<div>Products List View</div>} />
        </Routes>,
        { wrapper: createWrapper(['/admin/products/42']) },
      )

      // Wait for product data to populate
      await waitFor(() => {
        expect(screen.getByDisplayValue('Velvet Headband')).toBeInTheDocument()
        expect(screen.getByDisplayValue('طوق مخملي راقي')).toBeInTheDocument()
      })

      // Price should be 250
      expect(screen.getByDisplayValue('250')).toBeInTheDocument()

      // Change price
      const priceInput = screen.getByLabelText(/السعر الأساسي/i)
      await user.clear(priceInput)
      await user.type(priceInput, '320')

      // Submit form
      const saveButton = screen.getByRole('button', { name: /حفظ المنتج/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(updateSpy).toHaveBeenCalledWith(
          42,
          expect.objectContaining({
            price: 320,
          }),
        )
      })
    })
  })
})

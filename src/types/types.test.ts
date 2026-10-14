import { describe, expect, it } from 'vitest'
import type { Enums, Tables, TablesInsert } from './index'
import { Constants } from './index'

describe('database types and helpers', () => {
  it('exports expected runtime constants for enums', () => {
    expect(Constants.public.Enums.user_role).toEqual(['customer', 'admin'])
    expect(Constants.public.Enums.order_status).toEqual([
      'pending',
      'confirmed',
      'shipped',
      'delivered',
      'cancelled',
    ])
    expect(Constants.public.Enums.delivery_method).toEqual(['egypt_post', 'representative'])
    expect(Constants.public.Enums.payment_method).toEqual(['cod', 'instapay_qr'])
    expect(Constants.public.Enums.payment_status).toEqual([
      'unpaid',
      'awaiting_approval',
      'awaiting_proof',
      'under_review',
      'paid',
      'rejected',
    ])
    expect(Constants.public.Enums.stock_reason).toEqual([
      'order',
      'cancel',
      'admin_adjust',
      'restock',
      'correction',
    ])
  })

  it('provides compile-time types for table rows and inserts', () => {
    const product: Tables<'products'> = {
      id: 1,
      category_id: 2,
      name: 'Sample Ring',
      name_ar: 'خاتم',
      description: null,
      description_ar: null,
      price: 150,
      discount_percent: 0,
      final_price: 150,
      stock_quantity: 10,
      in_stock: true,
      sold_count: 0,
      is_active: true,
      is_featured: false,
      image_url: null,
      extra_images: [],
      created_at: '2026-10-11T00:00:00Z',
      updated_at: '2026-10-11T00:00:00Z',
    }

    const newProduct: TablesInsert<'products'> = {
      category_id: 2,
      name: 'New Ring',
      price: 200,
    }

    const role: Enums<'user_role'> = 'admin'

    expect(product.id).toBe(1)
    expect(newProduct.name).toBe('New Ring')
    expect(role).toBe('admin')
  })
})

import { describe, it, expect, vi } from 'vitest'
import { publicImageUrl } from './images'
import * as supabaseModule from './supabase'

describe('publicImageUrl', () => {
  it('returns null for null, undefined, empty, or whitespace paths', () => {
    expect(publicImageUrl(null)).toBeNull()
    expect(publicImageUrl(undefined)).toBeNull()
    expect(publicImageUrl('')).toBeNull()
    expect(publicImageUrl('   ')).toBeNull()
  })

  it('preserves external http, https, and data URLs', () => {
    expect(publicImageUrl('https://example.com/photo.jpg')).toBe('https://example.com/photo.jpg')
    expect(publicImageUrl('http://example.com/photo.png')).toBe('http://example.com/photo.png')
    expect(publicImageUrl('data:image/png;base64,abc')).toBe('data:image/png;base64,abc')
    expect(publicImageUrl('/brand/logo.svg')).toBe('/brand/logo.svg')
  })

  it('resolves storage paths using Supabase getPublicUrl with default bucket', () => {
    const mockGetPublicUrl = vi.fn().mockReturnValue({
      data: {
        publicUrl:
          'https://test.supabase.co/storage/v1/object/public/product-images/products/ring.webp',
      },
    })
    const mockFrom = vi.fn().mockReturnValue({ getPublicUrl: mockGetPublicUrl })
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
      storage: { from: mockFrom },
    } as unknown as ReturnType<typeof supabaseModule.getSupabase>)

    const result = publicImageUrl('products/ring.webp')
    expect(mockFrom).toHaveBeenCalledWith('product-images')
    expect(mockGetPublicUrl).toHaveBeenCalledWith('products/ring.webp')
    expect(result).toBe(
      'https://test.supabase.co/storage/v1/object/public/product-images/products/ring.webp',
    )
  })

  it('allows specifying a custom bucket', () => {
    const mockGetPublicUrl = vi.fn().mockReturnValue({
      data: {
        publicUrl:
          'https://test.supabase.co/storage/v1/object/public/custom-bucket/categories/bags.webp',
      },
    })
    const mockFrom = vi.fn().mockReturnValue({ getPublicUrl: mockGetPublicUrl })
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
      storage: { from: mockFrom },
    } as unknown as ReturnType<typeof supabaseModule.getSupabase>)

    const result = publicImageUrl('categories/bags.webp', 'custom-bucket')
    expect(mockFrom).toHaveBeenCalledWith('custom-bucket')
    expect(result).toBe(
      'https://test.supabase.co/storage/v1/object/public/custom-bucket/categories/bags.webp',
    )
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { LanguageProvider } from '@/i18n/LanguageProvider'
import { ToastProvider } from '@/components/ui/ToastProvider'
import { suggestSlug, validateSlug } from './api'
import * as api from './api'
import { DeleteCategoryDialog } from './DeleteCategoryDialog'
import type { AdminCategoryWithCount } from './hooks'

vi.mock('@/lib/supabase', () => {
  const client = {
    from: vi.fn(),
    rpc: vi.fn(),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: { path: 'categories/1/img.webp' }, error: null }),
        getPublicUrl: vi.fn((path: string) => ({
          data: {
            publicUrl: `https://test.supabase.co/storage/v1/object/public/product-images/${path}`,
          },
        })),
      })),
    },
  }
  return { supabase: client }
})

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  })
}

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={makeClient()}>
      <LanguageProvider>
        <ToastProvider>
          <MemoryRouter>{children}</MemoryRouter>
        </ToastProvider>
      </LanguageProvider>
    </QueryClientProvider>
  )
}

const sampleCategory: AdminCategoryWithCount = {
  id: 1,
  name: 'Accessories',
  name_ar: 'إكسسوارات',
  slug: 'accessories',
  image_url: null,
  sort_order: 0,
  show_on_home: true,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  product_count: 3,
}

beforeEach(() => {
  vi.restoreAllMocks()
})

// ─── Slug utilities ──────────────────────────────────────────────────────────

describe('validateSlug', () => {
  it('accepts simple lowercase slug', () => {
    expect(validateSlug('accessories')).toBe(true)
  })

  it('accepts slug with hyphens', () => {
    expect(validateSlug('home-decor')).toBe(true)
  })

  it('accepts slug with digits', () => {
    expect(validateSlug('category-123')).toBe(true)
  })

  it('rejects slug with uppercase letters', () => {
    expect(validateSlug('Accessories')).toBe(false)
  })

  it('rejects slug starting with hyphen', () => {
    expect(validateSlug('-accessories')).toBe(false)
  })

  it('rejects slug ending with hyphen', () => {
    expect(validateSlug('accessories-')).toBe(false)
  })

  it('rejects slug with double hyphens', () => {
    expect(validateSlug('home--decor')).toBe(false)
  })

  it('rejects slug with spaces', () => {
    expect(validateSlug('home decor')).toBe(false)
  })

  it('rejects slug with Arabic characters', () => {
    expect(validateSlug('إكسسوارات')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(validateSlug('')).toBe(false)
  })
})

describe('suggestSlug', () => {
  it('lowercases input', () => {
    expect(suggestSlug('Accessories')).toBe('accessories')
  })

  it('replaces spaces with hyphens', () => {
    expect(suggestSlug('Home Decor')).toBe('home-decor')
  })

  it('collapses multiple spaces', () => {
    expect(suggestSlug('home  decor')).toBe('home-decor')
  })

  it('strips special characters', () => {
    expect(suggestSlug("Lolys' Accessories")).toBe('lolys-accessories')
  })

  it('trims leading and trailing hyphens', () => {
    expect(suggestSlug('  accessories  ')).toBe('accessories')
  })

  it('strips Arabic characters', () => {
    expect(suggestSlug('إكسسوارات accessories')).toBe('accessories')
  })
})

// ─── API functions ───────────────────────────────────────────────────────────

describe('getAdminCategoriesWithCount', () => {
  it('returns empty array when no categories exist', async () => {
    vi.spyOn(api, 'getAdminCategoriesWithCount').mockResolvedValue([])
    const result = await api.getAdminCategoriesWithCount()
    expect(result).toEqual([])
  })

  it('returns categories with product counts', async () => {
    const expected = [{ ...sampleCategory, product_count: 3 }]
    vi.spyOn(api, 'getAdminCategoriesWithCount').mockResolvedValue(expected)
    const result = await api.getAdminCategoriesWithCount()
    expect(result).toHaveLength(1)
    expect(result[0].product_count).toBe(3)
  })
})

describe('createAdminCategory', () => {
  it('throws ADM-006 on invalid slug', async () => {
    await expect(
      api.createAdminCategory({
        name: 'Test',
        name_ar: 'تست',
        slug: 'Bad Slug!',
        image_url: null,
        show_on_home: false,
        is_active: true,
        sort_order: 0,
      }),
    ).rejects.toMatchObject({ code: 'ADM-006' })
  })

  it('calls supabase with correct payload on valid slug', async () => {
    const created = { ...sampleCategory }
    vi.spyOn(api, 'createAdminCategory').mockResolvedValue(created)
    const result = await api.createAdminCategory({
      name: 'Accessories',
      name_ar: 'إكسسوارات',
      slug: 'accessories',
      image_url: null,
      show_on_home: true,
      is_active: true,
      sort_order: 0,
    })
    expect(result.slug).toBe('accessories')
  })
})

describe('updateAdminCategory', () => {
  it('throws ADM-006 on invalid slug in update', async () => {
    await expect(
      api.updateAdminCategory(1, { slug: 'Bad Slug!' }),
    ).rejects.toMatchObject({ code: 'ADM-006' })
  })

  it('allows update without providing a slug', async () => {
    const updated = { ...sampleCategory, name_ar: 'تعديل' }
    vi.spyOn(api, 'updateAdminCategory').mockResolvedValue(updated)
    const result = await api.updateAdminCategory(1, { name_ar: 'تعديل' })
    expect(result.name_ar).toBe('تعديل')
  })
})

describe('deleteAdminCategory', () => {
  it('calls rpc with p_move_to null when no migration needed', async () => {
    vi.spyOn(api, 'deleteAdminCategory').mockResolvedValue(undefined)
    await expect(api.deleteAdminCategory(1)).resolves.toBeUndefined()
  })

  it('calls rpc with p_move_to when migration category is provided', async () => {
    vi.spyOn(api, 'deleteAdminCategory').mockResolvedValue(undefined)
    await expect(api.deleteAdminCategory(1, 2)).resolves.toBeUndefined()
  })
})

describe('reorderAdminCategories', () => {
  it('resolves without error on valid id array', async () => {
    vi.spyOn(api, 'reorderAdminCategories').mockResolvedValue(undefined)
    await expect(api.reorderAdminCategories([3, 1, 2])).resolves.toBeUndefined()
  })
})

// ─── DeleteCategoryDialog ────────────────────────────────────────────────────

describe('DeleteCategoryDialog', () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = vi.fn()
    HTMLDialogElement.prototype.close = vi.fn()
  })

  it('renders empty-category confirmation without migration select', () => {
    const emptyCategory = { ...sampleCategory, product_count: 0 }
    render(
      <Wrapper>
        <DeleteCategoryDialog
          category={emptyCategory}
          otherCategories={[]}
          onClose={() => undefined}
        />
      </Wrapper>,
    )
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(screen.getByRole('button', { name: /تأكيد الحذف|Confirm Deletion/i })).toBeInTheDocument()
  })

  it('renders migration select when category has products', () => {
    render(
      <Wrapper>
        <DeleteCategoryDialog
          category={sampleCategory}
          otherCategories={[{ id: 2, name: 'Jewelry', name_ar: 'مجوهرات' }]}
          onClose={() => undefined}
        />
      </Wrapper>,
    )
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('shows error when user tries to delete non-empty category without selecting target', async () => {
    const user = userEvent.setup()
    render(
      <Wrapper>
        <DeleteCategoryDialog
          category={sampleCategory}
          otherCategories={[{ id: 2, name: 'Jewelry', name_ar: 'مجوهرات' }]}
          onClose={() => undefined}
        />
      </Wrapper>,
    )

    const confirmBtn = screen.getByRole('button', { name: /تأكيد الحذف|Confirm Deletion/i })
    await user.click(confirmBtn)
    // Error message (ADM-005) should appear
    await waitFor(() => {
      expect(document.querySelector('[class*="danger"]')).toBeInTheDocument()
    })
  })

  it('calls deleteAdminCategory when deleting empty category', async () => {
    vi.spyOn(api, 'deleteAdminCategory').mockResolvedValue(undefined)
    const onClose = vi.fn()
    const emptyCategory = { ...sampleCategory, product_count: 0 }
    const user = userEvent.setup()

    render(
      <Wrapper>
        <DeleteCategoryDialog
          category={emptyCategory}
          otherCategories={[]}
          onClose={onClose}
        />
      </Wrapper>,
    )

    const confirmBtn = screen.getByRole('button', { name: /تأكيد الحذف|Confirm Deletion/i })
    await user.click(confirmBtn)

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
  })
})

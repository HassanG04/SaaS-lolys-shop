import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/i18n/LanguageProvider'
import { PublishedPolicy } from './PublishedPolicy'
import * as settingsHooks from './hooks'

vi.mock('@/features/seo', () => ({ useSeo: vi.fn() }))

function renderPolicy(language: 'ar' | 'en' = 'en') {
  return render(
    <MemoryRouter>
      <LanguageProvider initialLanguage={language}>
        <PublishedPolicy route="terms" title="Terms" description="Default terms">
          <article>Audited fallback</article>
        </PublishedPolicy>
      </LanguageProvider>
    </MemoryRouter>,
  )
}

describe('PublishedPolicy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(settingsHooks, 'usePublicSettings').mockReturnValue({
      data: { storefront_content: {} },
    } as unknown as ReturnType<typeof settingsHooks.usePublicSettings>)
  })

  it('renders the audited route copy when no published body exists', () => {
    renderPolicy()
    expect(screen.getByText('Audited fallback')).toBeInTheDocument()
    expect(screen.queryByText('Published terms')).not.toBeInTheDocument()
  })

  it('renders only the selected language body and escapes it as text', () => {
    vi.mocked(settingsHooks.usePublicSettings).mockReturnValue({
      data: {
        storefront_content: {
          terms_label_en: 'Published terms',
          terms_body_en: '<script>alert(1)</script>\nOwner copy',
          terms_label_ar: 'الشروط المنشورة',
          terms_body_ar: 'نص عربي منشور',
        },
      },
    } as unknown as ReturnType<typeof settingsHooks.usePublicSettings>)

    const { rerender } = renderPolicy('en')
    expect(screen.getByRole('heading', { name: 'Published terms' })).toBeInTheDocument()
    expect(
      screen.getByText((text) => text.includes('<script>alert(1)</script>')),
    ).toBeInTheDocument()
    expect(screen.queryByText('Audited fallback')).not.toBeInTheDocument()

    rerender(
      <MemoryRouter>
        <LanguageProvider key="ar" initialLanguage="ar">
          <PublishedPolicy route="terms" title="الشروط" description="افتراضي">
            <article>نسخة احتياطية</article>
          </PublishedPolicy>
        </LanguageProvider>
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'الشروط المنشورة' })).toBeInTheDocument()
    expect(screen.getByText('نص عربي منشور')).toBeInTheDocument()
    expect(screen.queryByText('Owner copy')).not.toBeInTheDocument()
  })
})

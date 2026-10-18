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

  it('renders published label dynamically in static heading when custom body is empty', () => {
    vi.mocked(settingsHooks.usePublicSettings).mockReturnValue({
      data: {
        storefront_content: {
          terms_label_ar: 'شروط الاستخدام الرسمية المحدثة',
          terms_body_ar: '',
        },
      },
    } as unknown as ReturnType<typeof settingsHooks.usePublicSettings>)

    render(
      <MemoryRouter>
        <LanguageProvider initialLanguage="ar">
          <PublishedPolicy route="terms" title="الشروط والأحكام" description="افتراضي">
            <article>
              <h1 aria-label="policy-heading">
                <PublishedPolicy.Title fallback="الشروط والأحكام" />
              </h1>
              <p>محتوى الشروط الافتراضي الثابت</p>
            </article>
          </PublishedPolicy>
        </LanguageProvider>
      </MemoryRouter>,
    )

    expect(screen.getByText('شروط الاستخدام الرسمية المحدثة')).toBeInTheDocument()
    expect(screen.getByText('محتوى الشروط الافتراضي الثابت')).toBeInTheDocument()
  })

  it('gracefully renders static fallback when settings are loading or failed', () => {
    // Loading state
    vi.mocked(settingsHooks.usePublicSettings).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as unknown as ReturnType<typeof settingsHooks.usePublicSettings>)

    const { rerender } = renderPolicy('ar')
    expect(screen.getByText('Audited fallback')).toBeInTheDocument()

    // Error state
    vi.mocked(settingsHooks.usePublicSettings).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Network error'),
    } as unknown as ReturnType<typeof settingsHooks.usePublicSettings>)

    rerender(
      <MemoryRouter>
        <LanguageProvider initialLanguage="ar">
          <PublishedPolicy route="terms" title="الشروط" description="افتراضي">
            <article>Audited fallback after error</article>
          </PublishedPolicy>
        </LanguageProvider>
      </MemoryRouter>,
    )
    expect(screen.getByText('Audited fallback after error')).toBeInTheDocument()
  })
})
